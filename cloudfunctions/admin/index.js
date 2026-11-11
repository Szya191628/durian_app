// 云函数入口文件 - admin
// 店铺管理端的唯一写入通道。所有管理动作在此校验 users.role === 'admin'。
// 前端隐藏入口不能替代服务端校验，因此管理端不再从客户端直连数据库写入。
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const PAGE_SIZE = 12
// 允许通过本云函数访问的集合白名单，避免任意集合读写
const COLLECTIONS = ['products', 'orders', 'users', 'transactions']

function fail(message) {
  return { code: -1, message }
}

// 服务端身份校验：必须存在用户记录且 role 为 admin
async function requireAdmin() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    const err = new Error('无法识别用户身份，请重新进入小程序')
    err.status = 401
    throw err
  }
  const res = await db.collection('users').where({ _openid: OPENID }).limit(1).get()
  const user = res.data[0]
  if (!user) {
    const err = new Error('账号信息未建立，请先登录')
    err.status = 401
    throw err
  }
  if (user.role !== 'admin') {
    const err = new Error('此操作仅限店铺管理员')
    err.status = 403
    throw err
  }
  return { user, openid: OPENID }
}

function ensureCollection(name) {
  if (!COLLECTIONS.includes(name)) {
    const err = new Error('不支持的数据集合')
    err.status = 400
    throw err
  }
  return name
}

// 商品字段白名单，避免客户端写入 sales/createdAt 等受控字段
function pickProduct(value) {
  const source = value || {}
  const patch = {}
  const text = ['name', 'unit', 'spec', 'description', 'category', 'categoryName']
  const number = ['price', 'originalPrice', 'stock', 'sort', 'status']
  text.forEach(key => {
    if (source[key] !== undefined) patch[key] = String(source[key]).trim()
  })
  number.forEach(key => {
    if (source[key] === undefined) return
    const n = Number(source[key])
    if (Number.isFinite(n)) patch[key] = n
  })
  if (Array.isArray(source.images)) patch.images = source.images.map(item => String(item)).slice(0, 6)
  if (patch.name === '') throw new Error('商品名称不能为空')
  if (patch.price !== undefined && patch.price < 0) throw new Error('商品价格不能为负数')
  if (patch.stock !== undefined && patch.stock < 0) throw new Error('商品库存不能为负数')
  return patch
}

