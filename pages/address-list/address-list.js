const service=require('../../services/address')
const {listPage,navigate,toast,confirm}=require('../../utils/page')
Page(listPage({
  data:{items:[],selecting:false},
  onLoad(options) { this.safe({selecting:options.select==='1'});this.refresh() },
  onShow() { if(this._shown)this.refresh();this._shown=true },
  fetch(page) { return service.page(page) },
  add() { navigate('/pages/address-edit/address-edit') },
  edit(e) { navigate('/pages/address-edit/address-edit?id='+encodeURIComponent(e.currentTarget.dataset.id)) },
  choose(e) { if(!this.data.selecting)return;const item=this.data.items.find(p=>p._id===e.currentTarget.dataset.id);if(item){this.getOpenerEventChannel().emit('selectAddress',item);wx.navigateBack()} },
  default(e) { return this.action(async()=>{await service.setDefault(e.currentTarget.dataset.id);toast('已设为默认地址',true);await this.refresh()}) },
  remove(e) { return this.action(async()=>{if(!await confirm('删除收货地址','删除后，历史订单中的收货信息会保留。'))return;await service.remove(e.currentTarget.dataset.id);toast('地址已删除',true);await this.refresh()}) }
}))
