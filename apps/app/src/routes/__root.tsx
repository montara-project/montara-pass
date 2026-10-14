import type { QueryClient } from '@tanstack/react-query'

import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import EmptyState from '@/components/block/common/empty-state'
import { Toaster } from '@/components/ui/sonner'
import DecorationProvider from '@/lib/providers/decoration'

/**
 * The root layout around every route.
 *
 * Routing conventions:
 * - Parentheses group routes without adding a URL segment: (app), (auth)
 * - A `-` prefix keeps a file or directory out of the route tree
 *
 * @see https://tanstack.com/router/latest/docs/framework/react/routing/routing-concepts
 */
const RootLayout = () => (
  <DecorationProvider>
    <Outlet />
    <Toaster position="bottom-center" />
  </DecorationProvider>
)

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <EmptyState title="Page not found" description="That route does not exist." />
  ),
})
