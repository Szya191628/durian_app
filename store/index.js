const format = require('../utils/format')
const initial = () => ({ user: null, openid: '', cart: [], checkout: [], checkoutSource: '', revision: 0 })
let state = initial()
const listeners = new Set()
const clone = value => JSON.parse(JSON.stringify(value))
function get() { return clone(state) }
function persist() { try { wx.setStorageSync('cart', state.cart) } catch (_) { wx.showToast({ title: '本地空间不足，购物袋暂未保存', icon: 'none' }) } }
function badge() {
  const count = state.cart.reduce((n, item) => n + item.quantity, 0)
  if (count) wx.setTabBarBadge({ index: 1, text: count > 99 ? '99+' : String(count), fail() {} })
  else wx.removeTabBarBadge({ index: 1, fail() {} })
}
function publish(save = false) { state.revision++; if (save) persist(); badge(); listeners.forEach(fn => fn(get())) }
function hydrate() {
  try {
    const saved = wx.getStorageSync('cart')
    state.cart = Array.isArray(saved) ? saved.filter(p => p && typeof p.productId === 'string' && Number.isInteger(p.quantity) && p.quantity > 0 && Number.isFinite(Number(p.price))).map(p => ({ ...p, selected: p.selected !== false })) : []
  } catch (_) { state.cart = [] }
  badge()
}
function setUser(user, openid) { state.user = user; state.openid = openid || state.openid; publish() }
function add(product, quantity = 1) {
  if (!product || product.status !== 1 || !Number.isInteger(quantity) || quantity < 1) throw new Error('商品暂不可购买')
  const old = state.cart.find(p => p.productId === product._id)
  if ((old ? old.quantity : 0) + quantity > product.stock) throw new Error('已达库存上限')
  if (old) { Object.assign(old, { quantity: old.quantity + quantity, stock: product.stock, price: product.price, selected: true }) }
  else state.cart.push({ productId: product._id, name: product.name, price: product.price, spec: product.spec || '', image: product.image || (product.images || [])[0] || '', stock: product.stock, quantity, selected: true })
  publish(true)
}
function update(id, patch) {
  const p = state.cart.find(item => item.productId === id)
  if (!p) return
  if (patch.quantity !== undefined && (!Number.isInteger(patch.quantity) || patch.quantity < 1 || (Number.isFinite(p.stock) && patch.quantity > p.stock))) throw new Error('数量超出库存范围')
  if (patch.quantity !== undefined) p.quantity = patch.quantity
  if (patch.selected !== undefined) p.selected = !!patch.selected
  publish(true)
}
function selectAll(selected) { state.cart.forEach(p => { p.selected = selected }); publish(true) }
function remove(id) { state.cart = state.cart.filter(p => p.productId !== id); publish(true) }
function checkout(items, source) { state.checkout = clone(items); state.checkoutSource = source; publish() }
function finishCheckout() {
  if (state.checkoutSource === 'cart') {
    state.checkout.forEach(item => { const p = state.cart.find(p => p.productId === item.productId); if (p) p.quantity -= item.quantity })
    state.cart = state.cart.filter(p => p.quantity > 0)
  }
  state.checkout = []; state.checkoutSource = ''; publish(true)
}
function totals() { const selected = state.cart.filter(p => p.selected); return { totalText: format.money(format.sum(selected)), count: selected.reduce((n,p) => n+p.quantity,0), all: state.cart.length > 0 && selected.length === state.cart.length } }
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }
function reset() { state = initial() }
module.exports = { get, hydrate, setUser, add, update, selectAll, remove, checkout, finishCheckout, totals, subscribe, badge, reset }
