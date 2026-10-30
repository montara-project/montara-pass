import type { Icon } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

interface PageProps {
  title: string
  /** A mark before the title, in the focus color. */
  icon?: Icon
  description?: string
  /** The page's own actions, at the far end of its heading. */
  actions?: React.ReactNode
  children: React.ReactNode
  /** A tool or a form reads at a narrower measure than a list. */
  width?: 'full' | 'wide' | 'narrow'
  className?: string
}

const WIDTHS = { full: '', wide: 'mx-auto max-w-[1040px]', narrow: 'mx-auto max-w-[720px]' }

/** A page of the sheet: its heading, then what it holds. No box around a box. */
export default function Page({
  title,
  icon: Icon,
  description,
  actions,
  children,
  width = 'full',
  className,
}: PageProps) {
  return (
    <div className={cn('flex flex-col gap-5 p-5 sm:px-8 sm:pb-8', WIDTHS[width], className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.01em]">
            {Icon && <Icon className="text-focus size-5" aria-hidden />}
            {title}
          </h1>
          {description && <p className="text-muted-foreground text-[13px]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
