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

/** A device signed in to the account: one of the user's live sessions (GET /api/v1/sessions). */
export interface Device {
  id: string
  created_at: ISO8601DateString
  /** When the session was last renewed: roughly, last active. */
  updated_at: ISO8601DateString
  expires_at: ISO8601DateString
  ip: string | null
  user_agent: string | null
  /** The session this app is signed in with. */
  current: boolean
}

/** A passkey on the account (GET /api/v1/passkeys). */
export interface AccountPasskey {
  id: string
  created_at: ISO8601DateString
  name: string
  /** base64url, as the browser names the credential. */
  credential_id: string
  /** The vault key sealed under the passkey's PRF output; null when it signs in only. */
  encrypted_vault_key: string | null
  last_used_at: ISO8601DateString | null
}

/** Body of POST /api/v1/auth/passkey/sign-in: a sign-in, and the passkey's sealed vault key. */
export interface PasskeySignInData extends SignInData {
  passkey: { id: string; encrypted_vault_key: string | null }
}

/** Body of POST /api/v1/auth/passkey/options and data of POST /api/v1/passkeys/register/begin. */
export interface PasskeyCeremony {
  ceremony: string
  options: { publicKey: Record<string, unknown> }
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
