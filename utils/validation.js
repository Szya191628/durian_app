function product(form, categories, index) {
  const errors={}
  if(!form.name.trim()) errors.name='请填写商品名称'
  if(!/^\d+(\.\d{1,2})?$/.test(String(form.price)) || Number(form.price)<=0 || Number(form.price)>999999) errors.price='请输入大于 0 且不超过 999999 的价格，最多两位小数'
  if(form.originalPrice!=='' && (!/^\d+(\.\d{1,2})?$/.test(String(form.originalPrice)) || Number(form.originalPrice)<Number(form.price))) errors.originalPrice='划线价不能低于售价，最多两位小数'
  if(!/^\d+$/.test(String(form.stock)) || Number(form.stock)>999999) errors.stock='库存必须为 0 至 999999 的整数'
  if(!/^-?\d+$/.test(String(form.sort))) errors.sort='排序必须为整数'
  if(!categories[index]) errors.category='请选择商品分类'
  if(!form.spec.trim()) errors.spec='请填写商品规格'
  if(!form.unit.trim()) errors.unit='请填写销售单位'
  return errors
}
module.exports={product}
