const userService=require('../../services/user')
const orders=require('../../services/orders')
const store=require('../../store/index')
const config=require('../../config/index')
const {money}=require('../../utils/format')
const {define,navigate}=require('../../utils/page')
Page(define({
  data:{user:null,balanceText:'—',pointsText:'—',orderCounts:[],countsError:false,supportPhone:config.supportPhone||''},
  onLoad() { this.refresh() },
  onShow() { if(this._shown) this.refresh(); this._shown=true },
  refresh() { return this.load(async()=>{ const user=store.get().user; if(!user) return {user:null}; const fresh=await userService.info(); const statuses=['pending','paid','shipped','completed']; const labels=['待付款','待发货','待收货','已完成']; const results=await Promise.all(statuses.map(status=>orders.list({status,page:1,pageSize:1}).then(res=>res.total).catch(()=>null))); return {user:fresh,balanceText:money(fresh.balance),pointsText:String(fresh.points||0),countsError:results.some(p=>p===null),orderCounts:statuses.map((key,i)=>({key,label:labels[i],value:results[i]===null?'—':String(results[i]),icon:['wallet','box','truck','check'][i]}))} }) },
  login() { navigate('/pages/login/login') },
  order(e) { navigate('/pages/order-list/order-list?status='+encodeURIComponent(e.currentTarget.dataset.status||'all')) },
  member() { navigate('/pages/member/member') },
  addresses() { navigate('/pages/address-list/address-list') },
  admin() { navigate('/pages/admin/index/index') },
  call() { if(config.supportPhone) wx.makePhoneCall({phoneNumber:config.supportPhone,fail(){}}) }
}))
