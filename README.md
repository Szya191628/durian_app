# 榴夏来榴莲生鲜 · 原生微信小程序

榴莲在线零售前端，包含 17 个页面、13 个公共组件、统一 services 与轻量 store。

## 开发

在微信开发者工具中导入项目根目录。配置真实 AppID（project.config.json）及云环境（config/index.js），按实际云端规则部署现有 cloudfunctions。根目录没有运行时第三方依赖。

```sh
npm run check
npm test
```

默认关闭模拟支付与测试充值；不会在连接失败时悄悄切换到虚构数据。AppID 与云环境目前仍需店铺配置。

详细的需求分析、页面设计、项目目录、模块说明、联调方法、验证范围和扩展建议见 [docs/FRONTEND.md](docs/FRONTEND.md)。

## 当前支付与权限口径

- 支付为线下确认收款：`config.payMode = 'offline'`。下单后订单进入「待收款」，由店铺在管理端订单详情点「确认收款」后进入「待发货」。云函数已不再接受 `mock` 支付参数，前端也没有模拟支付入口。
- 余额只能由管理员录入：店铺工作台 → 余额充值（按昵称/手机号查找用户后手动入账）。用户侧已移除自助充值，`updateUser` 云函数不再开放充值分支。
- 管理端写操作全部经 `admin` 云函数，服务端校验 `users.role === 'admin'`，不再由客户端直连数据库。
- 微信支付接入点集中在 `services/payment.js` 与 `config.wxpay`。商户号 `1003362618`（芸南榴莲来鲜果店）已作为默认值写入 `config.wxpay.subMchId`；云开发控制台绑定该商户号后，把 `payMode` 改为 `wxpay`、`wxpay.enabled` 改为 `true` 即可启用，页面与订单逻辑无需改动。云函数 `payOrder`（统一下单）与 `payCallback`（回调落账、金额校验、幂等）已就绪。

仍待完成：真机支付验收、下单幂等（防重复提交）。

**部署提醒**：本次新增 `cloudfunctions/admin`、`cloudfunctions/payOrder`、`cloudfunctions/payCallback`，需在微信开发者工具中分别执行「上传并部署：云端安装依赖」。未部署 `admin` 时管理端所有功能会返回「未知操作」；未部署 `payOrder` 时微信支付无法发起。

