import { pathToFileURL } from 'node:url'
import { readJson, write } from './io.mjs'

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))
const hour = minutes => minutes === null || minutes === undefined ? '—' : (minutes / 60).toFixed(1)
const time = value => value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date(value)) : '尚未采集'
const status = p => ({ local: '本机记录', synced: '已连接', stale: '更新中断', pending: '待连接' }[p?.status] || '待连接')
function shorten(text, max = 38) {
  let width = 0, result = ''
  for (const c of text) { width += c.charCodeAt(0) > 255 ? 2 : 1; if (width > max) return result + '…'; result += c }
  return result
}
const text = (x, y, content, size = 16, fill = '#f2eadb', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(content)}</text>`

export function renderSvg(data) {
  const steam = data.platforms.steam
  const games = steam.games.slice(0, 5)
  const total = steam.games.reduce((sum, g) => sum + (g.recentMinutes || 0), 0)
  const connected = ['psn', 'switch'].filter(key => data.platforms[key].collectedAt)
  const height = 300 + Math.max(games.length, 1) * 76 + connected.length * 112
  const max = Math.max(1, ...games.map(g => g.recentMinutes || 0))
  const rows = games.map((g, index) => {
    const y = 218 + index * 76, width = Math.max(2, (g.recentMinutes || 0) / max * 570)
    return `<g><title>${escape(g.title)} · 近两周 ${hour(g.recentMinutes)} 小时 · 累计 ${hour(g.totalMinutes)} 小时</title>
      ${text(36, y, shorten(g.title, 58), 20)}
      ${text(884, y, `${hour(g.recentMinutes)} h`, 23, '#91d2be', 'text-anchor="end" font-weight="650"')}
      <rect x="36" y="${y + 16}" width="570" height="6" rx="3" fill="#243941"/>
      <rect x="36" y="${y + 16}" width="${width}" height="6" rx="3" fill="${index ? '#699e92' : '#a1dcca'}"/>
      ${text(884, y + 25, `累计 ${hour(g.totalMinutes)} h`, 13, '#9baeb3', 'text-anchor="end"')}</g>`
  }).join('\n')
  const platforms = connected.map((key, index) => {
    const p = data.platforms[key], y = 240 + Math.max(games.length, 1) * 76 + index * 112
    const name = key === 'psn' ? 'PLAYSTATION' : 'NINTENDO SWITCH'
    const detail = key === 'psn' ? `${p.games.length} 个已玩游戏${p.trophies?.platinum != null ? ` · ${p.trophies.platinum} 个白金` : ''}` : '最近观测到的游戏'
    return `${text(36, y, name, 14, '#a0c3bd', 'letter-spacing="2"')}
      ${text(884, y, detail, 14, '#b0c0c2', 'text-anchor="end"')}
      ${text(36, y + 31, shorten(p.games[0]?.title || '暂无游戏记录', 66), 21)}
      ${text(36, y + 56, `采集于 ${time(p.collectedAt)} · ${status(p)}`, 12, '#9baeb3')}`
  }).join('\n')
  const badges = ['steam', 'psn', 'switch'].map((key, index) => {
    const x = 36 + index * 294, p = data.platforms[key]
    return `<circle cx="${x + 5}" cy="${height - 51}" r="4" fill="${p.status === 'synced' ? '#96d4ba' : p.status === 'local' ? '#e3bc76' : '#607a85'}"/>
      ${text(x + 18, height - 45, `${{ steam: 'Steam', psn: 'PlayStation', switch: 'Switch' }[key]} · ${status(p)}`, 16, '#d7e1df')}`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="${height}" viewBox="0 0 920 ${height}" role="img" aria-labelledby="title desc">
    <title id="title">Llugaes 的游戏记录</title>
    <desc id="desc">Steam 近两周 ${hour(total)} 小时，${steam.games.length} 个游戏；${status(steam)}，采集于 ${escape(time(steam.collectedAt))}。PlayStation ${status(data.platforms.psn)}，Switch ${status(data.platforms.switch)}。</desc>
    <rect width="920" height="${height}" rx="18" fill="#132832"/>
    <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Microsoft YaHei,sans-serif">
      ${text(36, 47, 'PLAYER LOG', 15, '#a0c3bd', 'letter-spacing="3"')}
      ${text(36, 95, '最近在玩', 32, '#f2eadb', 'font-weight="650"')}
      ${text(36, 125, `${steam.games.length} 个游戏 · Steam 近两周记录`, 16, '#b0c0c2')}
      ${text(884, 98, steam.collectedAt ? `${hour(total)} h` : '—', 48, '#a1dcca', 'text-anchor="end" font-weight="650"')}
      ${text(884, 130, `${status(steam)} · ${time(steam.collectedAt)}`, 13, '#b0c0c2', 'text-anchor="end"')}
      <path d="M36 159H884" stroke="#30454c"/>
      ${rows || text(36, 225, steam.collectedAt ? '这两周暂时没有游玩记录。' : '游戏记录等待连接。', 20, '#b0c0c2')}
      ${platforms}
      <path d="M36 ${height - 85}H884" stroke="#30454c"/>
      ${badges}
      ${text(36, height - 18, '时长按平台记录；各平台独立统计。完整记录与数据说明 ↗', 12, '#9baeb3')}
    </g>
  </svg>\n`.replace(/[ \t]+$/gm, '')
}

