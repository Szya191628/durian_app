const { call, database } = require('./client')
const user = require('./user')
const store = require('../store/index')
const format = require('../utils/format')
async function list(params) { await user.ensure(); const res = await call('getOrders', params); return { ...res, data: (res.data || []).map(format.order) } }
async function detail(id) {
  if (!id) throw new Error('缺少订单信息，请返回订单列表')
  await user.ensure()
  const res = await database(db => db.collection('orders').doc(id).get())
  if (!res.data || res.data._openid !== store.get().openid) throw new Error('订单不存在或无访问权限')
  return format.order(res.data)
}
async function create(payload) { await user.ensure(); return call('createOrder', { ...payload, items: payload.items.map(p => ({ productId: p.productId, quantity: p.quantity })) }, true) }
async function receive(id) {
  const order = await detail(id)
  if (order.status !== 'shipped') throw new Error('订单状态已更新，请刷新后重试')
  return database(db => db.collection('orders').doc(id).update({ data: { status: 'completed', completedAt: db.serverDate() } }), true)
}
module.exports = { list, detail, create, receive }
