import type { Metadata } from 'next'

import './globals.css'

import DecorationProvider from '@/lib/providers/decoration'

export const metadata: Metadata = {
  title: 'Montara Pass',
  description: 'End-to-end encrypted password manager',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body>
        <DecorationProvider>{children}</DecorationProvider>
      </body>
    </html>
  )
}
