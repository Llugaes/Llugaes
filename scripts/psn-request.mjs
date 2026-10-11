import { SyncError } from './model.mjs'
export async function psnRequest(stage, request) {
  try { return await request() } catch (error) {
    const status = Number(error?.response?.status ?? error?.status ?? error?.statusCode)
    const failure = error instanceof SyncError ? error : new SyncError(status === 401 ? 'auth_required' : 'unavailable')
    failure.stage = stage
    if (Number.isInteger(status) && status >= 100 && status <= 599) failure.httpStatus = status
    throw failure
  }
}
