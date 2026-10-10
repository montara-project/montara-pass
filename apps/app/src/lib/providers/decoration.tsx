import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'

import ThemeProvider from './themes'

/** What the components expect around them, mounted once in the root route. */
export default function DecorationProvider({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider>{children}</ThemeProvider>
    </NuqsAdapter>
  )
}
