module.exports = {
  cloudEnv: 'cloud1-d6gq39ybze5c57eb6',
  // 支付模式：
  // offline —— 线下确认收款（下单后由店铺在管理端确认到账）
  // wxpay   —— 微信支付（需先在云开发控制台把商户号 1003362618 绑定到本环境）
  // 切换步骤：云开发控制台绑定成功后，把 payMode 改为 'wxpay'，并把 wxpay.enabled 改为 true
  payMode: 'offline',
  wxpay: {
    enabled: false,
    subMchId: '1003362618',                        // 芸南榴莲来鲜果店（个体工商户）
    callbackFunction: 'payCallback'                // 支付结果回调云函数
  },
  // 店铺客服电话，提审前务必填写；留空时仅保留微信客服会话入口
  supportPhone: '',
  // 已废弃：支付不再接受模拟路径，保留字段仅为兼容旧引用
  enableTestPayments: false,
  requestTimeout: 15000,
  pageSize: 12
}
