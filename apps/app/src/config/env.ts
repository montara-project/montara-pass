import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

/**
 * Client-side environment variables. This app is a Vite SPA: Vite inlines
 * the vars prefixed with VITE_ into the bundle at build time.
 */
const parsed = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_API_URL: z.url().optional(),
    VITE_APP_NAME: z.string().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
})

// The shipped image serves this bundle from the Go server itself, and the dev
// server proxies /api to it, so UI and API share an origin: an empty
// VITE_API_URL means "same as the page". Set it only for a split-origin setup.
export const env = {
  VITE_API_URL: parsed.VITE_API_URL ?? window.location.origin,
  VITE_APP_NAME: parsed.VITE_APP_NAME ?? 'Montara Pass',
}