const actions = {
  // 管理端列表：商品按上下架筛选，订单按状态筛选
  async list(event) {
    const name = ensureCollection(event.collection)
    const size = Math.min(50, Math.max(1, parseInt(event.pageSize, 10) || PAGE_SIZE))
    const current = Math.max(1, parseInt(event.page, 10) || 1)
    const where = {}
    if (event.status !== undefined && event.status !== 'all' && event.status !== '') where.status = event.status
    const query = db.collection(name).where(where)
    const res = await Promise.all([
      query.orderBy('createdAt', 'desc').skip((current - 1) * size).limit(size).get(),
      query.count()
    ])
    return { code: 0, data: res[0].data, total: res[1].total, page: current, pageSize: size }
  },

  async detail(event) {
    ensureCollection(event.collection)
    if (!event.id) return fail('缺少记录编号')
    const res = await db.collection(event.collection).doc(event.id).get()
    if (!res.data) return fail('记录不存在')
    return { code: 0, data: res.data }
  },

  async saveProduct(event) {
    const patch = pickProduct(event.value)
    if (event.id) {
      await db.collection('products').doc(event.id).update({ data: patch })
      return { code: 0, id: event.id, message: '商品已保存' }
    }
    const res = await db.collection('products').add({
      data: { ...patch, sales: 0, createdAt: db.serverDate() }
    })
    return { code: 0, id: res._id, message: '商品已创建' }
  },

  async toggleProduct(event) {
    if (!event.id) return fail('缺少商品编号')
    const next = Number(event.status) === 1 ? 1 : 0
    await db.collection('products').doc(event.id).update({ data: { status: next } })
    return { code: 0, status: next }
  },

  async removeProduct(event) {
    if (!event.id) return fail('缺少商品编号')
    await db.collection('products').doc(event.id).remove()
    return { code: 0, message: '商品已删除' }
  },

  // 订单流转：confirmPay 为线下收款确认，是本次新增的关键动作
  async updateOrder(event, ctx) {
    if (!event.id) return fail('缺少订单编号')
    const res = await db.collection('orders').doc(event.id).get()
    const order = res.data
    if (!order) return fail('订单不存在')

    const now = db.serverDate()
    const action = event.action
    const trackingNo = String(event.trackingNo || '').trim()

    if (action === 'confirmPay') {
      if (order.status !== 'pending') return fail('该订单当前不处于待收款状态，请刷新后重试')
      await db.collection('orders').doc(event.id).update({
        data: { status: 'paid', paidAt: now, paidBy: 'admin:' + ctx.openid }
      })
      return { code: 0, status: 'paid', message: '已确认收款' }
    }

    if (action === 'ship') {
      if (order.status !== 'paid') return fail('仅已收款的订单可以发货')
      if (!trackingNo) return fail('请输入快递单号')
      await db.collection('orders').doc(event.id).update({
        data: { status: 'shipped', shippedAt: now, trackingNo }
      })
      return { code: 0, status: 'shipped' }
    }

    if (action === 'tracking') {
      if (order.status !== 'shipped') return fail('仅已发货的订单可以修改物流')
      if (!trackingNo) return fail('请输入快递单号')
      await db.collection('orders').doc(event.id).update({ data: { trackingNo } })
      return { code: 0, message: '物流信息已更新' }
    }

    if (action === 'complete') {
      if (order.status !== 'shipped') return fail('仅已发货的订单可以完成')
      await db.collection('orders').doc(event.id).update({
        data: { status: 'completed', completedAt: now }
      })
      return { code: 0, status: 'completed' }
    }

    if (action === 'cancel') {
      if (order.status !== 'pending') return fail('仅待收款的订单可以取消')
      // 取消未收款订单需回滚库存，避免长期占用
      const items = order.items || []
      for (let i = 0; i < items.length; i++) {
        await db.collection('products').doc(items[i].productId).update({
          data: { stock: _.inc(items[i].quantity), sales: _.inc(-items[i].quantity) }
        })
      }
      await db.collection('orders').doc(event.id).update({
        data: { status: 'cancelled', cancelledAt: now }
      })
      return { code: 0, status: 'cancelled' }
    }

    return fail('不支持的订单操作')
  },

  // 商家手动充值：余额的唯一新增入口，用户侧已无自助充值
  async rechargeUser(event, ctx) {
    const target = String(event.userId || '').trim()
    if (!target) return fail('请先选择要充值的用户')
    const value = Number(event.amount)
    if (!Number.isFinite(value) || value <= 0) return fail('充值金额必须大于 0')
    if (value > 50000) return fail('单次充值金额过大，请核对后再试')

    const userRes = await db.collection('users').doc(target).get().catch(() => ({ data: null }))
    if (!userRes.data) return fail('用户不存在')

    await db.collection('users').doc(target).update({
      data: { balance: _.inc(value), points: _.inc(Math.floor(value)) }
    })

    // 流水写入失败不阻断主流程，在返回中标注
    let logged = true
    try {
      await db.collection('transactions').add({
        data: {
          _openid: userRes.data._openid || '',
          userId: target,
          type: 'manual_recharge',
          amount: value,
          operator: ctx.openid,
          description: String(event.note || '').trim() || '店铺手动充值',
          createdAt: db.serverDate()
        }
      })
    } catch (err) {
      logged = false
      console.warn('transaction log failed:', err)
    }

    return {
      code: 0,
      balance: (userRes.data.balance || 0) + value,
      logged,
      message: logged ? '充值已入账' : '余额已入账，但流水记录失败'
    }
  },

  // 按昵称或手机号定位用户，供充值使用
  async findUser(event) {
    const text = String(event.keyword || '').trim()
    if (!text) return { code: 0, data: [] }
    const reg = db.RegExp({ regexp: text, options: 'i' })
    const res = await db.collection('users')
      .where(_.or([{ nickName: reg }, { phone: reg }]))
      .limit(10)
      .get()
    return {
      code: 0,
      data: res.data.map(item => ({
        _id: item._id,
        nickName: item.nickName || '',
        phone: item.phone || '',
        balance: item.balance || 0
      }))
    }
  },

  // 经营概览：订单、待收款、待发货、在售商品、用户数
  async stats() {
    const orders = db.collection('orders')
    const values = await Promise.all([
      orders.count(),
      orders.where({ status: 'pending' }).count(),
      orders.where({ status: 'paid' }).count(),
      db.collection('products').where({ status: 1 }).count(),
      db.collection('users').count()
    ])
    return {
      code: 0,
      data: {
        orders: values[0].total,
        pendingPayment: values[1].total,
        toShip: values[2].total,
        products: values[3].total,
        users: values[4].total
      }
    }
  },

  // 当前账号是否为管理员，供前端决定是否显示工作台入口
  async me(event, ctx) {
    return { code: 0, data: { openid: ctx.openid, role: ctx.user.role } }
  }
}

exports.main = async (event) => {
  const payload = event || {}
  const action = payload.action
  if (!action || !actions[action]) return fail('未知操作')
  try {
    const ctx = await requireAdmin()
    return await actions[action](payload, ctx)
  } catch (err) {
    console.error('admin error:', action, err)
    return { code: -1, message: err.message || '操作失败，请稍后重试' }
  }
}
