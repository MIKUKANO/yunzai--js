import plugin from '../../lib/plugins/plugin.js'

//默认只回好友赞
const onlyLikeFriends = true

export class AutoLike extends plugin {
  constructor() {
    super({
      name: '互赞插件',
      dsc: '自动回赞',
      event: 'notice',
      priority: 1000
    })
  }

  async accept() {
    const e = this.e
    if (e.sub_type !== 'profile_like') return false
    const uid = e.operator_id
    const times = e.times || 1
    if (!uid) return false

    if (onlyLikeFriends) {
      try {
        const res = await e.bot.sendApi('get_friend_list')
        if (res.retcode !== 0) {
          logger.error('[互赞插件] 获取好友列表失败')
          return false
        }
        const friendList = res.data || []
        const isFriend = friendList.some(friend => friend.user_id === uid)
        if (!isFriend) {
          logger.mark(`[互赞插件] 跳过非好友：${uid}`)
          return false
        }
      } catch (err) {
        logger.error(`[互赞插件] 获取好友列表异常：${uid}`, err)
        return false
      }
    }

    try {
      const res = await e.bot.sendApi('send_like', {
        user_id: uid,
        times
      })
      if (res.retcode === 0) {
        logger.mark(`[互赞插件] 已成功回赞 ${uid} × ${times} 次`)
      } else {
        logger.warn(`[互赞插件] 回赞失败：${uid}（retcode=${res.retcode}）`)
      }
    } catch (err) {
      logger.error(`[互赞插件] 回赞异常：${uid}`, err)
    }
    return true
  }
}