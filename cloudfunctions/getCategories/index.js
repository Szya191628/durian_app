// 云函数入口文件 - getCategories
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const res = await db.collection('categories')
      .orderBy('sort', 'asc')
      .get()

    return {
      code: 0,
      data: res.data
    }
  } catch (err) {
    console.error('getCategories error:', err)
    return {
      code: -1,
      message: err.message
    }
  }
}
