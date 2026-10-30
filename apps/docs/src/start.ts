import { redirect } from '@tanstack/react-router'
import { createMiddleware, createStart } from '@tanstack/react-start'

// The docs moved from /docs to the root of their subdomain; old links still
// land.
const legacyDocsRedirect = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url)
  if (url.pathname === '/docs' || url.pathname.startsWith('/docs/')) {
    url.pathname = url.pathname.slice('/docs'.length) || '/'
    throw redirect({ href: url.href, statusCode: 308 })
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [legacyDocsRedirect],
}))
