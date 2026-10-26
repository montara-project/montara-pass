import type { ReactNode } from 'react'

import { DocsLayout } from 'fumadocs-ui/layouts/docs'

import { source } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-128.png" alt="" width={24} height={24} />
            Montara Pass
          </>
        ),
      }}
      githubUrl="https://github.com/montara-project/montara-pass"
    >
      {children}
    </DocsLayout>
  )
}
