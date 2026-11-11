const orders = require('../services/orders')
const adminService = require('../services/admin')
const payment = require('../services/payment')
const { define, confirm, toast } = require('./page')
const payTypeText = { balance: '会员余额', offline: '线下付款', wxpay: '微信支付', mock: '测试支付' }
module.exports = function(admin = false) {
  return define({
    data:{order:null,admin,trackingNo:'',copied:false,steps:[],statusDescription:'',payTypeText:''},
    onLoad(options) { this.id=options.id; this.refresh() },
    refresh() { return this.load(async()=>{ const order=admin?await adminService.detail('orders',this.id):await orders.detail(this.id); const index=['pending','paid','shipped','completed'].indexOf(order.status); return {order,trackingNo:order.trackingNo||'',payTypeText:payTypeText[order.payType]||'线下付款',steps:['订单提交','确认收款','店铺发货','确认收货'].map((label,i)=>({label,done:i<=index})),statusDescription:{pending:'订单已创建，等待店铺确认收款',paid:'款项已确认，店铺正在准备这份美味',shipped:'商品已发出，请留意物流信息',completed:'谢谢你，把这份美味带回家',cancelled:'此订单已取消'}[order.status]||'订单状态更新中'} }) },
    copy() { wx.setClipboardData({data:this.data.order.orderNo,success:()=>this.safe({copied:true})}) },
    tracking(e) { this.safe({trackingNo:e.detail.value}) },
    copyTracking() { if(this.data.order.trackingNo) wx.setClipboardData({data:this.data.order.trackingNo}) },
    receive() { return this.action(async()=>{ if(!await confirm('确认收货','请确认已经收到商品，再完成此订单。')) return; if(admin) await adminService.updateOrder(this.id,'complete',this.data.trackingNo); else await orders.receive(this.id); toast('已确认收货',true); await this.refresh() }) },
    ship() { return this.action(async()=>{ if(!this.data.trackingNo.trim()) return toast('请输入快递单号'); if(!await confirm('确认发货','快递单号：'+this.data.trackingNo.trim())) return; await adminService.updateOrder(this.id,'ship',this.data.trackingNo); toast('发货成功',true); await this.refresh() }) },
    saveTracking() { return this.action(async()=>{ await adminService.updateOrder(this.id,'tracking',this.data.trackingNo); toast('物流信息已更新',true); await this.refresh() }) },
    confirmPay() { return this.action(async()=>{const amount=this.data.order.amountText; if(!await confirm('确认收款','请先核对实际到账 ¥'+amount+'，确认后订单将进入待发货。')) return; await adminService.confirmPay(this.id); toast('已确认收款',true); await this.refresh() }) },
    cancelOrder() { return this.action(async()=>{ if(!await confirm('取消订单','取消后商品库存将退回。请确认该订单确实不再履约。')) return; await adminService.cancelOrder(this.id); toast('订单已取消',true); await this.refresh() }) },
    payNow() { return this.action(async()=>{ await payment.pay({orderId:this.data.order._id,payType:this.data.order.payType}); toast('支付成功',true); await this.refresh() }) },
    call() { if(this.data.order.address && this.data.order.address.phone) wx.makePhoneCall({phoneNumber:this.data.order.address.phone,fail(){}}) }
  })
}
