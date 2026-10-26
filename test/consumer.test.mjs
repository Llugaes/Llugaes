import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { activityWindow, renderSvg, renderWebp, validateConfig } from 'game-activity-card'
const read = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'))
test('主页使用固定组件版本与真实记录完成排行和桌面/手机渲染', async () => {
  const config = validateConfig(await read('activity.config.json')), data = await read('data/activity.json')
  const pkg = await read('package.json')
  assert.match(pkg.dependencies['game-activity-card'], /^git\+https:\/\/github.com\/Llugaes\/game-activity-card\.git#[a-f0-9]{40}$/)
  const options = { ...config, asOf: new Date().toISOString() }
  const view = activityWindow(data, options)
  assert.equal(new Set(view.rows.map(row => row.key)).size, view.rows.length)
  assert.deepEqual(view.featured.concat(view.secondary), view.rows.slice(0, 7))
  for (const mobile of [false, true]) {
    const svg = renderSvg(data, {}, mobile, options)
    const webp = await renderWebp(svg)
    assert.ok(svg.includes('近14天'))
    assert.equal(webp.subarray(8, 12).toString(), 'WEBP')
  }
})
