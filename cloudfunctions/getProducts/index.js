// 云函数入口文件 - getProducts
// [FIXED] 修复 where() 覆盖 bug + 正则注入 + 分页校验
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 转义正则特殊字符
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 云函数入口函数
exports.main = async (event, context) => {
  // [FIXED] 分页参数校验
  const { category, keyword } = event
  const page = Math.max(1, parseInt(event.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(event.pageSize) || 20))

  try {
    // [FIXED] 构建单一 where 条件，避免覆盖
    const whereCondition = { status: 1 }

    // 按分类筛选
    if (category && category !== 'all') {
      whereCondition.category = category
    }

    // 关键词搜索（转义正则特殊字符）
    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      whereCondition.name = db.RegExp({
        regexp: escapeRegExp(keyword.trim()),
        options: 'i'
      })
    }

    const query = db.collection('products').where(whereCondition)

    // 分页
    const skip = (page - 1) * pageSize
    const res = await query
      .orderBy('sort', 'asc')
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    // 获取总数
    const countRes = await query.count()

    return {
      code: 0,
      data: res.data,
      total: countRes.total,
      page: page,
      pageSize: pageSize
    }
  } catch (err) {
    console.error('getProducts error:', err)
    return {
      code: -1,
      message: '获取商品列表失败'
    }
  }
}
