const config = require('../config/index')
function ensureCloud() {
  if (!wx.cloud) throw new Error('当前微信版本暂不支持，请更新微信后重试')
  if (!config.cloudEnv || /xxx|your-/.test(config.cloudEnv)) throw new Error('店铺暂未连接，请稍后再试')
}
function readable(err) {
  if (err instanceof Error && !err.errMsg) return err
  const text = (err && (err.errMsg || err.message)) || ''
  if (/permission|denied|auth/i.test(text)) return new Error('暂无访问权限，请重新登录或联系店铺')
  return new Error('网络连接失败，请检查网络后重试')
}
async function request(factory, timeout = true) {
  let timer
  try {
    ensureCloud()
    const task = factory()
    if (!timeout) return await task
    return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('连接超时，请重试')), config.requestTimeout) })])
  } catch (err) { throw readable(err) } finally { clearTimeout(timer) }
}
function call(name, payload = {}, write = false) {
  return request(async () => {
    const res = await wx.cloud.callFunction({ name, data: payload })
    if (!res.result || res.result.code !== 0) {
      const error = new Error((res.result && res.result.message) || '服务暂不可用，请稍后重试')
      error.business = true
      throw error
    }
    return res.result
  }, !write)
}
function database(work, write = false) { return request(() => work(wx.cloud.database()), !write) }
module.exports = { call, database }
