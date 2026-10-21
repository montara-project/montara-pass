/**
 * Two-step sign-in with an authenticator app (TOTP). Shared with the
 * extension, which imports the web app's lib.
 */

/**
 * Carries the pending token of the TOTP step back to the API, which otherwise
 * keeps it in a cookie that a client on another origin does not send.
 */
export const TOTP_TOKEN_HEADER = 'X-TOTP-Token'

/** An authenticator app's code is 6 digits; anything else is a backup code. */
export function isTotpCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/** What confirming a new secret asks for: only an app's code turns TOTP on. */
export const TOTP_CODE_REQUIRED = 'Enter the 6-digit code from your authenticator app.'

/** The secret of an otpauth:// URI, for typing into an app that cannot scan. */
export function totpSecret(uri: string): string {
  return new URL(uri).searchParams.get('secret') ?? ''
}