function md(value) { return String(value).replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
export function renderMarkdown(data) {
  let result = '# 游戏记录\n\n[返回主页](https://github.com/Llugaes) · [连接设置](./SETUP.md)\n\n'
  for (const [key, p] of Object.entries(data.platforms)) {
    result += `## ${{ steam: 'Steam', psn: 'PlayStation', switch: 'Nintendo Switch' }[key]}\n\n${status(p)} · 数据时间：${time(p.collectedAt)}（北京时间）\n\n`
    if (!p.collectedAt) { result += '尚未连接，不将缺失数据记为 0。\n\n'; continue }
    result += key === 'steam' ? (p.source === 'steam-api'
      ? '近两周数据来自 Steam Web API 的滚动窗口，窗口移动时数字也可能减少。已排除 DSX 和 Wallpaper Engine。\n\n'
      : '近两周数据来自最近一次本机快照，缓存可能不完整。已排除 DSX 和 Wallpaper Engine。\n\n')
      : key === 'switch' ? '仅列出采集时观测到的游戏；时长可能为平台近似值，不代表完整历史。\n\n' : 'PSN 返回的已玩游戏与累计时长。不同版本独立记录。\n\n'
    if (p.status === 'stale') result += '**最近同步失败，以下保留上次成功结果。**\n\n'
    if (p.trophies) result += `白金 ${p.trophies.platinum ?? '—'} · 金 ${p.trophies.gold ?? '—'} · 银 ${p.trophies.silver ?? '—'} · 铜 ${p.trophies.bronze ?? '—'}\n\n`
    result += '| 游戏 | 近两周 / 小时 | 累计 / 小时 |\n| :--- | ---: | ---: |\n'
    result += p.games.map(g => `| ${md(g.title)} | ${hour(g.recentMinutes)} | ${hour(g.totalMinutes)} |`).join('\n') + '\n\n'
  }
  result += '## 后续游玩增量\n\n从开始采集以后，对相同游戏的累计时长求差。跨日或离线补报保留整个采集区间，不虚构每天的精确时长。首次出现、数据回退或更换来源会重新建立基线。不同平台不相加为实际在线时间。\n\n'
  const intervals = data.intervals.filter(i => i.minutes > 0).slice(-30).reverse()
  if (!intervals.length) result += '正在建立基线，尚无可比较的新增记录。\n'
  else result += '| 平台 | 采集区间（北京时间） | 新增小时 |\n| :--- | :--- | ---: |\n' + intervals.map(i => `| ${i.platform} | ${time(i.from)} → ${time(i.to)} | ${hour(i.minutes)} |`).join('\n') + '\n'
  return result
}

export async function renderFiles(data) {
  await write('assets/player-log.svg', renderSvg(data))
  await write('docs/ACTIVITY.md', renderMarkdown(data))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await renderFiles(await readJson('data/activity.json'))
