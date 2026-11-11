// utils/util.js

/**
 * 格式化日期
 */
const formatDate = function (date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()
  var hour = date.getHours()
  var minute = date.getMinutes()
  var second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('-') + ' ' +
    [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = function (n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

/**
 * 生成订单号
 */
const generateOrderNo = function () {
  var now = new Date()
  var year = now.getFullYear()
  var month = formatNumber(now.getMonth() + 1)
  var day = formatNumber(now.getDate())
  var hour = formatNumber(now.getHours())
  var minute = formatNumber(now.getMinutes())
  var second = formatNumber(now.getSeconds())
  var random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return 'DL' + year + month + day + hour + minute + second + random
}

/**
 * 格式化价格（分转元）
 */
const formatPrice = function (price) {
  return (price / 100).toFixed(2)
}

/**
 * 订单状态映射
 */
const orderStatusMap = {
  'pending': '待付款',
  'paid': '待发货',
  'shipped': '待收货',
  'completed': '已完成',
  'cancelled': '已取消'
}

/**
 * 获取订单状态文本
 */
const getOrderStatusText = function (status) {
  return orderStatusMap[status] || '未知'
}

module.exports = {
  formatDate: formatDate,
  formatNumber: formatNumber,
  generateOrderNo: generateOrderNo,
  formatPrice: formatPrice,
  getOrderStatusText: getOrderStatusText,
  orderStatusMap: orderStatusMap
}
