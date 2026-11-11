const service=require('../../services/address')
const {define,toast}=require('../../utils/page')
Page(define({
  data:{form:{name:'',phone:'',detail:'',isDefault:false},region:[],validation:{},saved:false},
  onLoad(options) { this.id=options.id;this.refresh() },
  refresh() { if(!this.id)return;return this.load(async()=>{const form=await service.detail(this.id);return {form,region:[form.province,form.city,form.district]}}) },
  input(e) { const field=e.currentTarget.dataset.field;this.safe({['form.'+field]:e.detail.value,['validation.'+field]:''}) },
  region(e) { this.safe({region:e.detail.value,'validation.region':''}) },
  default(e) { this.safe({'form.isDefault':e.detail.value}) },
  save() { return this.action(async()=>{if(this.data.saved)return;const form=this.data.form;const errors={};if(!form.name.trim())errors.name='请填写收货人姓名';if(!/^1[3-9]\d{9}$/.test(form.phone.trim()))errors.phone='请输入 11 位大陆手机号码';if(this.data.region.length!==3)errors.region='请选择省、市、区';if(form.detail.trim().length<3)errors.detail='请填写街道及门牌号';this.safe({validation:errors});if(Object.keys(errors).length)return;await service.save({...form,name:form.name.trim(),phone:form.phone.trim(),detail:form.detail.trim(),province:this.data.region[0],city:this.data.region[1],district:this.data.region[2]},this.id);this.safe({saved:true});toast('地址已保存',true);wx.navigateBack()}) }
}))
