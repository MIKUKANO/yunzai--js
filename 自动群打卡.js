import schedule from 'node-schedule'

// 自定义时间
const SECOND = 0    // 秒，0~59
const MINUTE = 0   // 分，0~59
const HOUR = 0      // 时，0~23

// 拼接 cron 表达式：秒 分 时 * * *
const cronTime = `${SECOND} ${MINUTE} ${HOUR} * * *`

schedule.scheduleJob(cronTime, async () => {
  logger.mark(`[自动群打卡] 定时任务触发，时间：${cronTime}`)

  try {
    const res = await Bot.sendApi('get_group_list')
    if (res?.retcode !== 0 || !Array.isArray(res.data)) {
      logger.error('[自动群打卡] 获取群列表失败：', res)
      return
    }

    for (const group of res.data) {
      const group_id = group.group_id
      if (!group_id) continue

      const result = await Bot.sendApi('send_group_sign', { group_id })

      if (result?.retcode === 0) {
        logger.mark(`[打卡成功] 群 ${group_id}`)
      } else {
        logger.warn(`[打卡失败] 群 ${group_id}`, result)
      }

      await new Promise(r => setTimeout(r, 1000)) // 防风控
    }

    logger.mark('[自动群打卡] 所有群打卡完成')

  } catch (err) {
    logger.error('[自动群打卡] 出现异常：', err)
  }
})