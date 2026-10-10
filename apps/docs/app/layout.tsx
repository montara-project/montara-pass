import './global.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { RootProvider } from 'fumadocs-ui/provider/next'

export const metadata: Metadata = {
  title: {
    template: '%s | Montara Pass Docs',
    default: 'Montara Pass Docs',
  },
  description: 'How Montara Pass works, how to run it and how to use its API.',
  icons: { icon: '/logo-32.png', apple: '/logo-128.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes, inside RootProvider, sets the theme class before hydration.
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
