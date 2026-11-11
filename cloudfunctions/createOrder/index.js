// 云函数入口文件 - createOrder
// [FIXED] 使用事务确保原子性，服务端校验价格/库存/余额
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return 'DL' + year + month + day + hour + minute + second + random
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { items, address, remark, payType } = event

  // === 输入校验 ===
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { code: -1, message: '订单商品不能为空' }
  }
  if (!address || !address.name || !address.phone || !address.detail) {
    return { code: -1, message: '收货地址信息不完整' }
  }

  // 校验支付方式：offline 线下确认收款、wxpay 微信支付、balance 会员余额
  // 不再接受 mock，避免任何人直接调云函数产生无支付订单
  const validPayTypes = ['offline', 'wxpay', 'balance']
  if (payType && !validPayTypes.includes(payType)) {
    return { code: -1, message: '不支持的支付方式' }
  }

  // 校验每个商品项
  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      return { code: -1, message: '商品ID无效' }
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { code: -1, message: '商品数量必须为正整数' }
    }
  }

  try {
    // === 使用事务确保原子性 ===
    const result = await db.runTransaction(async (transaction) => {
      const productsCol = transaction.collection('products')
      const usersCol = transaction.collection('users')
      const ordersCol = transaction.collection('orders')

      // 1. 服务端获取真实价格并校验库存
      const orderItems = []
      let totalAmount = 0

      for (const item of items) {
        const productRes = await productsCol.doc(item.productId).get()
        const product = productRes.data

        if (!product) {
          await transaction.rollback('商品不存在: ' + item.productId)
          return
        }
        if (product.status !== 1) {
          await transaction.rollback('商品已下架: ' + product.name)
          return
        }
        if (product.stock < item.quantity) {
          await transaction.rollback(product.name + ' 库存不足，当前库存: ' + product.stock)
          return
        }

        // 使用服务端价格，忽略客户端传入的价格
        const amount = product.price * item.quantity
        totalAmount += amount

        orderItems.push({
          productId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          spec: product.spec || '',
          image: product.images && product.images.length > 0 ? product.images[0] : '',
          amount: amount
        })
      }

      // 2. 扣减库存（事务内）
      for (const item of items) {
        await productsCol.doc(item.productId).update({
          data: {
            stock: _.inc(-item.quantity),
            sales: _.inc(item.quantity)
          }
        })
      }

      // 3. 余额支付：校验并扣减余额（原子操作）
      if (payType === 'balance') {
        const userRes = await usersCol.where({ _openid: openid }).get()
        if (userRes.data.length === 0) {
          await transaction.rollback('用户不存在')
          return
        }
        const user = userRes.data[0]
        if (user.balance < totalAmount) {
          await transaction.rollback('余额不足，当前余额: ' + user.balance)
          return
        }
        await usersCol.doc(user._id).update({
          data: { balance: _.inc(-totalAmount) }
        })
      }

      // 4. 创建订单
      const orderData = {
        _openid: openid,
        orderNo: generateOrderNo(),
        items: orderItems,
        totalAmount: totalAmount,
        payAmount: totalAmount,
        status: payType === 'balance' ? 'paid' : 'pending',
        address: {
          name: address.name,
          phone: address.phone,
          province: address.province || '',
          city: address.city || '',
          district: address.district || '',
          detail: address.detail
        },
        remark: remark || '',
        createdAt: db.serverDate(),
        paidAt: payType === 'balance' ? db.serverDate() : null,
        shippedAt: null,
        completedAt: null,
        trackingNo: '',
        payType: payType || 'offline'
      }

      const orderRes = await ordersCol.add({ data: orderData })

      return {
        orderId: orderRes._id,
        orderNo: orderData.orderNo,
        totalAmount: totalAmount
      }
    })

    return {
      code: 0,
      orderId: result.orderId,
      orderNo: result.orderNo,
      message: '下单成功'
    }
  } catch (err) {
    console.error('createOrder error:', err)
    // 事务回滚消息
    if (err.message && err.message.includes('rollback')) {
      return { code: -1, message: err.message.replace('rollback: ', '') }
    }
    return { code: -1, message: '下单失败，请稍后重试' }
  }
}
