import { appendFile } from 'node:fs/promises'
import { readJson, writeJson } from './io.mjs'
import { collectSteam, collectPsn, collectSwitch } from './collectors.mjs'
import { acceptSnapshot, failedSnapshot, emptyData } from './model.mjs'
import { renderFiles } from './render.mjs'

const config = await readJson('activity.config.json')
const titles = await readJson('data/steam-titles.json')
let data
try { data = await readJson('data/activity.json') } catch (error) {
  if (error.code !== 'ENOENT') throw error
  data = emptyData()
}
const at = new Date().toISOString()
const reports = []
let failures = 0
for (const [platform, collector] of Object.entries({ steam: collectSteam, psn: collectPsn, switch: collectSwitch })) {
  try {
    const current = await collector({ env: process.env, config, titles, at, previous: data.platforms[platform] })
    const { snapshot, interval } = acceptSnapshot(data.platforms[platform], current, platform)
    data.platforms[platform] = snapshot
    if (interval) data.intervals.push(interval)
    reports.push(`${platform}: 已同步 ${snapshot.games.length} 条游戏记录`)
  } catch (error) {
    const snapshot = failedSnapshot(data.platforms[platform], error.code)
    data.platforms[platform] = snapshot
    reports.push(`${platform}: ${snapshot.reason}；保留最后一次有效数据`)
    if (snapshot.reason !== 'missing_secret') failures++
  }
}
data.intervals = data.intervals.filter(i => Date.parse(i.to) >= Date.parse(at) - 366 * 86400000)
await writeJson('data/activity.json', data)
await renderFiles(data)
console.log(reports.join('\n'))
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## 游戏记录同步\n\n${reports.map(r => '- ' + r).join('\n')}\n`, 'utf8')
// 已配置的平台失败要在 Actions 上可见，同时保留本次其他平台的成功数据。
if (failures) process.exitCode = 1
