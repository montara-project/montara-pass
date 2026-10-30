import type { ReactNode } from 'react'

import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'

import globalCss from '@/styles/global.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Montara Pass Docs' },
      {
        name: 'description',
        content: 'How Montara Pass works, how to run it and how to use its API.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: globalCss },
      { rel: 'icon', href: '/logo-32.png' },
      { rel: 'apple-touch-icon', href: '/logo-128.png' },
    ],
    scripts: [
      {
        src: 'https://analytics.masb0ymas.com/script.js',
        defer: true,
        'data-website-id': '74be8335-96de-44b2-b98b-6e35863e1cf5',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // next-themes, inside RootProvider, sets the theme class before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  )
}
