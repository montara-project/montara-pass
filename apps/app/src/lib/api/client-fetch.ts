import type { TokenPair } from '@montara-pass/shared/api/models/user'

import type { ApiErrorResponse } from '@/types/api'

import { env } from '@/config/env'

import {
  clearAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setAuthTokens,
} from '../auth/token-storage'
import { SIGN_IN_PATH } from '../constants/auth'

/** Authula is mounted here on the Go API (apps/server cmd/api/authula.go). */
export const AUTH_PATH = '/api/v1/auth'

const TIME_OUT = 60_000

/** A response outside 2xx; `body` is the API envelope, when there is one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorResponse | undefined
  ) {
    super(body?.message || `Request failed with status code ${status}`)
    this.name = 'ApiError'
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

type RequestOptions = {
  body?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

async function send(
  method: Method,
  path: string,
  { body, params, headers }: RequestOptions,
  idempotencyKey: string | undefined
): Promise<Response> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) query.set(key, String(value))
  }
  const url = env.VITE_API_URL.replace(/\/$/, '') + path + (query.size ? `?${query}` : '')

  // The access token issued at sign-in is kept by `token-storage.ts` and sent
  // as a Bearer header, so the API can live on another origin (VITE_API_URL).
  const accessToken = getStoredAccessToken()
  try {
    return await fetch(url, {
      method,
      headers: {
        ...headers,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIME_OUT),
    })
  } catch {
    throw new Error('Network error')
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : undefined
  } catch {
    return undefined
  }
}

/** Trade the stored refresh token for a new token pair and store it. */
async function refreshTokens() {
  const tokens = await request<TokenPair>('POST', `${AUTH_PATH}/token/refresh`, {
    body: { refresh_token: getStoredRefreshToken() },
  })
  setAuthTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
}

/** A 401 on these is a wrong password or code, not a dead session. */
function sessionExpired(path: string) {
  return ![
    `${AUTH_PATH}/email-password/`,
    `${AUTH_PATH}/totp/verify`,
    `${AUTH_PATH}/token/refresh`,
  ].some((prefix) => path.startsWith(prefix))
}

// One refresh at a time: requests that fail together wait on the same call.
let refreshing: Promise<void> | null = null

/** Call the API and answer its JSON body; anything outside 2xx throws {@link ApiError}. */
export async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  // A write names itself, so the API runs it once however often it arrives.
  // The key is kept when the request is sent again after a token refresh.
  const idempotencyKey = method === 'GET' ? undefined : crypto.randomUUID()
  let res = await send(method, path, options, idempotencyKey)

  if (res.status === 401 && sessionExpired(path)) {
    // The access token expired: trade the refresh token for a new one, then
    // replay the request once.
    if (getStoredRefreshToken()) {
      try {
        refreshing ??= refreshTokens().finally(() => {
          refreshing = null
        })
        await refreshing
        res = await send(method, path, options, idempotencyKey)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error
      }
    }

    // The session is gone for good; the error still carries the API envelope.
    if (res.status === 401) {
      clearAuthTokens()
      if (window.location.pathname !== SIGN_IN_PATH) {
        window.location.assign(SIGN_IN_PATH)
      }
    }
  }

  const body = await parse(res)
  if (!res.ok) throw new ApiError(res.status, body as ApiErrorResponse | undefined)
  return body as T
}
