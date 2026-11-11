const { call } = require('./client')
const store = require('../store/index')
let pending
async function login(profile = {}) {
  if (pending) return pending
  pending = call('login', profile, true).then(res => { store.setUser(res.user, res.openid); return res.user }).finally(() => { pending = null })
  return pending
}
async function ensure() { return store.get().user || login() }
async function info() { await ensure(); const res = await call('updateUser', { action: 'getInfo' }); store.setUser(res.data); return res.data }
async function admin() { const user = await info(); if (user.role !== 'admin') throw new Error('此页面仅对店铺管理员开放'); return user }
module.exports = { login, ensure, info, admin }
