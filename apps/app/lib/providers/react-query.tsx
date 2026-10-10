'use client'

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/**
 * The app's query client. One per browser tab; a new one per call on the
 * server, so nothing cached for one request can reach another.
 */
export function getQueryClient() {
  if (isServer) {
    return makeQueryClient()
  }

  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
}
