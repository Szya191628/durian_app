// Existing database amounts are yuan. Only arithmetic uses integer cents.
function cents(value) { const n = Number(value); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
function money(value) { return (cents(value) / 100).toFixed(2) }
function sum(items) { return items.reduce((n, item) => n + cents(item.price) * item.quantity, 0) / 100 }
function date(value) {
  if (!value) return '—'
  const d = new Date(value.$date || value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const status = { pending: '待付款', paid: '待发货', shipped: '待收货', completed: '已完成', cancelled: '已取消' }
const categoryCodes = { '猫山王': 'musang_king', '金枕': 'golden_pillow', '干尧': 'kanyao', '黑刺': 'black_thorn', '托曼尼': 'thongmanoi', '整果专区': 'mixed' }
function category(item) { return { ...item, key: item.code || item.key || categoryCodes[item.name] || item._id, label: item.name } }
function product(item) { return { ...item, priceText: money(item.price), originalText: money(item.originalPrice), image: (item.images || [])[0] || '', stock: Math.max(0, Number(item.stock) || 0) } }
function order(item) { return { ...item, statusText: status[item.status] || '状态待更新', amountText: money(item.payAmount), dateText: date(item.createdAt), paidText: date(item.paidAt), shippedText: date(item.shippedAt), items: (item.items || []).map(p => ({ ...p, priceText: money(p.price) })) } }
module.exports = { cents, money, sum, date, status, categoryCodes, category, product, order }
