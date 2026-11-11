const config = require('./config/index')
const store = require('./store/index')
App({
  onLaunch() {
    if (wx.cloud && config.cloudEnv && !/xxx|your-/.test(config.cloudEnv)) wx.cloud.init({ env: config.cloudEnv, traceUser: true })
    store.hydrate()
  },
  onShow() { store.badge() }
})
