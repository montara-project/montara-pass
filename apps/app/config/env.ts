import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Client-side environment variables. vinext, like Next.js, only inlines vars
 * prefixed with NEXT_PUBLIC_ into the client bundle, and only when they are
 * read by their full name, hence the explicit runtimeEnv.
 */
const parsed = createEnv({
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_API_URL: z.url().optional(),
    NEXT_PUBLIC_APP_NAME: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
  emptyStringAsUndefined: true,
})

// The Go API (apps/server) listens on :8080 in development; the origin of this
// app must be listed in its CORS_ALLOWED_ORIGINS.
export const env = {
  NEXT_PUBLIC_API_URL: parsed.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  NEXT_PUBLIC_APP_NAME: parsed.NEXT_PUBLIC_APP_NAME ?? 'Montara Pass',
}
