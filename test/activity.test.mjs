import test from 'node:test'
import assert from 'node:assert/strict'
import { steamGames, psnGames, durationMinutes, acceptSnapshot, failedSnapshot, emptyData } from '../scripts/model.mjs'
import { collectSteam, collectPsn, json } from '../scripts/collectors.mjs'
import { localRecentGames, parseKeyValues } from '../scripts/vdf.mjs'
import { renderSvg } from '../scripts/render.mjs'
import { activityDays } from '../scripts/card.mjs'

const config = { steamId: '76561198256716552', psnOnlineId: 'theVoiden', excludedSteamApps: { '1812620': 'DSX' } }
const at = '2026-10-11T08:00:00.000Z'
const game = { appid: 587260, name: 'Tokyo Xanadu', playtime_forever: 3000, playtime_2weeks: 900 }
const snapshot = (minutes, source = 'steam-api', collectedAt = at) => ({ status: 'synced', source, account: config.steamId, collectedAt,
  games: [{ id: '587260', title: '东亰幻都', totalMinutes: minutes, recentMinutes: 900 }] })

test('Steam 过滤软件，只发布白名单字段与中文名', () => {
  const games = steamGames({ total_count: 2, games: [{ ...game, secret: 'do-not-copy' }, { ...game, appid: 1812620 }] }, config, { '587260': '东亰幻都' })
  assert.equal(games.length, 1)
  assert.equal(games[0].title, '东亰幻都')
  assert.equal(JSON.stringify(games).includes('do-not-copy'), false)
})
test('Steam 缺失、隐私或截断响应不能冒充零游玩', () => {
  for (const value of [{}, { total_count: 2, games: [game] }, { total_count: 1 }]) assert.throws(() => steamGames(value, config))
  assert.deepEqual(steamGames({ total_count: 0 }, config), [])
})
test('非法时长不能变成零或 NaN', () => {
  assert.throws(() => steamGames({ total_count: 1, games: [{ ...game, playtime_forever: undefined }] }, config))
  assert.equal(durationMinutes('PT228H56M33S'), 13736)
  assert.equal(durationMinutes('P1DT2H3M'), 1563)
  assert.equal(durationMinutes('PT0S'), 0)
  for (const value of ['', 'unknown', 'P', '-5']) assert.equal(durationMinutes(value), null)
  assert.equal(psnGames([{ titleId: 'abc', name: 'Game' }])[0].totalMinutes, null)
})
test('首次导入、更换来源或账号不制造游玩增量', () => {
  assert.equal(acceptSnapshot(undefined, snapshot(3000), 'steam').interval, null)
  const old = snapshot(2900, 'steam-local', '2026-10-10T08:00:00.000Z')
  assert.equal(acceptSnapshot(old, snapshot(3000), 'steam').interval, null)
  assert.equal(acceptSnapshot({ ...old, source: 'steam-api', account: 'other' }, snapshot(3000), 'steam').interval, null)
})
test('跨日增量保留时间区间，新游戏和计数回退不被凭空计入', () => {
  const old = snapshot(2900, 'steam-api', '2026-10-10T08:00:00.000Z')
  const current = snapshot(3000)
  current.games.push({ id: 'new', totalMinutes: 9999 })
  const { interval } = acceptSnapshot(old, current, 'steam')
  assert.equal(interval.minutes, 100)
  assert.equal(interval.newOrResetGames, 1)
  assert.equal(interval.from, old.collectedAt)
  assert.equal(acceptSnapshot(old, snapshot(2800), 'steam').interval, null)
})
test('失败保留数据时间与记录，不泄露异常文本', () => {
  const result = failedSnapshot(snapshot(3000), 'credential=private')
  assert.equal(result.collectedAt, at)
  assert.equal(result.status, 'stale')
  assert.equal(result.games[0].totalMinutes, 3000)
  assert.equal(JSON.stringify(result).includes('private'), false)
  assert.equal(failedSnapshot(undefined, 'missing_secret').status, 'pending')
})
test('Steam HTTP 错误不会回显 key 或私人地址', async () => {
  await assert.rejects(json('https://example.test/?key=private', async () => { throw Error('private') }), { message: 'unavailable' })
  await assert.rejects(collectSteam({ config, env: {}, at }), { code: 'missing_secret' })
})
test('Steam API 请求不限制返回数量，并能读取真实接口形状', async () => {
  const result = await collectSteam({ env: { STEAM_API_KEY: 'test' }, config, at, fetcher: async url => {
    assert.equal(url.searchParams.get('steamid'), config.steamId)
    assert.equal(url.searchParams.get('count'), '0')
    return { ok: true, json: async () => ({ response: { total_count: 1, games: [game] } }) }
  } })
  assert.equal(result.games[0].recentMinutes, 900)
  assert.equal(result.source, 'steam-api')
})
const psnApi = onlineId => ({
  exchangeNpssoForAccessCode: async () => 'code', exchangeAccessCodeForAuthTokens: async () => ({ accessToken: 'private' }),
  getProfileFromAccountId: async (_, account) => { assert.equal(account, '123456789'); return { onlineId, aboutMe: 'private' } },
  getUserPlayedGames: async (_, account, { offset }) => {
    assert.equal(account, '123456789')
    return offset === 0 ? { titles: [{ titleId: 'A', name: 'A', playDuration: 'PT2H' }], totalItemCount: 2, nextOffset: 1 }
      : { titles: [{ titleId: 'B', name: 'B', playDuration: 'PT4H' }], totalItemCount: 2 }
  },
  getUserTrophyProfileSummary: async (_, account) => { assert.equal(account, 'me'); return { accountId: '123456789', earnedTrophies: { platinum: 2, gold: 3, silver: 4, bronze: 5 }, personal: 'private' } }
})
test('PSN 校验本人账号、完整分页且不保留令牌和资料', async () => {
  const result = await collectPsn({ env: { PSN_NPSSO: 'test' }, config, at, api: psnApi('theVoiden') })
  assert.equal(result.games.length, 2)
  assert.equal(result.trophies.platinum, 2)
  assert.equal(JSON.stringify(result).includes('private'), false)
  await assert.rejects(collectPsn({ env: { PSN_NPSSO: 'test' }, config, at, api: psnApi('someone-else') }), { code: 'account_mismatch' })
})
test('PSN 截断分页不覆盖成功快照', async () => {
  const api = psnApi('theVoiden')
  api.getUserPlayedGames = async () => ({ titles: [], totalItemCount: 5 })
  await assert.rejects(collectPsn({ env: { PSN_NPSSO: 'test' }, config, at, api }), { code: 'incomplete' })
})
test('本机导入排除过期两周计数，只提取游戏字段', () => {
  const vdf = '"UserLocalConfigStore" { "private" "never publish" "Software" { "Valve" { "Steam" { "apps" { "587260" { "Playtime" "3000" "Playtime2wks" "900" "LastPlayed" "1791690000" } "1" { "Playtime" "3" "Playtime2wks" "3" "LastPlayed" "1" } } } } } }'
  const games = localRecentGames(vdf, at)
  assert.equal(games.length, 1)
  assert.equal(JSON.stringify(games).includes('never publish'), false)
  assert.throws(() => parseKeyValues('"a" { "x" "1" "x" "2" }'))
})
test('SVG 转义游戏名，显示采集来源，不冒充实时状态', () => {
  const data = emptyData()
  data.platforms.steam = snapshot(3000, 'steam-local')
  data.platforms.steam.status = 'local'
  data.platforms.steam.games[0].title = '<script>alert(1)</script>'
  const svg = renderSvg(data)
  assert.ok(svg.includes('&lt;script&gt;'))
  assert.ok(!svg.includes('<script>'))
  assert.ok(svg.includes('本机记录'))
  assert.ok(svg.includes('PlayStation · 待连接'))
})

test('日历区分采集发现日与任天堂实际游玩日，不填补未知历史', () => {
  const data = emptyData()
  data.intervals = [
    { platform: 'psn', from: '2026-10-08T00:00:00Z', to: '2026-10-10T20:00:00Z', minutes: 30 },
    { platform: 'steam', to: '2026-10-09T00:00:00Z', minutes: 0 }
  ]
  data.platforms.switch.days = [{ date: '2026-10-07', minutes: 60 }]
  assert.deepEqual([...activityDays(data)], [['2026-10-11', 'observed'], ['2026-10-07', 'actual']])
})
