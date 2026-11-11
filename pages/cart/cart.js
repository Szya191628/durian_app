const store = require('../../store/index')
const format = require('../../utils/format')
const { define, navigate, toast } = require('../../utils/page')
Page(define({
  data: { items: [], totalText: '0.00', count: 0, all: false, removeId: '', modal: false },
  onLoad() { this._unsubscribe = store.subscribe(() => this.refresh()); this.refresh() },
  onShow() { this.refresh() },
  refresh() { this.safe({ items: store.get().cart.map(p=>({...p,priceText:format.money(p.price)})), ...store.totals() }) },
  toggle(e) { const p=store.get().cart.find(p=>p.productId===e.currentTarget.dataset.id); if(p) store.update(p.productId,{selected:!p.selected}) },
  toggleAll() { store.selectAll(!this.data.all) },
  quantity(e) { try { store.update(e.currentTarget.dataset.id,{quantity:e.detail.value}) } catch(err) { toast(err.message) } },
  remove(e) { this.safe({ removeId:e.currentTarget.dataset.id, modal:true }) },
  cancelRemove() { this.safe({modal:false}) },
  confirmRemove() { store.remove(this.data.removeId); this.safe({modal:false}); toast('已移出购物袋',true) },
  shopping() { wx.switchTab({url:'/pages/home/home'}) },
  checkout() { const items=store.get().cart.filter(p=>p.selected); if(!items.length) return toast('先选中想要购买的商品'); store.checkout(items,'cart'); navigate('/pages/order-confirm/order-confirm') }
}))
