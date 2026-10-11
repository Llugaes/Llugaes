import { coverKey } from './covers.mjs'
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))
const colors = { ink: '#f2efe5', quiet: '#9db5bf', mint: '#9ce7cc', gold: '#f2d095', line: '#2b444e', panel: '#142d37' }
export const hours = value => value == null ? '—' : value > 0 && value < 6 ? '<0.1' : (value / 60).toFixed(1)
export const dateTime = value => value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) : '尚未连接'
const dateOnly = value => value ? dateTime(value).split(' ')[0] : '日期未知'
export const statusText = p => p.reason === 'auth_required' ? '需要重新授权' : ({ local: '本机记录', synced: '已连接', stale: '更新中断', pending: '待连接' }[p.status] || '待连接')
function short(value, limit) { let n = 0, out = ''; for (const c of String(value)) { n += c.charCodeAt(0) > 255 ? 2 : 1; if (n > limit) return out + '…'; out += c } return out }
const t = (x, y, value, size = 16, color = colors.ink, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`
const box = (x, y, w, h, fill = colors.panel, radius = 14, stroke = colors.line) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`
function cover(covers, key, x, y, w, h, id) {
  const uri = covers[key]
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></clipPath>` + (uri
    ? `<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    : box(x, y, w, h, '#244550', 10) + t(x + w / 2, y + h / 2 + 5, 'GAME', 14, '#9bbdbb', 'text-anchor="middle"'))
}
function dateKey(at) { return new Date(Date.parse(at) + 8 * 3600000).toISOString().slice(0, 10) }
export function activityDays(data) {
  const days = new Map()
  for (const interval of data.intervals) if (interval.minutes > 0 && interval.platform !== 'switch') days.set(dateKey(interval.to), 'observed')
  for (const day of data.platforms.switch.days || []) if (day.minutes > 0) days.set(day.date, 'actual')
  return days
}
function calendar(data, x, y, date) {
  const days = activityDays(data), today = dateKey(date), last = new Date(`${today}T00:00:00Z`)
  const start = new Date(last); start.setUTCDate(start.getUTCDate() - 55 - last.getUTCDay() + 6)
  let svg = ''
  for (let n = 0; n < 56; n++) {
    const day = new Date(start); day.setUTCDate(day.getUTCDate() + n)
    const key = day.toISOString().slice(0, 10), kind = days.get(key), cx = x + Math.floor(n / 7) * 17, cy = y + n % 7 * 17
    const fill = key > today ? '#152e38' : kind === 'actual' ? colors.gold : kind === 'observed' ? colors.mint : '#213a43'
    svg += `<rect x="${cx}" y="${cy}" width="12" height="12" rx="3" fill="${fill}" stroke="${key === today ? '#a0c9bd' : 'none'}"><title>${key} · ${kind === 'actual' ? 'Nintendo 游玩日' : kind === 'observed' ? '发现新增时长的采集日' : '无可确认活动记录'}</title></rect>`
  }
  return svg
}

