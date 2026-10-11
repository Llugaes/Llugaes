import { readFileSync } from 'node:fs'
import { coverKey } from './covers.mjs'

export const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))
export const hours = value => value == null ? '—' : value > 0 && value < 6 ? '<0.1' : (value / 60).toFixed(1)
export const dateTime = value => value ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) : '未连接'
export const statusText = p => p.reason === 'auth_required' ? '需要重新授权' : ({ local: '本机记录', synced: '已连接', stale: '更新中断', pending: '待连接' }[p.status] || '待连接')
const colors = { ink: '#f4f4ed', quiet: '#a5aaa9', line: '#323738', base: '#0d1117', lime: '#d4ff73', blue: '#8fbaff', red: '#ff9a82' }
const icons = Object.fromEntries(['steam', 'playstation', 'nintendoswitch'].map(name => [name, readFileSync(new URL(`../assets/icons/${name}.svg`, import.meta.url), 'utf8').match(/<path d="([^"]+)"/)[1]]))
const t = (x, y, value, size = 16, color = colors.ink, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`
const line = (x, y, x2, color = colors.line) => `<path d="M${x} ${y}H${x2}" stroke="${color}"/>`
const icon = (name, x, y, size, color) => `<g transform="translate(${x} ${y}) scale(${size / 24})"><path d="${icons[name]}" fill="${color}"/></g>`

function short(value, limit) {
  let size = 0, out = ''
  for (const char of String(value)) { size += char.charCodeAt(0) > 255 ? 2 : 1; if (size > limit) return out + '…'; out += char }
  return out
}
function titleLines(value, limit) {
  const words = String(value).split(/\s+/u).filter(Boolean)
  const length = v => [...v].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0)
  const lines = []; let current = ''
  for (const word of words) {
    const join = current ? ' ' : ''
    if (length(current + join + word) > limit && current) { lines.push(current); current = word }
    else current += join + word
  }
  if (current) lines.push(current)
  return [short(lines[0] || '', limit), short(lines.slice(1).join(' '), limit)]
}
function image(covers, key, x, y, w, h, id) {
  const uri = covers[key]
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></clipPath>` + (uri
    ? `<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#22282b"/>${t(x + 15, y + h / 2, 'NO SAVE', 18, colors.quiet, 'class="mono"')}`)
}

function platformCard(data, covers, key, x, y, width, mobile, index) {
  const snapshot = data.platforms[key], game = snapshot.games[0]
  const accent = { steam: colors.lime, psn: colors.blue, switch: colors.red }[key]
  const name = { steam: 'STEAM', psn: 'PLAYSTATION', switch: 'SWITCH' }[key]
  const logo = { steam: 'steam', psn: 'playstation', switch: 'nintendoswitch' }[key]
  const title = titleLines(game?.title || '还没有记录', mobile ? 30 : 27)
  const height = mobile ? 318 : 340, connected = snapshot.status === 'synced'
  const artHeight = mobile ? 142 : 165, artBottom = 42 + artHeight
  const count = key === 'psn' ? snapshot.trophies?.platinum : key === 'steam' ? game?.recentMinutes : game?.totalMinutes
  const metric = key === 'psn' ? String(count ?? '—') : hours(count)
  const unit = key === 'psn' ? '白金' : 'h'
  const caption = key === 'psn' ? `${snapshot.games.length} 个游戏` : key === 'steam' ? '这两周' : '本作累计'
  const stamp = key === 'steam' ? `累计 ${hours(game?.totalMinutes)} h` : game?.lastPlayedAt ? `上次 ${dateTime(game.lastPlayedAt).split(' ')[0]}` : '尚未游玩'
  const body = `<path d="M0 10L10 0H${width - 15}L${width} 15V${height - 10}L${width - 10} ${height}H0Z" fill="url(#shell)" stroke="${key === 'steam' ? '#859b58' : colors.line}"/>
    <path d="M0 10L10 0H${width - 15}" fill="none" stroke="${accent}" opacity=".8"/>
    <path d="M${width - 15} 0V15H${width}" fill="none" stroke="#697073"/>
    ${icon(logo, 13, 12, 18, accent)}${t(39, 26, name, 13, colors.ink, 'class="mono" font-weight="700" letter-spacing="1"')}
    ${t(width - 13, 26, `0${index + 1}`, 12, '#818a8c', 'class="mono" text-anchor="end"')}
    ${image(covers, game ? coverKey(key, game) : '', 10, 42, width - 20, artHeight, `art-${key}`)}
    <g clip-path="url(#art-${key})"><path class="shine shine-${index}" d="M-120 38H-85L10 ${artBottom + 10}H-25Z" fill="url(#shine)"/></g>
    <path d="M12 ${artBottom - 16}V${artBottom - 2}H26M${width - 26} 44H${width - 12}V58" fill="none" stroke="${accent}" stroke-width="2"/>
    ${t(14, artBottom + 27, title[0], mobile ? 18 : 17, colors.ink, 'font-weight="650"')}
    ${title[1] ? t(14, artBottom + 49, title[1], mobile ? 17 : 16, colors.ink) : ''}
    ${t(14, height - 32, metric, mobile ? 35 : 42, accent, 'class="number" font-weight="700"')}
    ${t(width - 14, height - 37, unit, 19, accent, 'text-anchor="end"')}
    ${t(14, height - 12, caption, 12, colors.quiet)}${t(width - 14, height - 12, stamp, 11, colors.quiet, 'text-anchor="end" class="mono"')}`
  const failure = connected ? '' : `<rect x="8" y="43" width="${width - 16}" height="28" fill="#161818" opacity=".95"/>${t(16, 63, statusText(snapshot), 13, colors.red)}`
  return `<g transform="translate(${x} ${y})"><g class="enter enter-${index}">
    <path d="M8 ${height + 4}H${width + 4}V18" fill="none" stroke="#000" stroke-width="9" opacity=".35"/>
    ${body}${failure}
    <path class="edge edge-${index}" d="M1 11L11 1H${width - 16}L${width - 1} 16V${height - 11}L${width - 11} ${height - 1}H1Z" pathLength="1000" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="55 945" stroke-dashoffset="55" opacity="0"/>
    </g></g>`
}

function recentGames(data, covers, y, width, mobile) {
  const games = data.platforms.steam.games.slice(1, 5)
  let content = t(24, y, 'ALSO PLAYED', 12, '#afb8af', 'class="mono" letter-spacing="2"')
  const columns = mobile ? 2 : 4, gap = mobile ? 12 : 16, itemW = (width - 48 - (columns - 1) * gap) / columns
  for (const [i, game] of games.entries()) {
    const x = 24 + (i % columns) * (itemW + gap), top = y + 15 + Math.floor(i / columns) * 106
    content += image(covers, coverKey('steam', game), x, top, itemW, mobile ? 58 : 56, `recent-${i}`)
      + `<rect x="${x}" y="${top + (mobile ? 38 : 36)}" width="${itemW}" height="20" fill="#080b0e" opacity=".88"/>`
      + t(x + itemW - 7, top + (mobile ? 52 : 50), `${hours(game.recentMinutes)} h`, 12, colors.lime, 'class="mono" text-anchor="end"')
      + t(x, top + (mobile ? 76 : 75), short(game.title, mobile ? 18 : 25), mobile ? 12 : 13, colors.quiet)
  }
  return content
}

export function renderSvg(data, covers = {}, mobile = false) {
  const width = mobile ? 360 : 920, height = mobile ? 1386 : 650
  const steam = data.platforms.steam, total = steam.collectedAt ? steam.games.reduce((sum, g) => sum + (g.recentMinutes || 0), 0) : null
  const connected = Object.values(data.platforms).filter(p => p.status === 'synced').length
  let content = t(24, 31, 'LLUGAES / SAVE SELECT', mobile ? 11 : 12, colors.quiet, 'class="mono" letter-spacing="1.5"')
  content += t(width - 24, 31, `${connected}/3 CONNECTED`, mobile ? 10 : 12, connected === 3 ? colors.lime : colors.red, 'class="mono" text-anchor="end"')
  content += t(22, mobile ? 83 : 94, 'CONTINUE', mobile ? 43 : 64, colors.ink, 'font-weight="850" font-style="italic" letter-spacing="-3"')
  if (mobile) content += t(width - 24, 112, `${hours(total)} h / STEAM 14D`, 13, colors.lime, 'class="mono" text-anchor="end"')
  else content += t(width - 24, 85, `${hours(total)} h`, 45, colors.lime, 'class="number" text-anchor="end" font-weight="700"') + t(width - 24, 108, 'STEAM / 14 DAYS', 12, colors.quiet, 'class="mono" text-anchor="end" letter-spacing="1.5"')
  content += line(24, 126, width - 24)
  let offset = 24
  const accents = [colors.lime, '#91ac69', '#627746', '#4c583e', '#393f34']
  if (total > 0) for (const [i, game] of steam.games.entries()) {
    const length = (width - 48) * game.recentMinutes / total
    if (length > 1) content += `<path class="meter" d="M${offset.toFixed(2)} 126h${Math.max(0, length - 3).toFixed(2)}" stroke="${accents[i % accents.length]}" stroke-width="3"/>`
    offset += length
  }
  for (const [index, key] of ['steam', 'psn', 'switch'].entries()) {
    content += platformCard(data, covers, key, mobile ? 24 : 24 + index * 298, mobile ? 149 + index * 330 : 157, mobile ? 312 : 276, mobile, index)
  }
  content += recentGames(data, covers, mobile ? 1156 : 532, width, mobile)
  content += t(width - 24, height - 13, '全部存档 ↗', 12, colors.ink, 'text-anchor="end"')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">Llugaes 的游戏存档</title><desc id="desc">Steam 近两周 ${hours(total)} 小时，${statusText(steam)}。PlayStation · ${statusText(data.platforms.psn)}。Switch · ${statusText(data.platforms.switch)}。</desc>
<defs><linearGradient id="shell" x2=".8" y2="1"><stop stop-color="#232b2d"/><stop offset=".24" stop-color="#171d20"/><stop offset="1" stop-color="#111719"/></linearGradient>
<linearGradient id="shine"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<style>.mono{font-family:Consolas,Menlo,monospace}.number{font-family:Arial,Helvetica,sans-serif;font-variant-numeric:tabular-nums}.shine{opacity:0}
@media(prefers-reduced-motion:no-preference){
.enter{animation:load .7s cubic-bezier(.2,.8,.2,1) both}.enter-1{animation-delay:.12s}.enter-2{animation-delay:.24s}
.edge{animation:trace 8s linear infinite}.edge-1{animation-delay:2.6s}.edge-2{animation-delay:5.2s}
.shine{animation:shine 12s ease-in-out infinite}.shine-1{animation-delay:2s}.shine-2{animation-delay:4s}
.meter{animation:reveal 1.1s ease-out both;transform-origin:24px 126px}
@keyframes load{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes trace{0%,2%{stroke-dashoffset:55;opacity:0}5%{opacity:.8}35%{stroke-dashoffset:-1000;opacity:.8}39%,100%{stroke-dashoffset:-1000;opacity:0}}
@keyframes shine{0%,5%{transform:translateX(0);opacity:0}8%{opacity:1}28%{transform:translateX(430px);opacity:1}30%,100%{transform:translateX(430px);opacity:0}}
@keyframes reveal{from{transform:scaleX(0)}to{transform:scaleX(1)}}}
</style><rect width="${width}" height="${height}" fill="${colors.base}"/>
<g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Microsoft YaHei,sans-serif">${content}</g></svg>\n`.replace(/[ \t]+\n/g, '\n')
}
