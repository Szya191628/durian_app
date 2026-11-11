const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm')
const root=path.resolve(__dirname,'..')
const all=[]
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else all.push(file)}}
walk(root)
let errors=[]
for(const file of all){
  const ext=path.extname(file)
  try{
    const content=['.js','.json','.wxml','.wxss'].includes(ext)?fs.readFileSync(file,'utf8'):''
    if(ext==='.js')new vm.Script(content,{filename:file})
    if(ext==='.json')JSON.parse(content)
    if(ext==='.js' && !file.includes('cloudfunctions')){
      for(const [,target] of content.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)){
        const base=path.resolve(path.dirname(file),target)
        if(![base,base+'.js',base+'.json',path.join(base,'index.js')].some(p=>fs.existsSync(p)))errors.push(`Missing require: ${file} -> ${target}`)
      }
    }
    if(ext==='.wxss'){
      if((content.match(/{/g)||[]).length!==(content.match(/}/g)||[]).length)errors.push('Unbalanced stylesheet: '+file)
      for(const [,target] of content.matchAll(/@import\s+['"]([^'"]+)['"]/g))if(!fs.existsSync(path.resolve(path.dirname(file),target)))errors.push('Missing style import: '+target)
    }
  }catch(err){errors.push(`${file}: ${err.message}`)}
}
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json')))
for(const route of app.pages){
  for(const ext of ['js','json','wxml','wxss'])if(!fs.existsSync(path.join(root,route+'.'+ext)))errors.push('Missing route file: '+route+'.'+ext)
  const config=JSON.parse(fs.readFileSync(path.join(root,route+'.json')))
  for(const [name,target] of Object.entries(config.usingComponents||{}))for(const ext of ['js','json','wxml','wxss'])if(!fs.existsSync(path.join(root,target+'.'+ext)))errors.push('Missing component: '+name+': '+ext)
  const source=fs.readFileSync(path.join(root,route+'.wxml'),'utf8')
  const custom=new Set([...source.matchAll(/<([a-z][\w]*-[\w-]+)/g)].map(m=>m[1]))
  const native=new Set(['scroll-view','swiper-item','rich-text','cover-view','cover-image','checkbox-group','radio-group'])
  custom.forEach(tag=>{if(!native.has(tag)&&!config.usingComponents[tag])errors.push('Undeclared component '+tag+' in '+route)})
  if(/wx\.cloud/.test(fs.readFileSync(path.join(root,route+'.js'),'utf8')))errors.push('Cloud access outside services: '+route)
}
for(const tab of app.tabBar.list)for(const key of ['iconPath','selectedIconPath'])if(!fs.existsSync(path.join(root,tab[key])))errors.push('Missing tab icon: '+tab[key])
const pageRoutes=new Set(app.pages)
for(const file of all.filter(p=>/\.(js|wxml)$/.test(p)&&!p.includes('cloudfunctions')&&!p.includes('tests'))){
  const source=fs.readFileSync(file,'utf8')
  for(const [,route]of source.matchAll(/['"]\/(pages\/[a-z-]+(?:\/[a-z-]+){1,2})(?:\?|['"])/g))if(!pageRoutes.has(route))errors.push('Unknown route in '+file+': '+route)
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`PASS: ${app.pages.length} routes; JS syntax, JSON, local imports, components, styles, navigation and tab assets.`)
