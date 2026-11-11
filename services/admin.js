// 管理端数据访问层。所有写入统一走 admin 云函数，由服务端校验管理员身份，
// 不再从客户端直连数据库，避免绕过界面直接改价或改订单状态。
const { call } = require('./client')
const user = require('./user')
const format = require('../utils/format')

async function invoke(action, payload) {
  await user.admin()
  return call('admin', { action, ...(payload || {}) }, true)
}

async function list(collection, params) {
  const query = params || {}
  const res = await invoke('list', {
    collection,
    status: query.status,
    page: query.page || 1,
    pageSize: query.pageSize
  })
  const items = res.data || []
  return {
    data: items.map(item => (collection === 'products' ? format.product(item) : format.order(item))),
    total: res.total || 0
  }
}

async function detail(collection, id) {
  if (!id) throw new Error('缺少记录编号')
  const res = await invoke('detail', { collection, id })
  return collection === 'orders' ? format.order(res.data) : res.data
}

function saveProduct(id, value) {
  return invoke('saveProduct', { id: id || '', value })
}

function toggleProduct(id, status) {
  return invoke('toggleProduct', { id, status })
}

function removeProduct(id) {
  return invoke('removeProduct', { id })
}

function updateOrder(id, action, trackingNo) {
  return invoke('updateOrder', { id, action, trackingNo: trackingNo || '' })
}

// 线下收款确认：待收款 → 已收款
function confirmPay(id) {
  return invoke('updateOrder', { id, action: 'confirmPay' })
}

function cancelOrder(id) {
  return invoke('updateOrder', { id, action: 'cancel' })
}

async function stats() {
  const res = await invoke('stats')
  return res.data || {}
}

// 商家手动充值，用户侧无自助充值入口
function rechargeUser(userId, amount, note) {
  return invoke('rechargeUser', { userId, amount, note: note || '' })
}

async function findUser(keyword) {
  const res = await invoke('findUser', { keyword })
  return res.data || []
}

function upload(filePath) {
  return user.admin()
    .then(() => wx.cloud.uploadFile({
      cloudPath: 'products/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg',
      filePath
    }))
    .then(res => res.fileID)
}

module.exports = {
  list,
  detail,
  saveProduct,
  toggleProduct,
  removeProduct,
  updateOrder,
  confirmPay,
  cancelOrder,
  stats,
  rechargeUser,
  findUser,
  upload
}
