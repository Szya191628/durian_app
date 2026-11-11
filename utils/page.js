const config = require('../config/index')
function toast(title, success = false) { wx.showToast({ title, icon: success ? 'success' : 'none' }) }
function navigate(url) { wx.navigateTo({ url, fail() { toast('页面暂时无法打开') } }) }
function confirm(title, content) { return new Promise(resolve => wx.showModal({ title, content, confirmColor: '#254D3E', success: res => resolve(res.confirm), fail: () => resolve(false) })) }
function define(spec) {
  const load = spec.onLoad, unload = spec.onUnload
  return { ...spec, data: { loading: false, error: '', busy: false, ...spec.data },
    onLoad(options) { this._alive = true; this._version = 0; if (load) return load.call(this, options || {}) },
    onUnload() { this._alive = false; this._version++; if (this._unsubscribe) this._unsubscribe(); if (unload) unload.call(this) },
    safe(patch) { if (this._alive !== false) this.setData(patch) },
    async load(work) { const version = ++this._version; this.safe({ loading: true, error: '' }); try { const patch = await work(); if (version === this._version) this.safe({ ...patch, loading: false }) } catch (err) { if (version === this._version) this.safe({ loading: false, error: err.message || '加载失败，请重试' }) } },
    async action(work) { if (this._acting) return; this._acting = true; this.safe({ busy: true }); try { return await work() } catch (err) { toast(err.message || '操作失败，请重试') } finally { this._acting = false; this.safe({ busy: false }) } },
    async onPullDownRefresh() { try { if (this.refresh) await this.refresh() } finally { wx.stopPullDownRefresh() } },
    retry() { if (this.refresh) return this.refresh() }
  }
}
function listPage(spec) {
  const options = { ...spec, data: { items: [], total: 0, hasMore: true, loadingMore: false, moreError: '', ...spec.data } }
  return define({ ...options,
    async refresh() { this._listVersion = (this._listVersion || 0) + 1; this._page = 0; this._fetchingMore = false; this.safe({ loadingMore: false, moreError: '' }); return this.load(async () => { const res = await this.fetch(1); this._page = 1; return { items: res.data, total: res.total, hasMore: res.data.length < res.total } }) },
    async onReachBottom() {
      if (this.data.loading || this._fetchingMore || !this.data.hasMore || this.data.error) return
      const version = this._listVersion; this._fetchingMore = true; this.safe({ loadingMore: true, moreError: '' })
      try {
        const res = await this.fetch(this._page + 1)
        if (version !== this._listVersion || this._alive === false) return
        this._page++; const ids = new Set(this.data.items.map(p => p._id)); const incoming = res.data.filter(p => !ids.has(p._id)); const length = this.data.items.length
        const patch = { total: res.total, hasMore: res.data.length > 0 && length + incoming.length < res.total, loadingMore: false }
        incoming.forEach((item, i) => { patch['items[' + (length + i) + ']'] = item })
        this.safe(patch)
      } catch (err) { if (version === this._listVersion) this.safe({ loadingMore: false, moreError: err.message }) }
      finally { if (version === this._listVersion) this._fetchingMore = false }
    }
  })
}
module.exports = { define, listPage, toast, navigate, confirm, pageSize: config.pageSize }
