const user=require('../../services/user')
const config=require('../../config/index')
const {money}=require('../../utils/format')
const {define}=require('../../utils/page')
Page(define({
  data:{balance:'—',points:'—',supportPhone:config.supportPhone||''},
  onLoad() { this.refresh() },
  refresh() { return this.load(async()=>{const profile=await user.info();return {balance:money(profile.balance),points:String(profile.points||0)}}) },
  call() { if(config.supportPhone) wx.makePhoneCall({phoneNumber:config.supportPhone,fail(){}}) }
}))
