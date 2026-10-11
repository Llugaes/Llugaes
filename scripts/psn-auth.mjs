import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'
import { readJson, writeJson } from './io.mjs'
import { SyncError } from './model.mjs'

const vaultPath = 'state/psn-session.enc.json'
const context = account => `llugaes-player-log:psn:v1:${account.toLowerCase()}`
const key = (secret, account) => hkdfSync('sha256', secret, 'player-log', context(account), 32)

export function seal(value, secret, account) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(secret, account), iv)
  cipher.setAAD(Buffer.from(context(account)))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}
export function unseal(value, secret, account) {
  if (value.version !== 1) throw new SyncError('invalid_data')
  const decipher = createDecipheriv('aes-256-gcm', key(secret, account), Buffer.from(value.iv, 'base64'))
  decipher.setAAD(Buffer.from(context(account)))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'))
}
const read = async () => { try { return await readJson(vaultPath) } catch (error) { if (error.code !== 'ENOENT') throw error; return null } }

export async function psnAuthorization({ env, config, api, at, readVault = read, writeVault = value => writeJson(vaultPath, value) }) {
  const secret = env.PSN_NPSSO
  if (!secret) throw new SyncError('missing_secret')
  let cached, auth, changed = false
  try { const encrypted = await readVault(); if (encrypted) cached = unseal(encrypted, secret, config.psnOnlineId) } catch { /* Secret 更新后重新授权，不覆盖旧文件。 */ }
  const now = Date.parse(at)
  if (cached?.accessToken && cached.accessExpiresAt > now + 60000) auth = cached
  else {
    let fresh
    if (cached?.refreshToken && cached.refreshExpiresAt > now + 60000) {
      try { fresh = await api.exchangeRefreshTokenForAuthTokens(cached.refreshToken) } catch { /* 已撤销时仅尝试一次初始授权。 */ }
    }
    if (!fresh) {
      try { fresh = await api.exchangeAccessCodeForAuthTokens(await api.exchangeNpssoForAccessCode(secret)) }
      catch { throw new SyncError('auth_required') }
    }
    if (!fresh.accessToken) throw new SyncError('auth_required')
    auth = { accessToken: fresh.accessToken, refreshToken: fresh.refreshToken,
      accessExpiresAt: now + Number(fresh.expiresIn || 0) * 1000,
      refreshExpiresAt: now + Number(fresh.refreshTokenExpiresIn || 0) * 1000 }
    changed = true
  }
  const profile = await api.getProfileFromAccountId(auth, 'me')
  if (profile.onlineId?.toLowerCase() !== config.psnOnlineId.toLowerCase()) throw new SyncError('account_mismatch')
  if (changed && auth.refreshToken) await writeVault(seal(auth, secret, config.psnOnlineId))
  return { accessToken: auth.accessToken }
}
