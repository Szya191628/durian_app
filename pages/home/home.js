const catalog = require('../../services/catalog')
const store = require('../../store/index')
const { listPage, navigate, toast, pageSize } = require('../../utils/page')
Page(listPage({
  data: { categories: [], category: 'all', keyword: '', searchDraft: '', categoryTotal: '—' },
  onLoad(options) { this.safe({ category: options.category || 'all', keyword: options.keyword || '', searchDraft: options.keyword || '' }); this.refresh() },
  onShow() { store.badge() },
  async fetch(page) {
    const params = { page, pageSize, category: this.data.category, keyword: this.data.keyword }
    if (page === 1) {
      const [categories, result] = await Promise.all([catalog.categories(), catalog.list(params)])
      if (params.category === this.data.category && params.keyword === this.data.keyword) this.safe({ categories: [{ key: 'all', label: '全部', name: '全部' }].concat(categories), categoryTotal: String(categories.length) })
      return result
    }
    return catalog.list(params)
  },
  openProduct(e) { navigate('/pages/detail/detail?id=' + encodeURIComponent(e.detail.id)) },
  addProduct(e) { try { store.add(e.detail.product); toast('已加入购物袋', true) } catch(err) { toast(err.message) } },
  goCategory(e) { navigate('/pages/category/category?category=' + encodeURIComponent(e.currentTarget.dataset.key || 'all')) },
  searchHome() { navigate('/pages/category/category') },
  searchInput(e) { this.safe({ searchDraft: e.detail.value }) },
  search(e) { this.safe({ keyword: e.detail.value.trim(), searchDraft: e.detail.value }); this.refresh() },
  changeCategory(e) { if (e.detail.value === this.data.category) return; this.safe({ category: e.detail.value }); this.refresh() }
}))
