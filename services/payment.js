// 支付适配层：业务代码只与本模块交互。
// 当前走 offline（线下确认收款）；将来商户号在云开发绑定完成，把 config.payMode 改为 'wxpay'
// 并填写 subMchId，即可切换到微信支付，页面与订单逻辑无需改动。
const config = require('../config/index')
const { call } = require('./client')

const OFFLINE = 'offline'
const WXPAY = 'wxpay'
const BALANCE = 'balance'

function wxpayReady() {
  const pay = config.wxpay || {}
  return config.payMode === WXPAY && pay.enabled === true && !!pay.subMchId
}

function mode() {
  return wxpayReady() ? WXPAY : OFFLINE
}

// 可选支付方式。余额只在用户确有余额时出现。
function options(hasBalance) {
  const list = []
  if (wxpayReady()) list.push({ value: WXPAY, label: '微信支付', note: '下单后立即完成付款', icon: 'check' })
  list.push({ value: OFFLINE, label: '线下付款', note: '下单后由店铺确认收款', icon: 'wallet' })
  if (hasBalance) list.push({ value: BALANCE, label: '会员余额', note: '使用账户余额抵扣', icon: 'wallet' })
  return list
}

function label(value) {
  const found = { [WXPAY]: '微信支付', [OFFLINE]: '线下付款', [BALANCE]: '会员余额' }
  return found[value] || '线下付款'
}

// 订单创建后的支付动作。offline 与 balance 无需再调起任何支付，
// 其状态由 createOrder 的结果直接体现（pending / paid）。
async function pay(order) {
  const type = (order && order.payType) || mode()
  if (type !== WXPAY) return { mode: type, paid: type === BALANCE }
  if (!wxpayReady()) throw new Error('微信支付尚未开通，请选择线下付款')
  const res = await call('payOrder', { orderId: order.orderId }, true)
  const params = res.payment
  if (!params) throw new Error('支付参数缺失，请稍后重试')
  await new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType || 'MD5',
      paySign: params.paySign,
      success: resolve,
      fail(err) { reject(new Error(/cancel/i.test((err && err.errMsg) || '') ? '已取消支付' : '支付未完成，请重试')) }
    })
  })
  return { mode: WXPAY, paid: true }
}

module.exports = { OFFLINE, WXPAY, BALANCE, mode, wxpayReady, options, label, pay }
