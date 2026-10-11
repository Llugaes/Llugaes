import { SyncError, iso, number } from './model.mjs'

// 只描述结构，绝不记录响应中的账号、凭据或字段值。
export function schemaShape(value, depth = 0) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return { length: value.length, item: value.length && depth < 5 ? schemaShape(value[0], depth + 1) : null }
  if (typeof value !== 'object' || depth >= 5) return typeof value
  return Object.fromEntries(Object.entries(value).filter(([key]) => /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)).slice(0, 35).map(([key, item]) => [key, schemaShape(item, depth + 1)]))
}

export const nintendoClient = '5c38e31cd085304b'
export const nintendoAgent = 'com.nintendo.znej/1.13.0 (Android/7.1.2)'
export async function nintendoJson(url, options = {}, fetcher = fetch) {
  try {
    const response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(25000) })
    if (response.status === 401 || response.status === 403) throw new SyncError('auth_required')
    if (!response.ok) throw new SyncError('unavailable')
    return await response.json()
  } catch (error) { throw new SyncError(error.code === 'auth_required' ? 'auth_required' : 'unavailable') }
}

export function nintendoHistory(response) {
  if (!Array.isArray(response.playHistories) || !Array.isArray(response.recentPlayHistories)
    || !Array.isArray(response.hiddenTitleList)) throw new SyncError('invalid_data')
  const hidden = new Set(response.hiddenTitleList.map(value => String(value?.titleId ?? value)))
  const games = response.playHistories.filter(g => !hidden.has(String(g.titleId))).map(g => {
    if (!g.titleId || !g.titleName || number(g.totalPlayedMinutes) === null) throw new SyncError('invalid_data')
    return { id: String(g.titleId), title: g.titleName, totalMinutes: g.totalPlayedMinutes,
      recentMinutes: null, firstPlayedAt: iso(g.firstPlayedAt), lastPlayedAt: iso(g.lastPlayedAt),
      playedDays: number(g.totalPlayedDays), imageUrl: typeof g.imageUrl === 'string' ? g.imageUrl : null }
  }).sort((a, b) => (b.lastPlayedAt || '').localeCompare(a.lastPlayedAt || ''))
  const days = response.recentPlayHistories.map(day => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.playedDate) || !Array.isArray(day.dailyPlayHistories)) throw new SyncError('invalid_data')
    const entries = day.dailyPlayHistories.filter(g => !hidden.has(String(g.titleId))).map(g => {
      if (!g.titleId || number(g.totalPlayedMinutes) === null) throw new SyncError('invalid_data')
      return { id: String(g.titleId), minutes: g.totalPlayedMinutes }
    })
    return { date: day.playedDate, games: entries, minutes: entries.reduce((sum, g) => sum + g.minutes, 0) }
  })
  return { games, days, providerUpdatedAt: iso(response.lastUpdatedAt) }
}

export async function collectNintendo({ env, at, previous, fetcher }) {
  if (!env.NINTENDO_SESSION_TOKEN) throw new SyncError('missing_secret')
  const token = await nintendoJson('https://accounts.nintendo.com/connect/1.0.0/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': nintendoAgent },
    body: JSON.stringify({ client_id: nintendoClient, session_token: env.NINTENDO_SESSION_TOKEN,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token' })
  }, fetcher)
  if (!token.access_token) throw new SyncError('auth_required')
  const response = await nintendoJson('https://app-api.znej.nintendo.com/api/v2.0/users/me/play_histories', {
    headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': nintendoAgent, 'gentry-locale': 'ja-JP' }
  }, fetcher)
  let result
  try { result = nintendoHistory(response) } catch (error) {
    error.schema = schemaShape(response)
    throw error
  }
  // 平台会重复返回近期日期。按日期替换而非累加，以接收迟到记录或修正。
  const byDay = new Map((previous?.source === 'nintendo-history' ? previous.days || [] : []).map(day => [day.date, day]))
  for (const day of result.days) byDay.set(day.date, day)
  result.days = [...byDay.values()].filter(day => day.date >= new Date(Date.parse(at) - 366 * 86400000).toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date))
  return { status: 'synced', source: 'nintendo-history', collectedAt: at, ...result }
}
