// 云函数入口文件 - initData
// 初始化示例数据（仅首次部署时运行一次）
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function isMissingCollection(err) {
  const message = err && (err.message || err.errMsg || '')
  return /ResourceNotFound|Db or Table does not exist|collection.*(?:not|does not) exist/i.test(message)
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get()
  } catch (err) {
    if (!isMissingCollection(err)) throw err
    await db.createCollection(name)
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    for (const name of ['categories', 'users', 'products']) await ensureCollection(name)

    // [FIXED] 防止重复初始化：检查分类是否已存在
    let existingCats = { data: [] }
    try {
      existingCats = await db.collection('categories').limit(1).get()
    } catch (err) {
      if (!isMissingCollection(err)) throw err
    }
    if (existingCats.data.length > 0) {
      return { code: -1, message: '数据已初始化，请勿重复执行' }
    }

    // 设置管理员（将当前用户设为管理员）
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    // 查找当前用户并设置为管理员
    let userRes = { data: [] }
    try {
      userRes = await db.collection('users').where({
        _openid: openid
      }).get()
    } catch (err) {
      if (!isMissingCollection(err)) throw err
    }

    if (userRes.data.length > 0) {
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: { role: 'admin' }
      })
    } else {
      // 创建管理员用户
      await db.collection('users').add({
        data: {
          _openid: openid,
          nickName: '管理员',
          avatarUrl: '',
          phone: '',
          balance: 0,
          points: 0,
          level: 1,
          role: 'admin',
          createdAt: db.serverDate()
        }
      })
    }

    // 初始化分类
    const categories = [
      { name: '猫山王', icon: '', sort: 1 },
      { name: '金枕', icon: '', sort: 2 },
      { name: '干尧', icon: '', sort: 3 },
      { name: '黑刺', icon: '', sort: 4 },
      { name: '托曼尼', icon: '', sort: 5 },
      { name: '整果专区', icon: '', sort: 6 }
    ]

    for (const cat of categories) {
      await db.collection('categories').add({ data: cat })
    }

    // 初始化商品
    const products = [
      {
        name: '猫山王整果',
        category: 'musang_king',
        categoryName: '猫山王',
        price: 298,
        originalPrice: 358,
        unit: '个',
        spec: '3-4斤/个',
        images: [],
        description: '马来西亚进口猫山王，果肉金黄，浓郁奶香，口感细腻绵密，被誉为"榴莲之王"。',
        stock: 50,
        sales: 120,
        status: 1,
        sort: 1,
        createdAt: db.serverDate()
      },
      {
        name: '猫山王果肉',
        category: 'musang_king',
        categoryName: '猫山王',
        price: 168,
        originalPrice: 198,
        unit: '盒',
        spec: '400g/盒',
        images: [],
        description: '精选猫山王果肉，冷冻锁鲜，解冻即食，浓郁香甜。',
        stock: 100,
        sales: 256,
        status: 1,
        sort: 2,
        createdAt: db.serverDate()
      },
      {
        name: '金枕整果',
        category: 'golden_pillow',
        categoryName: '金枕',
        price: 158,
        originalPrice: 198,
        unit: '个',
        spec: '4-5斤/个',
        images: [],
        description: '泰国进口金枕榴莲，果肉饱满，甜度高，性价比之王。',
        stock: 80,
        sales: 320,
        status: 1,
        sort: 3,
        createdAt: db.serverDate()
      },
      {
        name: '金枕果肉',
        category: 'golden_pillow',
        categoryName: '金枕',
        price: 88,
        originalPrice: 108,
        unit: '盒',
        spec: '500g/盒',
        images: [],
        description: '金枕榴莲果肉，冷冻锁鲜，甜糯可口，老少皆宜。',
        stock: 150,
        sales: 580,
        status: 1,
        sort: 4,
        createdAt: db.serverDate()
      },
      {
        name: '干尧整果',
        category: 'kanyao',
        categoryName: '干尧',
        price: 388,
        originalPrice: 458,
        unit: '个',
        spec: '3-4斤/个',
        images: [],
        description: '泰国干尧榴莲，产量稀少，口感独特，果肉厚实，甜中带苦。',
        stock: 30,
        sales: 65,
        status: 1,
        sort: 5,
        createdAt: db.serverDate()
      },
      {
        name: '黑刺整果',
        category: 'black_thorn',
        categoryName: '黑刺',
        price: 458,
        originalPrice: 528,
        unit: '个',
        spec: '3-4斤/个',
        images: [],
        description: '马来西亚黑刺榴莲，果壳带黑色尖刺，果肉橙红，味道浓烈。',
        stock: 20,
        sales: 38,
        status: 1,
        sort: 6,
        createdAt: db.serverDate()
      },
      {
        name: '托曼尼整果',
        category: 'thongmanoi',
        categoryName: '托曼尼',
        price: 228,
        originalPrice: 268,
        unit: '个',
        spec: '3-4斤/个',
        images: [],
        description: '泰国托曼尼榴莲，小巧玲珑，果肉金黄，甜度极高。',
        stock: 60,
        sales: 95,
        status: 1,
        sort: 7,
        createdAt: db.serverDate()
      },
      {
        name: '混合装尝鲜盒',
        category: 'mixed',
        categoryName: '整果专区',
        price: 128,
        originalPrice: 168,
        unit: '盒',
        spec: '300g/盒（3种口味）',
        images: [],
        description: '猫山王+金枕+干尧三种口味混合装，一次尝遍经典。',
        stock: 200,
        sales: 450,
        status: 1,
        sort: 8,
        createdAt: db.serverDate()
      }
    ]

    for (const product of products) {
      await db.collection('products').add({ data: product })
    }

    return {
      code: 0,
      message: '数据初始化成功',
      categories: categories.length,
      products: products.length
    }
  } catch (err) {
    console.error('initData error:', err)
    return {
      code: -1,
      message: err.message
    }
  }
}
