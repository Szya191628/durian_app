const { call, database } = require('./client')
const user = require('./user')
const store = require('../store/index')
async function list() { await user.ensure(); return (await call('manageAddress', { action: 'list' })).data || [] }
async function page(number, pageSize = 12) {
  await user.ensure()
  return database(async db => {
    const query = db.collection('addresses').where({ _openid: store.get().openid })
    const [res, total] = await Promise.all([query.orderBy('isDefault', 'desc').orderBy('createdAt', 'desc').skip((number - 1) * pageSize).limit(pageSize).get(), query.count()])
    return { data: res.data, total: total.total }
  })
}
async function detail(id) {
  if (!id) throw new Error('缺少地址信息')
  await user.ensure()
  const res = await database(db => db.collection('addresses').doc(id).get())
  if (!res.data || res.data._openid !== store.get().openid) throw new Error('地址不存在或无访问权限')
  return res.data
}
async function save(address, id) { await user.ensure(); return call('manageAddress', { action: id ? 'update' : 'add', address, addressId: id }, true) }
async function remove(id) { await user.ensure(); return call('manageAddress', { action: 'delete', addressId: id }, true) }
async function setDefault(id) { await user.ensure(); return call('manageAddress', { action: 'setDefault', addressId: id }, true) }
module.exports = { list, page, detail, save, remove, setDefault }
