// 云函数入口文件 - payCallback
// 微信支付结果回调。必须返回 { errcode: 0 } 表示已正确接收，否则微信会重复推送。
// 只做落账：校验商户号、金额、幂等，然后置为已收款。
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const SUB_MCH_ID = '1003362618'

exports.main = async (event) => {
  const payload = event || {}
  const outTradeNo = payload.outTradeNo

  // 缺少单号直接忽略，返回 0 避免微信反复重推
  if (!outTradeNo) {
    console.warn('payCallback without outTradeNo')
    return { errcode: 0, errmsg: 'ignored' }
  }

  // 支付未成功时不落账
  if (payload.returnCode !== 'SUCCESS' || payload.resultCode !== 'SUCCESS') {
    return { errcode: 0, errmsg: 'ignored' }
  }

  // 商户号不符视为异常流量，不落账
  if (payload.subMchId && String(payload.subMchId) !== SUB_MCH_ID) {
    console.warn('payCallback mch mismatch:', payload.subMchId)
    return { errcode: 0, errmsg: 'ignored' }
  }

  try {
    const res = await db.collection('orders').where({ orderNo: outTradeNo }).limit(1).get()
    const order = res.data[0]
    if (!order) {
      console.warn('payCallback order not found:', outTradeNo)
      return { errcode: 0, errmsg: 'order not found' }
    }

    // 幂等：已处理过的订单不再重复写入
    if (order.status !== 'pending') {
      return { errcode: 0, errmsg: 'already processed' }
    }

    // 金额必须与订单一致，单位分
    const paidFee = Number(payload.totalFee)
    const expected = Math.round(Number(order.totalAmount) * 100)
    if (!Number.isFinite(paidFee) || paidFee !== expected) {
      console.error('payCallback amount mismatch:', outTradeNo, paidFee, expected)
      return { errcode: 0, errmsg: 'amount mismatch' }
    }

    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'paid',
        paidAt: db.serverDate(),
        paidBy: 'wxpay',
        payType: 'wxpay',
        transactionId: payload.transactionId || '',
        paidFee
      }
    })

    return { errcode: 0, errmsg: 'ok' }
  } catch (err) {
    console.error('payCallback error:', err)
    // 返回非 0 让微信重试，避免丢单
    return { errcode: -1, errmsg: 'retry later' }
  }
}
