export const AUTH_STORAGE_KEYS = {
  REFRESH_TOKEN: 'authRefreshToken',
  ACCESS_TOKEN: 'authAccessToken',
} as const

/** Path the browser is sent to when there is no session. */
export const SIGN_IN_PATH = '/sign-in'

/** Where the link in the verification email lands once the API has accepted it. */
export const VERIFY_EMAIL_PATH = '/verify-email'

/** Where a user who forgot the account password asks for a reset link. */
export const FORGOT_PASSWORD_PATH = '/forgot-password'

/** Where the link in the reset email lands, with its token. */
export const RESET_PASSWORD_PATH = '/reset-password'

/** Where a signed-in user lands. */
export const HOME_PATH = '/vault'
