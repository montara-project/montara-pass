import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { Link } from '@tanstack/react-router'

import { MONO_NOTE } from '@/components/block/security/section'
import { PAGE_CONTAINER } from '@/components/layout/page'
import { cn } from '@/lib/utils'

/** Settings' tabs, each its own page under the same head. */
const TABS = [
  { label: 'General', to: '/settings' },
  { label: 'Profile', to: '/profile' },
  { label: 'Security', to: '/security' },
] as const

/**
 * The frame of every Settings tab: the page's name, the tabs under it, and
 * the tab's own content below. The tabs scroll sideways when they do not fit;
 * the rule under them is an inset shadow, so the active tab's line covers it
 * without making the strip taller than its tabs.
 */
export default function SettingsFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(PAGE_CONTAINER, 'flex flex-col gap-2.5')}>
      <header className="flex min-w-0 flex-col gap-1">
        <p className={MONO_NOTE}>Account · Settings</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Settings</h1>
        <p className="text-muted-foreground text-[13px]">
          {COMMUNITY
            ? 'Folders, your profile and how this vault signs in.'
            : 'Folders, sharing, your profile and how this vault signs in.'}
        </p>
      </header>

      <nav
        aria-label="Settings"
        className="mt-1.5 flex gap-1 overflow-x-auto overscroll-x-contain shadow-[inset_0_-1px_0_var(--color-border)]"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: true }}
            className="text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:border-primary shrink-0 border-b-2 border-transparent px-3 py-[9px] text-[13px] leading-4 font-medium transition-colors duration-[120ms] aria-[current=page]:font-semibold motion-reduce:transition-none"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-[22px] pt-3.5">{children}</div>
    </div>
  )
}
