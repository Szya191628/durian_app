const store = require('../../store/index')
const address = require('../../services/address')
const orders = require('../../services/orders')
const payment = require('../../services/payment')
const user = require('../../services/user')
const format = require('../../utils/format')
const { define, navigate, toast } = require('../../utils/page')
Page(define({
  data: { items:[], itemCount:0, address:null, remark:'', totalText:'0.00', payType:payment.mode(), payTypes:payment.options(false), payTypeLabel:payment.label(payment.mode()), submitted:false, uncertain:false, review:false, remarkDraft:'' },
  onLoad() { this.refresh() },
  refresh() { return this.load(async()=>{ const items=store.get().checkout; if(!items.length) throw new Error('还没有待结算商品，请返回购物袋选择'); const addresses=await address.list(); const profile=await user.info().catch(()=>null); const payTypes=payment.options(!!(profile && profile.balance > 0)); const payType=payTypes.some(p=>p.value===this.data.payType)?this.data.payType:payTypes[0].value; return { items:items.map(p=>({...p,priceText:format.money(p.price)})), itemCount:items.reduce((sum,p)=>sum+p.quantity,0), totalText:format.money(format.sum(items)), payTypes, payType, payTypeLabel:payment.label(payType), address:this.data.address || addresses.find(p=>p.isDefault) || addresses[0] || null } }) },
  chooseAddress() { wx.navigateTo({ url:'/pages/address-list/address-list?select=1', events:{ selectAddress:value=>this.safe({address:value}) } }) },
  remark(e) { this.safe({remark:e.detail.value}) },
  pay(e) { const value=e.currentTarget.dataset.type; if(!this.data.payTypes.some(p=>p.value===value)) return; this.safe({payType:value,payTypeLabel:payment.label(value)}) },
  submit() { if(this.data.submitted || this.data.uncertain || this.data.busy) return; if(!this.data.address) return toast('请先选择收货地址'); this.safe({review:true}) },
  cancel() { this.safe({review:false}) },
  confirm() { return this.action(async()=>{ if(this.data.submitted || this.data.uncertain) return; let created=null; try {
    created=await orders.create({items:this.data.items,address:this.data.address,remark:this.data.remark,payType:this.data.payType})
    this.safe({submitted:true,review:false}); store.finishCheckout()
  } catch(err) { this.safe({review:false}); if(!err.business) this.safe({uncertain:true}); throw err }
  if(this.data.payType===payment.WXPAY){ try { await payment.pay({orderId:created.orderId,payType:this.data.payType}) } catch(err) { toast(err.message||'支付未完成'); return this.done(created.orderId) } }
  toast('下单成功',true); return this.done(created.orderId) }) },
  done(orderId) { wx.redirectTo({url:'/pages/order-detail/order-detail?id='+encodeURIComponent(orderId),fail:()=>navigate('/pages/order-list/order-list')}) },
  viewOrders() { navigate('/pages/order-list/order-list') }
}))
