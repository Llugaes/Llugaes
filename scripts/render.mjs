import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { readJson, write, root } from './io.mjs'
import { ensureCovers } from './covers.mjs'
import { renderSvg as renderCard, hours as hour, statusText as status } from './card.mjs'
const time = value => value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date(value)) : '尚未采集'

function md(value) { return String(value).replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
export function renderMarkdown(data) {
  let result = '# 游戏记录\n\n[返回主页](https://github.com/Llugaes) · [连接设置](./SETUP.md)\n\n'
  for (const [key, p] of Object.entries(data.platforms)) {
    result += `## ${{ steam: 'Steam', psn: 'PlayStation', switch: 'Nintendo Switch' }[key]}\n\n${status(p)} · 数据时间：${time(p.collectedAt)}（北京时间）\n\n`
    if (!p.collectedAt) { result += '尚未连接，不将缺失数据记为 0。\n\n'; continue }
    result += key === 'steam' ? (p.source === 'steam-api'
      ? '近两周数据来自 Steam Web API 的滚动窗口，窗口移动时数字也可能减少。已排除 DSX 和 Wallpaper Engine。\n\n'
      : '近两周数据来自最近一次本机快照，缓存可能不完整。已排除 DSX 和 Wallpaper Engine。\n\n')
      : key === 'switch' ? 'Nintendo Store 返回的游戏历史与近期逐日记录；数据可能延迟到第二天。逐日数据按平台原日期保存。\n\n' : 'PSN 返回的已玩游戏与累计时长。不同版本独立记录。\n\n'
    if (p.status === 'stale') result += '**最近同步失败，以下保留上次成功结果。**\n\n'
    if (p.trophies) result += `白金 ${p.trophies.platinum ?? '—'} · 金 ${p.trophies.gold ?? '—'} · 银 ${p.trophies.silver ?? '—'} · 铜 ${p.trophies.bronze ?? '—'}\n\n`
    result += '| 游戏 | 近两周 / 小时 | 累计 / 小时 |\n| :--- | ---: | ---: |\n'
    result += p.games.map(g => `| ${md(g.title)} | ${hour(g.recentMinutes)} | ${hour(g.totalMinutes)} |`).join('\n') + '\n\n'
    if (key === 'switch' && p.days?.length) result += '### Nintendo 逐日记录\n\n| 日期 | 小时 |\n| :--- | ---: |\n'
      + p.days.slice(-30).reverse().map(day => `| ${day.date} | ${hour(day.minutes)} |`).join('\n') + '\n\n'
  }
  result += '## 后续游玩增量\n\n从开始采集以后，对相同游戏的累计时长求差。跨日或离线补报保留整个采集区间，不虚构每天的精确时长。首次出现、数据回退或更换来源会重新建立基线。不同平台不相加为实际在线时间。\n\n'
  const intervals = data.intervals.filter(i => i.minutes > 0).slice(-30).reverse()
  if (!intervals.length) result += '正在建立基线，尚无可比较的新增记录。\n'
  else result += '| 平台 | 采集区间（北京时间） | 新增小时 |\n| :--- | :--- | ---: |\n' + intervals.map(i => `| ${i.platform} | ${time(i.from)} → ${time(i.to)} | ${hour(i.minutes)} |`).join('\n') + '\n'
  return result
}

export async function renderFiles(data) {
  const covers = await ensureCovers(data)
  const desktop = renderCard(data, covers), mobile = renderCard(data, covers, true)
  await write('assets/player-log.svg', desktop)
  await write('assets/player-log-mobile.svg', mobile)
  await write('docs/ACTIVITY.md', renderMarkdown(data))
  // GitHub 对固定图片 URL 有缓存；只更新卡片的内容版本，保留 README 的其他手工编辑。
  const version = createHash('sha256').update(desktop).update(mobile).digest('hex').slice(0, 12)
  const readme = await readFile(path.join(root, 'README.md'), 'utf8')
  await write('README.md', readme.replace(/(src(?:set)?="\.\/assets\/player-log(?:-mobile)?\.svg)(?:\?v=[a-f0-9]+)?(")/g, `$1?v=${version}$2`))
}
export { renderCard as renderSvg }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await renderFiles(await readJson('data/activity.json'))
