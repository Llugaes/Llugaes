import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { readJson, writeJson } from './io.mjs'
import { localRecentGames } from './vdf.mjs'
import { steamGames, emptyData } from './model.mjs'
import { json } from './collectors.mjs'
import { renderFiles } from './render.mjs'

const steamRoot = process.argv[2]
if (!steamRoot) throw new Error('用法：npm run import:steam -- "Steam 安装目录"')
const config = await readJson('activity.config.json')
const account = BigInt(config.steamId) - 76561197960265728n
if (account < 1n || account > 4294967295n) throw new Error('Steam 账号无效')
const file = path.join(steamRoot, 'userdata', String(account), 'config', 'localconfig.vdf')
const at = (await stat(file)).mtime.toISOString()
const games = localRecentGames(await readFile(file, 'utf8'), at, config.excludedSteamApps)
const titles = await readJson('data/steam-titles.json')
for (const game of games) {
  if (titles[game.appid]) continue
  const response = await json(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&l=schinese`)
  const details = response[game.appid]?.data
  if (!details?.name || details.type !== 'game') throw new Error(`需要核实应用 ${game.appid} 的名称和类型`)
  titles[game.appid] = details.name
}
let data
try { data = await readJson('data/activity.json') } catch (error) {
  if (error.code !== 'ENOENT') throw error
  data = emptyData()
}
if (data.platforms.steam.source === 'steam-api') throw new Error('云端已经连接，不能用本机缓存覆盖')
data.platforms.steam = { status: 'local', source: 'steam-local', account: config.steamId, collectedAt: at,
  reason: 'missing_secret', games: steamGames({ total_count: games.length, games }, config, titles) }
await writeJson('data/steam-titles.json', titles)
await writeJson('data/activity.json', data)
await renderFiles(data)
console.log(`已导入 ${games.length} 个近期游戏；仅保存白名单游玩字段，不保存完整 Steam 配置。`)
