import type { ItemPlacementRequest } from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import { isTotpCode, TOTP_TOKEN_HEADER } from '@montara-pass/shared/auth/totp'
import { errorMessage } from '@montara-pass/shared/string'

import { API_URL, clearTokens, getTokens, saveTokens } from './storage'

// A fetch client for the routes the app needs, speaking to the same API as the
// web app and the extension (apps/extension/src/lib/api.ts) with the same
// bearer token and the same refresh-on-401 rule.

const AUTH_PATH = '/api/v1/auth'
const PAGE_SIZE = 100

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Thrown when the session is gone and the user has to sign in again. */
export class SignedOutError extends ApiError {
  constructor() {
    super('Your session has expired. Sign in again.', 401)
    this.name = 'SignedOutError'
  }
}

type ErrorBody = { message?: string; errors?: { message: string }[] }

async function errorFrom(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ErrorBody | null
  const details = (body?.errors ?? []).map((e) => e.message).join('\n')
  const message = [body?.message || res.statusText || 'Request failed', details]
    .filter(Boolean)
    .join(':\n')
  return new ApiError(message, res.status)
}

/** https always; http only for a local development server. */
function serverAllowed(url: string): boolean {
  try {
    const origin = new URL(url)
    return (
      origin.protocol === 'https:' ||
      ['localhost', '127.0.0.1', '[::1]', '::1'].includes(origin.hostname)
    )
  } catch {
    return false
  }
}

async function send(
  path: string,
  init: RequestInit,
  accessToken?: string,
  idempotencyKey?: string
): Promise<Response> {
  if (!serverAllowed(API_URL)) {
    throw new ApiError(`${API_URL} does not use https. Set EXPO_PUBLIC_API_URL.`, 0)
  }

  try {
    return await fetch(API_URL + path, {
      ...init,
      credentials: 'omit',
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
    })
  } catch {
    throw new ApiError(`Could not reach the server at ${API_URL}.`, 0)
  }
}

// One refresh at a time: requests that fail together wait on the same call.
let refreshing: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const tokens = await getTokens()
  if (!tokens) throw new SignedOutError()

  const res = await send(`${AUTH_PATH}/token/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refresh_token: tokens.refreshToken }),
  })
  if (!res.ok) {
    await clearTokens()
    throw new SignedOutError()
  }

  const pair = (await res.json()) as Models.TokenPair
  await saveTokens({ accessToken: pair.access_token, refreshToken: pair.refresh_token })
  return pair.access_token
}

/** An authenticated request; an expired access token is refreshed once. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await getTokens()
  if (!tokens) throw new SignedOutError()

  // A write names itself, so the API runs it once however often it arrives:
  // the same key goes with the second try after a token refresh.
  const write = init.method !== undefined && init.method !== 'GET'
  const key = write ? requestId() : undefined

  let res = await send(path, init, tokens.accessToken, key)
  if (res.status === 401) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null
    })
    res = await send(path, init, await refreshing, key)

    if (res.status === 401) {
      await clearTokens()
      throw new SignedOutError()
    }
  }

  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as T
}

function requestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )
}

type Envelope<T> = { data: T }
type ListEnvelope<T> = { data: T[]; metadata: { total?: number } }

async function saveSignIn(data: Models.SignInData): Promise<void> {
  if (!data.access_token || !data.refresh_token) {
    throw new ApiError('Sign-in response did not include tokens', 200)
  }
  await saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
}

/**
 * Signs in and stores the tokens. A user who turned TOTP on gets no tokens
 * yet but a `totpToken`, for {@link verifyTotp}.
 */
export async function signIn(email: string, password: string): Promise<{ totpToken?: string }> {
  const res = await send(`${AUTH_PATH}/email-password/sign-in`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw await errorFrom(res)

  const data = (await res.json()) as Models.SignInData
  if (data.totp_token) return { totpToken: data.totp_token }

  await saveSignIn(data)
  return {}
}

/** Finishes a sign-in that stopped at the TOTP step. */
export async function verifyTotp(totpToken: string, code: string): Promise<void> {
  const backup = !isTotpCode(code)
  const res = await send(`${AUTH_PATH}/totp/${backup ? 'verify-backup-code' : 'verify'}`, {
    method: 'POST',
    body: JSON.stringify({ code: backup ? code.toLowerCase() : code }),
    headers: { [TOTP_TOKEN_HEADER]: totpToken },
  })
  if (!res.ok) throw await errorFrom(res)

  await saveSignIn((await res.json()) as Models.SignInData)
}

/** Ends the session on the server, best-effort, and forgets the tokens. */
export async function signOut(): Promise<void> {
  try {
    await request(`${AUTH_PATH}/sign-out`, { method: 'POST', body: '{}' })
  } catch {
    // Ignore: there is no session left to end.
  } finally {
    await clearTokens()
  }
}

export async function getProfile(): Promise<Models.Profile> {
  return request(`${AUTH_PATH}/me`)
}

/** The user's key set, or null when they have not created a vault yet. */
export async function getUserKeys(): Promise<Models.UserKeys | null> {
  try {
    const res = await request<Envelope<Models.UserKeys>>('/api/v1/keys')
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Every row of a list route. The API pages at 100, so this walks the pages. */
async function listAll<T>(path: string): Promise<T[]> {
  const rows: T[] = []

  for (;;) {
    const page = await request<ListEnvelope<T>>(`${path}?limit=${PAGE_SIZE}&offset=${rows.length}`)
    rows.push(...page.data)

    if (page.data.length < PAGE_SIZE || rows.length >= (page.metadata.total ?? 0)) {
      return rows
    }
  }
}

/** Every live item of the vault. */
export function listItems(): Promise<Models.Item[]> {
  return listAll('/api/v1/items')
}

/** Sets the caller's own folder and favorite flag for an item. */
export async function setItemPlacement(id: string, body: ItemPlacementRequest): Promise<void> {
  await request(`/api/v1/items/${id}/placement`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** Moves an item the caller owns to the trash. */
export async function trashItem(id: string): Promise<void> {
  await request(`/api/v1/items/${id}`, { method: 'DELETE' })
}

/** Records that the caller used the item just now. */
export async function markItemUsed(id: string): Promise<void> {
  await request(`/api/v1/items/${id}/used`, { method: 'PUT' }).catch(() => undefined)
}

/** Turns an API or hook failure into a message a screen can show. */
export function toMessage(error: unknown, fallback: string): string {
  return errorMessage(error, fallback)
}
