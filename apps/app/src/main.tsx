import './styles.css'

import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import ReactQueryProvider, { getQueryClient } from './lib/providers/react-query'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: {
    queryClient: getQueryClient(),
  },
  defaultPreload: 'intent',
  // React Query owns the cache, so a preloaded route never counts as fresh.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // A page that is slow to arrive shows its skeleton, but not for a moment
  // too short to read: a flash of grey is worse than a short wait.
  defaultPendingMs: 200,
  defaultPendingMinMs: 300,
})

// Registers the router instance for type-safe links and navigation.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactQueryProvider>
      <RouterProvider router={router} />
    </ReactQueryProvider>
  </StrictMode>
)
