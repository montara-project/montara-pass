/**
 * Client-side environment variables. This app is a Vite SPA: Vite inlines
 * the vars prefixed with VITE_ into the bundle at build time.
 */
// The shipped image serves this bundle from the Go server itself, and the dev
// server proxies /api to it, so UI and API share an origin: an empty
// VITE_API_URL means "same as the page". Set it only for a split-origin setup.
export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL || window.location.origin,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'Montara Pass',
}
