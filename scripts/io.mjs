import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
export const root = fileURLToPath(new URL('../', import.meta.url))
export const readJson = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'))
export async function write(name, content) {
  const target = path.join(root, name)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(`${target}.tmp`, content, 'utf8')
  await rename(`${target}.tmp`, target)
}
export const writeJson = (name, data) => write(name, JSON.stringify(data, null, 2) + '\n')
