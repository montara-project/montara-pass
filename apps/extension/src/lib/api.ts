import type {
  ItemCreateRequest,
  ItemPlacementRequest,
  ItemShareRequest,
  ItemUpdateRequest,
} from '@montara-pass/shared/api/dtos/vault/schema'
import type { Models } from '@montara-pass/shared/api/models'

import { isTotpCode, TOTP_CODE_REQUIRED, TOTP_TOKEN_HEADER } from '@montara-pass/shared/auth/totp'
import z from 'zod'

import { serverAllowed } from './origin'
import { clearTokens, getSettings, getTokens, saveTokens } from './storage'

// A small fetch client for the routes the popup needs. The web app uses axios
// (apps/app/lib/api); the popup is kept dependency-free, but speaks to the
// same API with the same bearer token and the same refresh-on-401 rule.

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

async function send(
  path: string,
  init: RequestInit,
  accessToken?: string,
  idempotencyKey?: string
): Promise<Response> {
  const { apiUrl } = await getSettings()
  // A server saved before https was required: nothing, tokens least of
  // all, is sent to it until it is changed in settings.
  if (!serverAllowed(apiUrl)) {
    throw new ApiError(`${apiUrl} does not use https. Change the server in Server settings.`, 0)
  }

  try {
    return await fetch(apiUrl + path, {
      ...init,
      // The API is called with the bearer token only; its session cookie is
      // the web app's business.
      credentials: 'omit',
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
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

  // A write names itself, so the API runs it once however often it arrives:
  // the same key goes with the second try after a token refresh.
  const write = init.method !== undefined && init.method !== 'GET'
  const key = write ? crypto.randomUUID() : undefined

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

/**
 * Answers the TOTP step with a code from the authenticator app, or else a
 * backup code: those are lowercase, and a phone keyboard may have capitalised
 * one. Sent without the bearer token: the API answers it signed out.
 */
async function answerTotp(totpToken: string, code: string): Promise<Models.SignInData> {
  const backup = !isTotpCode(code)
  const res = await send(`${AUTH_PATH}/totp/${backup ? 'verify-backup-code' : 'verify'}`, {
    method: 'POST',
    body: JSON.stringify({ code: backup ? code.toLowerCase() : code }),
    headers: { [TOTP_TOKEN_HEADER]: totpToken },
  })
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as Models.SignInData
}

/** Finishes a sign-in that stopped at the TOTP step. */
export async function verifyTotp(totpToken: string, code: string): Promise<void> {
  await saveSignIn(await answerTotp(totpToken, code))
}

/** Starts turning TOTP on: the secret, and the backup codes, shown once. */
export function enableTotp(password: string): Promise<Models.TotpSetup> {
  return request(`${AUTH_PATH}/totp/enable`, { method: 'POST', body: JSON.stringify({ password }) })
}

/**
 * Turns TOTP on with a code from the new secret; only such a code does. It
 * begins a session of its own, whose tokens replace the current ones before
 * the old session is ended by its id: a request that meets the ended session
 * then refreshes with the new tokens.
 */
export async function confirmTotp(totpToken: string, code: string): Promise<void> {
  if (!isTotpCode(code)) throw new ApiError(TOTP_CODE_REQUIRED, 0)

  const old = (await getProfile()).session.id
  await saveSignIn(await answerTotp(totpToken, code))
  await request(`${AUTH_PATH}/sign-out`, {
    method: 'POST',
    body: JSON.stringify({ session_id: old }),
  }).catch(() => {})
}

/** Turns TOTP off, with the account password and a code from the app or a backup code. */
export async function disableTotp(password: string, code: string): Promise<void> {
  await request(`${AUTH_PATH}/totp/disable`, {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  })
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

/** A plan as the billing overview has to have it: by name. */
const BillingPlan = z.looseObject({ name: z.string() })

/**
 * What the views read of a billing overview. The rest of it is only shown,
 * so it is let through as it comes; a server that answers in another form is
 * refused here rather than breaking the page that shows it.
 */
const BillingOverviewShape = z.looseObject({
  subscription: z.looseObject({ status: z.string(), plan: BillingPlan }).nullish(),
  purchases: z.array(z.looseObject({ status: z.string(), plan: BillingPlan })),
})

/**
 * The user's subscription and purchases, or null where the server has no
 * billing: a Community Edition one, or one from before billing.
 */
export async function getBilling(): Promise<Models.BillingOverview | null> {
  try {
    const res = await request<Envelope<Models.BillingOverview>>('/api/v1/billing')
    if (!BillingOverviewShape.safeParse(res?.data).success) {
      throw new Error('The server sent billing in a form this extension cannot read.')
    }
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/**
 * The plans on offer, cheapest first within each kind; none where the server
 * has no billing.
 */
export async function listPlans(): Promise<Models.Plan[]> {
  try {
    const res = await request<Envelope<Models.Plan[]>>('/api/v1/plans')
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return []
    throw error
  }
}

/** Starts a subscription to a recurring plan; it answers with where to pay. */
export async function subscribe(planId: string): Promise<Models.Subscription> {
  const res = await request<Envelope<Models.Subscription>>('/api/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  })
  return res.data
}

/** Starts the purchase of a one-time plan; it answers with where to pay. */
export async function buy(planId: string): Promise<Models.Purchase> {
  const res = await request<Envelope<Models.Purchase>>('/api/v1/billing/purchases', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  })
  return res.data
}

/** A freshly signed link to the customer portal, where a subscription is cancelled. */
export async function getBillingPortal(): Promise<Models.BillingPortal> {
  const res = await request<Envelope<Models.BillingPortal>>('/api/v1/billing/portal')
  return res.data
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

/** The user's folders; their names are still encrypted. */
export function listFolders(): Promise<Models.Folder[]> {
  return listAll('/api/v1/folders')
}

export async function createItem(body: ItemCreateRequest): Promise<Models.Item> {
  const res = await request<Envelope<Models.Item>>('/api/v1/items', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

/** Rewrites an item's content; the API refuses a revision that is no longer current. */
export async function updateItem(id: string, body: ItemUpdateRequest): Promise<Models.Item> {
  const res = await request<Envelope<Models.Item>>(`/api/v1/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return res.data
}

/** Moves an item the caller owns to the trash; the web app restores it. */
export async function trashItem(id: string): Promise<void> {
  await request(`/api/v1/items/${id}`, { method: 'DELETE' })
}

/** Records that the caller filled the item into a page just now. */
export async function markItemUsed(id: string): Promise<void> {
  await request(`/api/v1/items/${id}/used`, { method: 'PUT' })
}

/** The public key of the user with that email, or null when they have no vault. */
export async function getPublicKey(email: string): Promise<Models.PublicKey | null> {
  try {
    const query = new URLSearchParams({ email })
    const res = await request<Envelope<Models.PublicKey>>(`/api/v1/keys/public?${query}`)
    return res.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Everyone an item is shared with, the owner included. */
export async function listItemMembers(id: string): Promise<Models.ItemMember[]> {
  const res = await request<Envelope<Models.ItemMember[]>>(`/api/v1/items/${id}/members`)
  return res.data
}

/** Gives another user the item, with its key wrapped for them. */
export async function shareItem(id: string, body: ItemShareRequest): Promise<void> {
  await request(`/api/v1/items/${id}/members`, { method: 'POST', body: JSON.stringify(body) })
}

/** Sets the caller's own folder and favorite flag for an item. */
export async function setItemPlacement(id: string, body: ItemPlacementRequest): Promise<void> {
  await request(`/api/v1/items/${id}/placement`, { method: 'PUT', body: JSON.stringify(body) })
}
