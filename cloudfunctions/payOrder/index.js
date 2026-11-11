// 云函数入口文件 - payOrder
// 云开发生云支付统一下单。返回前端 wx.requestPayment 所需的 payment 参数。
// 前置条件：云开发控制台已把商户号绑定到本环境，否则 unifiedOrder 会报商户号无效。
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 商户号与回调环境。更换商户号时只改这两行。
const SUB_MCH_ID = '1003362618'
const ENV_ID = process.env.TCB_ENV || 'cloud1-d6gq39ybze5c57eb6'
const CALLBACK_FUNCTION = 'payCallback'

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const orderId = event && event.orderId
  if (!orderId) return { code: -1, message: '缺少订单信息' }

  let order = null
  try {
    const res = await db.collection('orders').doc(orderId).get()
    order = res.data
  } catch (err) {
    order = null
  }
  if (!order) return { code: -1, message: '订单不存在' }
  if (order._openid !== OPENID) return { code: -1, message: '无权支付该订单' }
  if (order.status !== 'pending') return { code: -1, message: '订单状态已变化，请刷新后重试' }

  // 云支付金额单位为分，订单金额为元
  const totalFee = Math.round(Number(order.totalAmount) * 100)
  if (!Number.isFinite(totalFee) || totalFee <= 0) return { code: -1, message: '订单金额异常' }

  try {
    const result = await cloud.cloudPay.unifiedOrder({
      body: '榴夏来榴莲生鲜-榴莲及鲜果',
      outTradeNo: order.orderNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: SUB_MCH_ID,
      totalFee,
      envId: ENV_ID,
      functionName: CALLBACK_FUNCTION,
      nonceStr: String(Date.now()) + Math.random().toString(36).slice(2, 10)
    })

    if (!result || !result.payment) {
      console.error('unifiedOrder failed:', result)
      return { code: -1, message: (result && result.returnMsg) || '发起支付失败，请稍后重试' }
    }
    return { code: 0, payment: result.payment, orderNo: order.orderNo }
  } catch (err) {
    console.error('payOrder error:', err)
    return { code: -1, message: '发起支付失败，请稍后重试' }
  }
}
