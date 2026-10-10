import type { ISO8601DateString } from '@/types/time'

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
}
