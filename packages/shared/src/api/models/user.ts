import type { ISO8601DateString } from '../../types/time'

/** The Authula user, as GET /api/v1/auth/me and the sign-in routes return it. */
export interface User {
  id: string
  name: string
  email: string
  email_verified: boolean
  image: string | null
  created_at: ISO8601DateString
  updated_at: ISO8601DateString
}

export interface Session {
  id: string
  user_id: string
  expires_at: ISO8601DateString
}

/** Body of GET /api/v1/auth/me. Authula's routes answer without the data envelope. */
export interface Profile {
  user: User
  session: Session
  /** Whether signing in asks for a code from an authenticator app. GET /me only. */
  totp_enabled?: boolean
}

/** Body of POST /api/v1/auth/token/refresh. */
export interface TokenPair {
  access_token: string
  refresh_token: string
}

/**
 * Body of a successful sign-in. Sign-up answers the same way, without tokens
 * while the email address still has to be verified.
 */
export interface SignInData extends Profile, Partial<TokenPair> {
  expires_at?: ISO8601DateString
  expires_in?: number
  /**
   * Set instead of the tokens when the user turned TOTP on: the sign-in goes
   * on at POST /totp/verify with a code and this token, which lives 5 minutes.
   */
  totp_redirect?: boolean
  totp_token?: string
}

/**
 * Body of POST /api/v1/auth/totp/enable. It takes effect once a code from the
 * secret in totp_uri is sent to POST /totp/verify with totp_token.
 */
export interface TotpSetup {
  totp_uri: string
  backup_codes: string[]
  totp_token: string
}
