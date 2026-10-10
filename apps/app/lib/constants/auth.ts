export const AUTH_STORAGE_KEYS = {
  REFRESH_TOKEN: 'authRefreshToken',
  ACCESS_TOKEN: 'authAccessToken',
} as const

/** Path the browser is sent to when there is no session. */
export const SIGN_IN_PATH = '/sign-in'

/** Where a signed-in user lands. */
export const HOME_PATH = '/vault'
