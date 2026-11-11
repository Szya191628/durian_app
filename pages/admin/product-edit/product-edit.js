const admin=require('../../../services/admin')
const catalog=require('../../../services/catalog')
const validation=require('../../../utils/validation')
const {define,toast}=require('../../../utils/page')
Page(define({
  data:{form:{name:'',price:'',originalPrice:'',stock:'0',sort:'0',unit:'个',spec:'',description:'',status:1,images:[]},categories:[],categoryIndex:0,validation:{},uploading:false,saved:false,focused:''},
  onLoad(options) { this.id=options.id;this.refresh() },
  refresh() { return this.load(async()=>{await require('../../../services/user').admin();const categories=await catalog.categories();if(!this.id)return {categories};const p=await admin.detail('products',this.id);return {categories,categoryIndex:Math.max(0,categories.findIndex(c=>c.key===p.category||c.name===p.categoryName)),form:{name:p.name||'',price:String(p.price),originalPrice:p.originalPrice?String(p.originalPrice):'',stock:String(p.stock||0),sort:String(p.sort||0),unit:p.unit||'个',spec:p.spec||'',description:p.description||'',status:p.status===1?1:0,images:p.images||[]}}}) },
  input(e) { const key=e.currentTarget.dataset.field;this.safe({['form.'+key]:e.detail.value,['validation.'+key]:''}) },
  focus(e) { this.safe({focused:e.currentTarget.dataset.field}) },
  blur() { this.safe({focused:''}) },
  category(e) { this.safe({categoryIndex:Number(e.detail.value),'validation.category':''}) },
  status(e) { this.safe({'form.status':e.detail.value?1:0}) },
  removeImage(e) { if(this.data.uploading||this.data.busy)return;this.safe({'form.images':this.data.form.images.filter((_,i)=>i!==Number(e.currentTarget.dataset.index))}) },
  async upload() {
    if(this.data.uploading || this.data.busy || this.data.form.images.length>=6)return
    this.safe({uploading:true})
    try {
      const res=await new Promise((resolve,reject)=>wx.chooseMedia({count:6-this.data.form.images.length,mediaType:['image'],sizeType:['compressed'],success:resolve,fail:reject}))
      const files=[]
      for(const file of res.tempFiles){if(file.size>5*1024*1024)throw new Error('单张图片不能超过 5 MB');files.push(await admin.upload(file.tempFilePath))}
      this.safe({'form.images':this.data.form.images.concat(files)});toast('图片已上传',true)
    }catch(err){if(!/cancel/.test(err.errMsg||''))toast(err.message||'图片上传失败，请重试')}finally{this.safe({uploading:false})}
  },
  save() { if(this.data.uploading || this.data.saved)return;return this.action(async()=>{const f=this.data.form;const errors=validation.product(f,this.data.categories,this.data.categoryIndex);this.safe({validation:errors});if(Object.keys(errors).length){toast('请检查商品信息');return}const category=this.data.categories[this.data.categoryIndex];await admin.saveProduct(this.id,{...f,name:f.name.trim(),spec:f.spec.trim(),unit:f.unit.trim(),description:f.description.trim(),price:Number(f.price),originalPrice:f.originalPrice===''?Number(f.price):Number(f.originalPrice),stock:Number(f.stock),sort:Number(f.sort),category:category.key,categoryName:category.name});this.safe({saved:true});toast('商品已保存',true);wx.navigateBack()}) }
}))
