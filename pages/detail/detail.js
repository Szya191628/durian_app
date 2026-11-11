const catalog = require('../../services/catalog')
const store = require('../../store/index')
const { define, navigate, toast } = require('../../utils/page')
Page(define({
  data: { product: null, quantity: 1, cartCount: 0, imageFailed: false },
  onLoad(options) { this.id = options.id; this._unsubscribe = store.subscribe(() => this.updateCount()); this.refresh() },
  onShow() { this.updateCount() },
  refresh() { return this.load(async () => ({ product: await catalog.detail(this.id), quantity: 1, imageFailed: false })) },
  updateCount() { this.safe({ cartCount: store.get().cart.reduce((n,p)=>n+p.quantity,0) }) },
  changeQuantity(e) { this.safe({ quantity: e.detail.value }) },
  imageError() { this.safe({ imageFailed: true }) },
  add() { try { store.add(this.data.product, this.data.quantity); toast('已加入购物袋', true) } catch(err) { toast(err.message) } },
  buy() {
    const p = this.data.product, quantity = this.data.quantity
    if (!p || p.status !== 1 || p.stock < quantity) return toast('当前商品库存不足')
    store.checkout([{ productId: p._id, name: p.name, price: p.price, image: p.image, spec: p.spec, quantity }], 'direct')
    navigate('/pages/order-confirm/order-confirm')
  },
  cart() { wx.switchTab({ url: '/pages/cart/cart' }) }
}))
