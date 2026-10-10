import type { ItemCreateRequest } from '@/lib/api/dtos/vault/schema'
import type { Models } from '@/lib/api/models'

import { clearTokens, getSettings, getTokens, saveTokens } from './storage'

// A small fetch client for the routes the popup needs. The web app uses axios
// (apps/app/lib/api); the popup is kept dependency-free, but speaks to the
// same API with the same bearer token and the same refresh-on-401 rule.

const AUTH_PATH = '/v1/auth'
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

async function send(path: string, init: RequestInit, accessToken?: string): Promise<Response> {
  const { apiUrl } = await getSettings()

  try {
    return await fetch(apiUrl + path, {
      ...init,
      // The API is called with the bearer token only; its session cookie is
      // the web app's business.
      credentials: 'omit',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    })
  } catch {
    throw new ApiError(`Could not reach the server at ${apiUrl}.`, 0)
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

  let res = await send(path, init, tokens.accessToken)
  if (res.status === 401) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null
    })
    res = await send(path, init, await refreshing)

    if (res.status === 401) {
      await clearTokens()
      throw new SignedOutError()
    }
  }

  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as T
}

type Envelope<T> = { data: T }
type ListEnvelope<T> = { data: T[]; metadata: { total?: number } }

export async function signIn(email: string, password: string): Promise<void> {
  const res = await send(`${AUTH_PATH}/email-password/sign-in`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw await errorFrom(res)

  const data = (await res.json()) as Models.SignInData
  if (!data.access_token || !data.refresh_token) {
    throw new ApiError('Sign-in response did not include tokens', res.status)
  }
  await saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
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
    const res = await request<Envelope<Models.UserKeys>>('/v1/keys')
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Every live item of the vault. The API pages at 100, so this walks the pages. */
export async function listItems(): Promise<Models.Item[]> {
  const items: Models.Item[] = []

  for (;;) {
    const page = await request<ListEnvelope<Models.Item>>(
      `/v1/items?limit=${PAGE_SIZE}&offset=${items.length}`
    )
    items.push(...page.data)

    if (page.data.length < PAGE_SIZE || items.length >= (page.metadata.total ?? 0)) {
      return items
    }
  }
}

export async function createItem(body: ItemCreateRequest): Promise<Models.Item> {
  const res = await request<Envelope<Models.Item>>('/v1/items', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}
