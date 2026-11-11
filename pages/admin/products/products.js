const service=require('../../../services/admin')
const {listPage,navigate,toast,confirm}=require('../../../utils/page')
Page(listPage({
  data:{status:'all',tabs:[{key:'all',label:'全部商品'},{key:'1',label:'在售'},{key:'0',label:'已下架'}]},
  onLoad() { this.refresh() },
  onShow() { if(this._shown)this.refresh();this._shown=true },
  fetch(page) { return service.list('products',{page,status:this.data.status==='all'?'all':Number(this.data.status)}) },
  change(e) { this.safe({status:e.detail.value});this.refresh() },
  add() { navigate('/pages/admin/product-edit/product-edit') },
  edit(e) { navigate('/pages/admin/product-edit/product-edit?id='+encodeURIComponent(e.currentTarget.dataset.id)) },
  toggle(e) { return this.action(async()=>{const p=this.data.items.find(p=>p._id===e.currentTarget.dataset.id);if(!p)return;await service.toggleProduct(p._id,p.status===1?0:1);toast(p.status===1?'商品已下架':'商品已上架',true);await this.refresh()}) },
  remove(e) { return this.action(async()=>{if(!await confirm('删除商品','此操作会删除商品记录。暂时停售建议使用下架。'))return;await service.removeProduct(e.currentTarget.dataset.id);toast('商品已删除',true);await this.refresh()}) }
}))
