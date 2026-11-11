// 云函数入口文件 - updateUser
// 注意：余额只能由 admin 云函数（管理员）写入。此函数不接受任何充值类操作，
// 避免用户自助增加余额。
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, nickName, avatarUrl } = event

  try {
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    if (userRes.data.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    const user = userRes.data[0]

    switch (action) {
      case 'getInfo': {
        return { code: 0, data: user }
      }

      case 'updateProfile': {
        const patch = {}
        if (nickName) patch.nickName = String(nickName).slice(0, 40)
        if (avatarUrl) patch.avatarUrl = String(avatarUrl)
        if (!Object.keys(patch).length) return { code: -1, message: '没有需要更新的资料' }
        await db.collection('users').doc(user._id).update({ data: patch })
        return { code: 0, data: { ...user, ...patch } }
      }

      default:
        // 充值等敏感操作不在本函数开放
        return { code: -1, message: '不支持的操作' }
    }
  } catch (err) {
    console.error('updateUser error:', err)
    return { code: -1, message: '获取账户信息失败，请稍后重试' }
  }
}
