const admin=require('../../../services/admin')
const {define,navigate}=require('../../../utils/page')
Page(define({
  data:{stats:[],admin:true},
  onLoad() { this.refresh() },
  onShow() { if(this._shown)this.refresh();this._shown=true },
  refresh() { return this.load(async()=>{const s=await admin.stats();return {stats:[{label:'订单总数',value:String(s.orders||0),icon:'box',note:'店铺累计订单'},{label:'待收款',value:String(s.pendingPayment||0),icon:'wallet',note:'等待确认到账的订单'},{label:'待发货',value:String(s.toShip||0),icon:'truck',note:'已收款，等待发货'},{label:'在售商品',value:String(s.products||0),icon:'leaf',note:'当前上架商品数量'},{label:'店铺用户',value:String(s.users||0),icon:'user',note:'已建立店铺账户'}]}}) },
  products() { navigate('/pages/admin/products/products') },
  orders() { navigate('/pages/admin/orders/orders') },
  recharge() { navigate('/pages/admin/recharge/recharge') },
  pending() { navigate('/pages/admin/orders/orders?status=paid') },
  unpaid() { navigate('/pages/admin/orders/orders?status=pending') }
}))
