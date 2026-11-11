const test = require('node:test')
const assert = require('node:assert/strict')

function makeWx() {
  return {
    getStorageSync() { return [] },
    setStorageSync() {},
    setTabBarBadge() {},
    removeTabBarBadge() {},
    showToast() {},
    stopPullDownRefresh() {},
    navigateTo() {},
    switchTab() {},
    navigateBack() {},
    getWindowInfo() { return { windowWidth: 375, statusBarHeight: 20 } },
    getMenuButtonBoundingClientRect() { return { top: 38, height: 32, left: 300 } }
  }
}

function loadPage(route, options = {}) {
  const oldPage = global.Page
  const oldWx = global.wx
  const oldApp = global.getApp
  let definition
  global.Page = value => { definition = value }
  global.wx = makeWx()
  global.getApp = () => ({})
  const file = require.resolve('../' + route + '.js')
  delete require.cache[file]
  require(file)
  assert.ok(definition, `Page() was not called for ${route}`)
  const page = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), _alive: true, _version: 0 }
  page.setData = patch => {
    for (const [key, value] of Object.entries(patch)) {
      const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.')
      let target = page.data
      for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]]
      target[parts.at(-1)] = value
    }
  }
  try {
    page.onLoad(options)
    return page
  } finally {
    global.Page = oldPage
    global.wx = oldWx
    global.getApp = oldApp
  }
}

test('home startup does not throw and reaches an explicit state', async () => {
  const page = loadPage('pages/home/home')
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(page.data.loading, false)
  assert.ok(page.data.error || Array.isArray(page.data.items))
})

test('developer-tool compatibility keeps component injection eager', () => {
  const app = require('../app.json')
  assert.notEqual(app.lazyCodeLoading, 'requiredComponents', 'requiredComponents can leave custom-component pages blank in DevTools')
})

test('app configuration is loadable by the WeChat runtime', () => {
  const config = require('../config/index')
  assert.equal(typeof config.cloudEnv, 'string')
  assert.equal(typeof config.pageSize, 'number')
})

test('app bootstrap registers without a JSON module error', () => {
  const oldApp = global.App
  const oldWx = global.wx
  let definition
  global.App = value => { definition = value }
  global.wx = makeWx()
  const file = require.resolve('../app.js')
  delete require.cache[file]
  try {
    assert.doesNotThrow(() => require(file))
    assert.equal(typeof definition.onLaunch, 'function')
  } finally {
    global.App = oldApp
    global.wx = oldWx
  }
})

test('mine template guards optional user fields before login', () => {
  const fs = require('node:fs')
  const wxml = fs.readFileSync(require.resolve('../pages/mine/mine.wxml'), 'utf8')
  assert.match(wxml, /wx:if="\{\{user && user\.avatarUrl\}\}"/)
  assert.match(wxml, /wx:if="\{\{user && user\.role === 'admin'\}\}"/)
})
