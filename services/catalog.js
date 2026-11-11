const { call, database } = require('./client')
const format = require('../utils/format')
async function categories() { const res = await call('getCategories'); return (res.data || []).map(format.category) }
async function list(params) { const res = await call('getProducts', params); return { ...res, data: (res.data || []).map(format.product) } }
async function detail(id) {
  if (!id) throw new Error('缺少商品信息，请返回重新选择')
  const res = await database(db => db.collection('products').doc(id).get())
  if (!res.data || res.data.status !== 1) throw new Error('商品已下架或不存在')
  return format.product(res.data)
}
module.exports = { categories, list, detail }
