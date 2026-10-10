'use client'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { Toaster } from '@/components/ui/sonner'

import ReactQueryProvider from './react-query'
import ThemeProvider from './themes'

/** Everything the client components expect around them, mounted once in the root layout. */
export default function DecorationProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <NuqsAdapter>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </NuqsAdapter>
    </ReactQueryProvider>
  )
}
