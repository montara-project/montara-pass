import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { env } from '@/config/env'

import type { TokenPair } from './models/user'

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

/**
 * The one axios instance every service uses. The access token issued at
 * sign-in is kept by `token-storage.ts` and sent as a Bearer header, so the
 * API can live on another origin (VITE_API_URL).
 */
export const api = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: TIME_OUT,
})

api.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

/** Trade the stored refresh token for a new token pair and store it. */
async function refreshTokens() {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const res = await api.post<TokenPair>(`${AUTH_PATH}/token/refresh`, {
    refresh_token: refreshToken,
  })

  setAuthTokens({
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
  })
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// One refresh at a time: requests that fail together wait on the same call.
let refreshing: Promise<unknown> | null = null

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  if (error.code === 'ERR_NETWORK') {
    throw new Error('Network error')
  }

  const config = error.config as RetriableConfig | undefined
  const url = config?.url ?? ''
  const recoverable =
    error.response?.status === 401 &&
    config !== undefined &&
    !url.startsWith(`${AUTH_PATH}/email-password/`) &&
    !url.startsWith(`${AUTH_PATH}/token/refresh`)

  if (!recoverable) {
    return Promise.reject(error)
  }

  // The access token expired: trade the refresh token for a new one, then
  // replay the request once.
  if (!config._retried && getStoredRefreshToken()) {
    config._retried = true
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null
    })

    try {
      await refreshing
      return await api(config)
    } catch (retryError) {
      if ((retryError as AxiosError).response?.status !== 401) {
        return Promise.reject(retryError)
      }
    }
  }

  // The session is gone for good; the axios error is kept so callers can
  // still read the API envelope.
  clearAuthTokens()
  if (window.location.pathname !== SIGN_IN_PATH) {
    window.location.assign(SIGN_IN_PATH)
  }
  return Promise.reject(error)
})
