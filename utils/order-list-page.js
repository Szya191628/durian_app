const orders = require('../services/orders')
const adminService = require('../services/admin')
const { listPage, navigate, pageSize } = require('./page')
function tabs(admin) {
  return [{key:'all',label:'全部'},{key:'pending',label:admin?'待收款':'待付款'},{key:'paid',label:'待发货'},{key:'shipped',label:'待收货'},{key:'completed',label:'已完成'},{key:'cancelled',label:'已取消'}]
}
module.exports = function(admin = false) {
  const options = tabs(admin)
  return listPage({
    data:{status:'all',tabs:options,admin},
    onLoad(options2) { this.safe({status:options.some(p=>p.key===options2.status)?options2.status:'all'}); this.refresh() },
    onShow() { if(this._shown) this.refresh(); this._shown=true },
    fetch(page) { const params={page,pageSize,status:this.data.status}; return admin ? adminService.list('orders',params) : orders.list(params) },
    change(e) { if(this.data.status===e.detail.value) return; this.safe({status:e.detail.value}); this.refresh() },
    open(e) { navigate((admin?'/pages/admin/order-detail/order-detail':'/pages/order-detail/order-detail')+'?id='+encodeURIComponent(e.detail.id)) },
    shopping() { wx.switchTab({url:'/pages/home/home'}) }
  })
}
