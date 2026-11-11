const admin=require('../../../services/admin')
const {define,toast,confirm}=require('../../../utils/page')
Page(define({
  data:{keyword:'',results:[],selected:null,amount:'',note:'',searched:false},
  keyword(e) { this.safe({keyword:e.detail.value}) },
  amount(e) { this.safe({amount:e.detail.value}) },
  note(e) { this.safe({note:e.detail.value}) },
  search() { return this.action(async()=>{ const text=this.data.keyword.trim(); if(!text) return toast('请输入昵称或手机号'); const results=await admin.findUser(text); this.safe({results,searched:true,selected:null}) }) },
  pick(e) { const user=this.data.results.find(u=>u._id===e.currentTarget.dataset.id); this.safe({selected:user||null}) },
  submit() {
    if(!this.data.selected) return toast('请先选择用户')
    return this.action(async()=>{
      const amount=Number(this.data.amount)
      if(!Number.isFinite(amount) || amount<=0) return toast('请输入正确的充值金额')
      const target=this.data.selected
      if(!await confirm('确认充值','给「'+(target.nickName || target._id)+'」充值 ¥'+amount+'，将立即入账。')) return
      const res=await admin.rechargeUser(target._id,amount,this.data.note)
      const balance=res.balance!=null?res.balance:target.balance
      this.safe({amount:'',note:'',selected:{...target,balance},results:this.data.results.map(u=>u._id===target._id?{...u,balance}:u)})
      toast(res.message||'充值已入账',true)
    })
  }
}))
