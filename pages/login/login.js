const service=require('../../services/user')
const store=require('../../store/index')
const {define,toast}=require('../../utils/page')
Page(define({
  data:{nickname:'',loggedIn:false},
  onLoad() { this.refresh() },
  refresh() { const user=store.get().user; this.safe({nickname:user?user.nickName||'':'',loggedIn:!!user}) },
  input(e) { this.safe({nickname:e.detail.value}) },
  login() { return this.action(async()=>{ await service.login({nickName:this.data.nickname.trim()||'榴莲爱好者'}); toast(this.data.loggedIn?'资料已更新':'登录成功',true); if(getCurrentPages().length>1) wx.navigateBack(); else wx.switchTab({url:'/pages/mine/mine'}) }) }
}))
