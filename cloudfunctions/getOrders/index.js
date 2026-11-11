// 云函数入口文件 - getOrders
// [FIXED] 分页参数校验 + where() 覆盖 bug
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { status } = event

  // [FIXED] 分页参数校验
  const page = Math.max(1, parseInt(event.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(event.pageSize) || 20))

  try {
    // [FIXED] 构建单一 where 条件
    const whereCondition = { _openid: openid }
    if (status && status !== 'all') {
      whereCondition.status = status
    }

    const query = db.collection('orders').where(whereCondition)

    const skip = (page - 1) * pageSize
    const res = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    const countRes = await query.count()

    return {
      code: 0,
      data: res.data,
      total: countRes.total,
      page: page,
      pageSize: pageSize
    }
  } catch (err) {
    console.error('getOrders error:', err)
    return {
      code: -1,
      message: '获取订单失败'
    }
  }
}