export function renderSvg(data, covers = {}, mobile = false) {
  const width = mobile ? 440 : 920, steam = data.platforms.steam, games = steam.games.slice(0, 5)
  const total = steam.games.reduce((sum, g) => sum + (g.recentMinutes || 0), 0), focus = games[0]
  const latest = Object.values(data.platforms).map(p => p.collectedAt).filter(Boolean).sort().at(-1) || new Date().toISOString()
  const extra = ['psn', 'switch'].filter(key => data.platforms[key].collectedAt)
  const rowStep = mobile ? 144 : 120
  const height = (mobile ? 1010 : 720) + extra.length * rowStep
  let content = t(24, 38, 'LLUGAES / PLAYER LOG', 13, colors.mint, 'letter-spacing="2"')
  content += t(24, 80, '最近在玩', 31, colors.ink, 'font-weight="700"')
  content += t(width - 24, 78, `${hours(total)} h`, mobile ? 34 : 42, colors.mint, 'text-anchor="end" font-weight="700"')
  content += t(24, 105, 'STEAM · 近两周', 13, colors.quiet)
  content += t(width - 24, 104, `${steam.games.length} 个游戏`, 13, colors.quiet, 'text-anchor="end"')
  const tileW = (width - 64) / 3
  for (const [index, key] of ['steam', 'psn', 'switch'].entries()) {
    const x = 24 + index * (tileW + 8), p = data.platforms[key]
    content += box(x, 127, tileW, 68)
      + `<circle cx="${x + 13}" cy="144" r="3" fill="${p.status === 'synced' ? colors.mint : p.status === 'local' ? colors.gold : '#627f8a'}"/>`
      + t(x + 22, 149, { steam: 'Steam', psn: 'PSN', switch: 'Switch' }[key], 14)
      + t(x + 11, 179, statusText(p), mobile ? 12 : 14, p.status === 'synced' ? colors.mint : colors.quiet)
  }
  const featureW = mobile ? 392 : 408
  content += box(24, 212, featureW, 260, '#122934')
  if (focus) {
    content += cover(covers, coverKey('steam', focus), 34, 222, featureW - 20, 132, 'focus')
      + t(40, 380, '近两周主力', 12, colors.gold)
      + t(40, 407, short(focus.title, mobile ? 35 : 37), 21, colors.ink, 'font-weight="600"')
      + t(40, 447, `${hours(focus.recentMinutes)} h`, 30, colors.mint, 'font-weight="650"')
      + t(featureW + 8, 445, `占近期 ${total ? Math.round(focus.recentMinutes / total * 100) : 0}%`, 13, colors.quiet, 'text-anchor="end"')
  } else content += t(40, 300, '等待游戏记录', 24)
  const listX = mobile ? 24 : 452, listY = mobile ? 490 : 212, listW = mobile ? 392 : 444
  for (const [index, game] of games.slice(1).entries()) {
    const y = listY + index * 67
    content += box(listX, y, listW, 58, '#132c35', 10)
      + cover(covers, coverKey('steam', game), listX + 7, y + 7, 79, 44, `game${index}`)
      + t(listX + 98, y + 22, short(game.title, mobile ? 26 : 31), 14)
      + t(listX + 98, y + 44, `累计 ${hours(game.totalMinutes)} h`, 11, colors.quiet)
      + t(listX + listW - 12, y + 44, `${hours(game.recentMinutes)} h`, 17, colors.mint, 'text-anchor="end" font-weight="600"')
  }
  const baseY = mobile ? 776 : 492
  for (const [index, key] of extra.entries()) {
    const p = data.platforms[key], game = p.games[0], y = baseY + index * rowStep
    const accent = key === 'psn' ? '#a9c8ff' : colors.gold, textX = mobile ? 121 : 145
    content += box(24, y, width - 48, rowStep - 12)
      + cover(covers, game ? coverKey(key, game) : '', 36, y + 12, mobile ? 72 : 92, mobile ? 72 : 84, `platform-${key}`)
      + t(textX, y + 27, key === 'psn' ? 'PLAYSTATION' : 'NINTENDO SWITCH', 12, accent, 'letter-spacing="1"')
      + t(textX, y + 53, short(game?.title || '暂无游戏记录', mobile ? 25 : 48), mobile ? 16 : 19, colors.ink, 'font-weight="600"')
      + t(textX, y + 77, game ? `上次游玩 ${dateOnly(game.lastPlayedAt)} · 累计 ${hours(game.totalMinutes)} h` : '等待平台记录', mobile ? 11 : 13, colors.quiet)
    if (mobile) content += t(40, y + 113, key === 'psn' ? `${p.games.length} 个游戏 · ${p.trophies?.platinum ?? '—'} 白金 / ${p.trophies?.gold ?? '—'} 金 / ${p.trophies?.silver ?? '—'} 银 / ${p.trophies?.bronze ?? '—'} 铜` : `${p.games.length} 个游戏 · 已保留 ${p.days?.length || 0} 天逐日记录`, 12, accent)
    else content += t(width - 40, y + 43, key === 'psn' ? `${p.trophies?.platinum ?? '—'} 白金` : `${p.games.length} 个游戏`, 24, accent, 'text-anchor="end" font-weight="650"')
      + t(width - 40, y + 72, key === 'psn' ? `${p.games.length} 个游戏 · ${p.trophies?.gold ?? '—'} 金 / ${p.trophies?.silver ?? '—'} 银 / ${p.trophies?.bronze ?? '—'} 铜` : `已保留 ${p.days?.length || 0} 天逐日记录`, 12, colors.quiet, 'text-anchor="end"')
  }
  const y = baseY + extra.length * rowStep
  content += box(24, y, width - 48, 183, '#102630')
    + t(40, y + 28, '活动记录', 17, colors.ink, 'font-weight="600"')
    + t(40, y + 48, '近 8 周', 11, colors.quiet)
    + calendar(data, 40, y + 60, latest)
  const infoX = mobile ? 190 : 248
  content += t(infoX, y + 30, '自动同步', 15, colors.mint)
    + t(infoX, y + 54, 'Steam / PSN · 每 2 小时', mobile ? 12 : 14, colors.quiet)
    + t(infoX, y + 76, 'Switch · 每 6 小时', mobile ? 12 : 14, colors.quiet)
  for (const [index, key] of ['steam', 'psn', 'switch'].entries()) {
    const p = data.platforms[key]
    content += t(infoX, y + 108 + index * 22, `${{ steam: 'Steam', psn: 'PSN', switch: 'Switch' }[key]} ${p.collectedAt ? dateTime(p.collectedAt) : '等待授权'}`, mobile ? 11 : 13, p.status === 'stale' ? colors.gold : colors.quiet)
  }
  if (!mobile) content += t(610, y + 57, '从真实记录开始积累', 18)
    + t(610, y + 85, '绿色 · Steam / PSN 发现新增时长', 12, colors.mint)
    + t(610, y + 109, '金色 · Nintendo 实际游玩日期', 12, colors.gold)
    + t(610, y + 137, '未采集的历史留空', 12, colors.quiet)
  content += t(24, height - 16, mobile ? '绿：发现新增记录的日期 · 金：Nintendo 游玩日期' : '游戏时长按平台记录，非精确在线时长。点击查看完整记录与同步详情 →', mobile ? 10 : 12, colors.quiet)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Llugaes 的游戏记录</title><desc id="desc">Steam 近两周 ${hours(total)} 小时，${statusText(steam)}。PlayStation · ${statusText(data.platforms.psn)}。Switch · ${statusText(data.platforms.switch)}。</desc>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="18" fill="#0d232d" stroke="#29454d"/>
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Microsoft YaHei,sans-serif">${content}</g></svg>\n`
}
