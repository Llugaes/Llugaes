import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { root, write } from './io.mjs'

export function linkCard(readme, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('需要完整提交 SHA')
  let matches = 0
  const result = readme.replace(/((?:src|srcset)=")(?:\.\/assets\/|https:\/\/raw\.githubusercontent\.com\/Llugaes\/Llugaes\/[a-f0-9]{40}\/assets\/)(player-log(?:-mobile)?)\.(?:svg|webp)(?:\?v=[a-f0-9]+)?(")/g,
    (_, prefix, file, suffix) => { matches++; return `${prefix}https://raw.githubusercontent.com/Llugaes/Llugaes/${revision}/assets/${file}.webp${suffix}` })
  if (matches !== 2) throw new Error('未找到电脑和手机版卡片，保留 README 等待检查')
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  for (const file of ['player-log.webp', 'player-log-mobile.webp']) execFileSync('git', ['cat-file', '-e', `${revision}:assets/${file}`], { cwd: root, stdio: 'pipe' })
  await write('README.md', linkCard(await readFile(path.join(root, 'README.md'), 'utf8'), revision))
}
