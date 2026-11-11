const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm')
let storage={}
global.wx={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>{storage[k]=JSON.parse(JSON.stringify(v))},setTabBarBadge(){},removeTabBarBadge(){},showToast(){},stopPullDownRefresh(){}}
const store=require('../store'),format=require('../utils/format'),{define,listPage}=require('../utils/page')
function mount(def){const p={...def,data:structuredClone(def.data),_alive:true,_version:0};p.setData=patch=>{for(const [key,value] of Object.entries(patch)){const tokens=key.replace(/\[(\d+)\]/g,'.$1').split('.');let dest=p.data;for(let i=0;i<tokens.length-1;i++)dest=dest[tokens[i]];dest[tokens[tokens.length-1]]=value}};return p}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
const product={_id:'p1',name:'金枕',price:0.1,stock:3,status:1,images:[]}
test('money arithmetic uses cents and preserves yuan contract',()=>{assert.equal(format.money(format.sum([{price:0.1,quantity:1},{price:0.2,quantity:1}])),'0.30');assert.equal(format.money(298),'298.00')})
test('legacy categories map to server codes',()=>{assert.equal(format.category({name:'猫山王',_id:'123'}).key,'musang_king');assert.equal(format.category({name:'新品种',code:'new'}).key,'new')})
test('cart quantities, selection and restore are persistent',()=>{store.reset();storage={};store.add(product,2);store.update('p1',{selected:false});store.reset();store.hydrate();assert.equal(store.get().cart[0].selected,false);assert.equal(store.get().cart[0].quantity,2);assert.equal(store.totals().count,0);store.selectAll(true);assert.equal(store.totals().totalText,'0.20')})
test('cart rejects unavailable and excess stock without partial mutation',()=>{store.reset();store.add(product,3);assert.throws(()=>store.add(product),/库存/);assert.equal(store.get().cart[0].quantity,3);assert.throws(()=>store.add({...product,status:0}),/购买/);assert.throws(()=>store.update('p1',{quantity:0}),/库存/);assert.throws(()=>store.update('p1',{quantity:4}),/库存/)})
test('corrupted cache is filtered',()=>{store.reset();storage.cart=[null,{}, {...product,productId:'bad',quantity:-2},{productId:'good',price:1,quantity:1}];store.hydrate();assert.deepEqual(store.get().cart.map(p=>p.productId),['good'])})
test('direct purchase does not remove existing cart items',()=>{store.reset();store.add(product,2);store.checkout([{productId:'p1',price:.1,quantity:1}],'direct');store.finishCheckout();assert.equal(store.get().cart[0].quantity,2)})
test('cart settlement subtracts purchased quantities only',()=>{store.reset();store.add(product,2);store.checkout(store.get().cart,'cart');store.add(product,1);store.finishCheckout();assert.equal(store.get().cart[0].quantity,1);assert.equal(store.get().checkout.length,0)})
test('read snapshots cannot mutate store',()=>{store.reset();store.add(product);const value=store.get();value.cart[0].quantity=99;assert.equal(store.get().cart[0].quantity,1)})
test('older refresh cannot overwrite current filters',async()=>{const first=deferred(),second=deferred();let n=0;const p=mount(listPage({fetch(){return ++n===1?first.promise:second.promise}}));const a=p.refresh(),b=p.refresh();second.resolve({data:[{_id:'new'}],total:1});await b;first.resolve({data:[{_id:'old'}],total:1});await a;assert.equal(p.data.items[0]._id,'new')})
test('pagination is single flight, deduplicates and ends at total',async()=>{let calls=0;const next=deferred();const p=mount(listPage({fetch(page){calls++;return page===1?Promise.resolve({data:[{_id:'a'}],total:2}):next.promise}}));await p.refresh();const a=p.onReachBottom(),b=p.onReachBottom();assert.equal(calls,2);next.resolve({data:[{_id:'a'},{_id:'b'}],total:2});await Promise.all([a,b]);assert.equal(p.data.items.length,2);assert.equal(p.data.hasMore,false)})
test('stale pagination cannot append after refresh',async()=>{const next=deferred();const p=mount(listPage({fetch(page){return page===1?Promise.resolve({data:[{_id:'fresh'}],total:2}):next.promise}}));await p.refresh();const a=p.onReachBottom();await p.refresh();next.resolve({data:[{_id:'stale'}],total:2});await a;assert.deepEqual(p.data.items.map(x=>x._id),['fresh'])})
test('failed next page keeps existing data and can retry',async()=>{let fails=true;const p=mount(listPage({fetch(page){if(page===1)return Promise.resolve({data:[{_id:'a'}],total:2});if(fails)return Promise.reject(new Error('offline'));return Promise.resolve({data:[{_id:'b'}],total:2})}}));await p.refresh();await p.onReachBottom();assert.equal(p.data.items.length,1);assert.equal(p.data.moreError,'offline');fails=false;await p.onReachBottom();assert.equal(p.data.items.length,2)})
test('unloaded page ignores late requests',async()=>{const req=deferred();const p=mount(define({}));const task=p.load(()=>req.promise);p.onUnload();req.resolve({value:7});await task;assert.equal(p.data.value,undefined)})
test('submission lock allows exactly one in-flight mutation',async()=>{const req=deferred();const p=mount(define({}));let count=0;const a=p.action(async()=>{count++;await req.promise}),b=p.action(async()=>{count++});assert.equal(count,1);assert.equal(p.data.busy,true);req.resolve();await Promise.all([a,b]);assert.equal(p.data.busy,false)})
test('validation rejects invalid money, stock, missing category',()=>{const validate=require('../utils/validation').product;const base={name:'商品',price:'12.34',originalPrice:'',stock:'0',sort:'0',unit:'盒',spec:'400g'};assert.deepEqual(validate(base,[{key:'test'}],0),{});assert.ok(validate({...base,price:'0',stock:'-1',originalPrice:'1'},[],0).price);assert.ok(validate({...base,price:'1.234'},[{}],0).price);assert.ok(validate({...base,originalPrice:'1'},[{}],0).originalPrice)})
test('every WXML page event points to a real Page handler',()=>{
  const root=path.resolve(__dirname,'..');const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));let captured
  global.Page=p=>{captured=p}
  for(const route of app.pages){delete require.cache[require.resolve(path.join(root,route+'.js'))];require(path.join(root,route+'.js'));assert.ok(captured,route);const wxml=fs.readFileSync(path.join(root,route+'.wxml'),'utf8');for(const [,handler]of wxml.matchAll(/(?:bind|catch)(?::)?[\w-]+="([\w]+)"/g))assert.equal(typeof captured[handler],'function',route+': '+handler)}
  delete global.Page
})
test('all component events point to declared methods',()=>{
  const root=path.resolve(__dirname,'../components');let captured;global.Component=c=>captured=c
  for(const name of fs.readdirSync(root)){const base=path.join(root,name,name);require(base+'.js');const wxml=fs.readFileSync(base+'.wxml','utf8');for(const [,handler]of wxml.matchAll(/(?:bind|catch)(?::)?[\w-]+="([\w]+)"/g))assert.equal(typeof (captured.methods||{})[handler],'function',name+': '+handler)}delete global.Component
})
test('all 17 pages load through real services against a controlled cloud fixture',async()=>{
  const config=require('../config/index'),oldEnv=config.cloudEnv;config.cloudEnv='fixture-env'
  const fixtureUser={_id:'u1',_openid:'openid',nickName:'测试用户',balance:320,points:5,role:'admin'}
  const fixtureProduct={...product,price:298,category:'musang_king',categoryName:'猫山王',spec:'400g',createdAt:new Date(),images:[]}
  const fixtureAddress={_id:'a1',_openid:'openid',name:'测试',phone:'13800000000',province:'广东省',city:'深圳市',district:'南山区',detail:'测试路 1 号',isDefault:true}
  const fixtureOrder={_id:'o1',_openid:'openid',orderNo:'order-1',status:'paid',payAmount:298,address:fixtureAddress,items:[{productId:'p1',price:298,quantity:1,name:'测试商品'}]}
  const dbData={products:[fixtureProduct],orders:[fixtureOrder],users:[fixtureUser],addresses:[fixtureAddress],categories:[{_id:'c1',name:'猫山王'}]}
  wx.cloud={callFunction:async({name,data})=>({result:name==='login'?{code:0,user:fixtureUser,openid:'openid'}:name==='updateUser'?{code:0,data:fixtureUser}:name==='getCategories'?{code:0,data:dbData.categories}:name==='getProducts'?{code:0,data:dbData.products,total:1}:name==='getOrders'?{code:0,data:dbData.orders,total:1}:name==='manageAddress'?{code:0,data:dbData.addresses}:name==='admin'?(data.action==='stats'?{code:0,data:{orders:1,pendingPayment:0,toShip:1,products:1,users:1}}:data.action==='detail'?{code:0,data:(dbData[data.collection]||[])[0]||{}}:{code:0,data:dbData[data.collection]||[],total:1}):{code:-1,message:'Unexpected function '+name}}),database:()=>({collection(name){let single=false;const q={doc(){single=true;return q},where(){return q},orderBy(){return q},skip(){return q},limit(){return q},get:async()=>({data:single?dbData[name][0]:dbData[name]}),count:async()=>({total:dbData[name].length})};return q}})}
  store.reset();store.setUser(fixtureUser,'openid');store.checkout([{productId:'p1',price:298,name:'测试商品',quantity:1}],'direct')
  const root=path.resolve(__dirname,'..'),app=JSON.parse(fs.readFileSync(path.join(root,'app.json')));let captured;global.Page=d=>captured=d
  try{for(const route of app.pages){delete require.cache[require.resolve(path.join(root,route+'.js'))];require(path.join(root,route+'.js'));const p=mount(captured),original=p.load;p.load=function(work){this.pending=original.call(this,work);return this.pending};p.onLoad({id:route.includes('address')?'a1':route.includes('order')?'o1':'p1'});if(p.pending)await p.pending;assert.equal(p.data.error,'',route);assert.equal(p.data.loading,false,route);p.onUnload()}}
  finally{config.cloudEnv=oldEnv;delete wx.cloud;delete global.Page}
})
test('cloud adapter distinguishes business rejection from uncertain transport failure',async()=>{
  const config=require('../config/index'),oldEnv=config.cloudEnv;config.cloudEnv='fixture-env';const client=require('../services/client')
  try{wx.cloud={callFunction:async()=>({result:{code:-1,message:'余额不足'}})};await assert.rejects(client.call('createOrder',{},true),e=>e.business===true&&e.message==='余额不足');wx.cloud.callFunction=async()=>{throw {errMsg:'network fail'}};await assert.rejects(client.call('createOrder',{},true),e=>!e.business&&/网络/.test(e.message))}finally{config.cloudEnv=oldEnv;delete wx.cloud}
})
test('page refresh settles native refresh indicator even when fetch fails',async()=>{
  let stops=0;const old=wx.stopPullDownRefresh;wx.stopPullDownRefresh=()=>stops++
  try{const p=mount(listPage({fetch:async()=>{throw Error('离线')}}));await p.onPullDownRefresh();assert.equal(stops,1);assert.equal(p.data.error,'离线');assert.equal(p.data.loading,false)}finally{wx.stopPullDownRefresh=old}
})
