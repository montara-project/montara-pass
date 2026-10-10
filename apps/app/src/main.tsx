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
