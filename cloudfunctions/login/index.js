// 云函数入口文件 - login
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()

    let user = null

    if (userRes.data.length === 0) {
      // 新用户，创建记录
      const newUser = {
        _openid: openid,
        nickName: event.nickName || '',
        avatarUrl: event.avatarUrl || '',
        phone: '',
        balance: 0,
        points: 0,
        level: 1,
        createdAt: db.serverDate()
      }
      const createRes = await db.collection('users').add({
        data: newUser
      })
      user = { ...newUser, _id: createRes._id }
    } else {
      user = userRes.data[0]

      // 如果传了新的用户信息，更新
      if (event.nickName || event.avatarUrl) {
        const updateData = {}
        if (event.nickName) updateData.nickName = event.nickName
        if (event.avatarUrl) updateData.avatarUrl = event.avatarUrl

        await db.collection('users').doc(user._id).update({
          data: updateData
        })
        user = { ...user, ...updateData }
      }
    }

    return {
      code: 0,
      openid: openid,
      user: user,
      isAdmin: user.role === 'admin'
    }
  } catch (err) {
    console.error('login error:', err)
    return {
      code: -1,
      message: err.message
    }
  }
}
