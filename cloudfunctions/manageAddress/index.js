// 云函数入口文件 - manageAddress
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, address, addressId } = event

  try {
    switch (action) {
      case 'list': {
        // 获取地址列表
        const res = await db.collection('addresses').where({
          _openid: openid
        }).orderBy('isDefault', 'desc').orderBy('createdAt', 'desc').get()
        return { code: 0, data: res.data }
      }

      case 'add': {
        // 新增地址
        if (!address.name || !address.phone || !address.detail) {
          return { code: -1, message: '请填写完整地址信息' }
        }

        // 如果设为默认，先取消其他默认
        if (address.isDefault) {
          await db.collection('addresses').where({
            _openid: openid,
            isDefault: true
          }).update({ data: { isDefault: false } })
        }

        const res = await db.collection('addresses').add({
          data: {
            _openid: openid,
            name: address.name,
            phone: address.phone,
            province: address.province || '',
            city: address.city || '',
            district: address.district || '',
            detail: address.detail,
            isDefault: address.isDefault || false,
            createdAt: db.serverDate()
          }
        })
        return { code: 0, addressId: res._id, message: '添加成功' }
      }

      case 'update': {
        // 更新地址
        if (!addressId) return { code: -1, message: '地址ID不能为空' }
        // [FIXED] 权限校验：验证地址归属
        if (!address || !address.name || !address.phone || !address.detail) {
          return { code: -1, message: '请填写完整地址信息' }
        }
        const updateAddr = await db.collection('addresses').doc(addressId).get()
        if (updateAddr.data._openid !== openid) {
          return { code: -1, message: '无权操作此地址' }
        }

        // 如果设为默认，先取消其他默认
        if (address.isDefault) {
          await db.collection('addresses').where({
            _openid: openid,
            isDefault: true,
            _id: db.command.neq(addressId)
          }).update({ data: { isDefault: false } })
        }

        await db.collection('addresses').doc(addressId).update({
          data: {
            name: address.name,
            phone: address.phone,
            province: address.province || '',
            city: address.city || '',
            district: address.district || '',
            detail: address.detail,
            isDefault: address.isDefault || false
          }
        })
        return { code: 0, message: '更新成功' }
      }

      case 'delete': {
        // 删除地址
        if (!addressId) return { code: -1, message: '地址ID不能为空' }
        // [FIXED] 权限校验
        const deleteAddr = await db.collection('addresses').doc(addressId).get()
        if (deleteAddr.data._openid !== openid) {
          return { code: -1, message: '无权操作此地址' }
        }
        await db.collection('addresses').doc(addressId).remove()
        return { code: 0, message: '删除成功' }
      }

      case 'setDefault': {
        // 设为默认地址
        if (!addressId) return { code: -1, message: '地址ID不能为空' }
        // [FIXED] 权限校验
        const defaultAddr = await db.collection('addresses').doc(addressId).get()
        if (defaultAddr.data._openid !== openid) {
          return { code: -1, message: '无权操作此地址' }
        }
        await db.collection('addresses').where({
          _openid: openid,
          isDefault: true
        }).update({ data: { isDefault: false } })

        await db.collection('addresses').doc(addressId).update({
          data: { isDefault: true }
        })
        return { code: 0, message: '设置成功' }
      }

      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    console.error('manageAddress error:', err)
    return { code: -1, message: err.message }
  }
}
