import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src="/logo-128.png" alt="" width={24} height={24} />
          Montara Pass
        </>
      ),
    },
    githubUrl: 'https://github.com/montara-project/montara-pass',
  }
}
