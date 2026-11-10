import './sidebar.css'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'

import type { SidebarLink } from '@/components/layout/sidebar/app-sidebar'
import type { UserMenuAction } from '@/components/layout/sidebar/user-menu'

import AppSidebar from '@/components/layout/sidebar/app-sidebar'
import HeaderClock from '@/components/layout/sidebar/header-clock'
import { LINKS_OUT } from '@/components/layout/sidebar/nav-secondary'
import Topbar from '@/components/layout/sidebar/topbar'
import UserMenu from '@/components/layout/sidebar/user-menu'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import {
  CreditCardIcon,
  ExternalLinkIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldOutlineIcon,
  UserIcon,
} from './icons'
import { UpdateButton } from './update-button'

type Icon = SidebarLink['icon']

/** Both editions ship their own name; the mark is the same. */
const NAME = COMMUNITY ? 'Montara Pass CE' : 'Montara Pass'
export type Tool = 'generator' | 'health' | 'billing'

/** The tools, pinned under the vault's views. */
const TOOLS: { value: Tool; label: string; icon: Icon }[] = [
  { value: 'generator', label: 'Password generator', icon: KeyIcon },
  { value: 'health', label: 'Password health', icon: ShieldOutlineIcon },
]

interface VaultSidebarProps<F extends string> {
  filters: { value: F; label: string; icon: Icon; count: number }[]
  filter: F
  tool: Tool | null
  /** Where the web app is, for the pages the extension leaves to it. */
  appUrl: string
  user?: { name: string; email: string } | null
  onFilter: (filter: F) => void
  onTool: (tool: Tool) => void
  onSettings: () => void
  onLock: () => void
  onSignOut: () => void
  /** The list and the item beside it. */
  children: React.ReactNode
}

/**
 * The full tab's frame: the web app's own sidebar and top bar, the filters and
 * the tools down its length, and the vault on the sheet beside it. Every
 * Tailwind class of the extension lives in the files the stylesheet names.
 */
export function VaultSidebar<F extends string>({
  filters,
  filter,
  tool,
  appUrl,
  user,
  onFilter,
  onTool,
  onSettings,
  onLock,
  onSignOut,
  children,
}: VaultSidebarProps<F>) {
  const items: SidebarLink[] = [
    ...filters.map(({ value, label, icon, count }) => ({
      title: label,
      icon,
      group: 'Vault',
      badge: count,
      active: tool === null && filter === value,
      onSelect: () => onFilter(value),
    })),
    ...TOOLS.map(({ value, label, icon }) => ({
      title: label,
      icon,
      group: 'Tools',
      active: tool === value,
      onSelect: () => onTool(value),
    })),
    { title: 'Settings', icon: SettingsIcon, group: 'System', onSelect: onSettings },
    ...(appUrl
      ? [
          {
            // Under Settings: the trash, folders, sharing and security live in the web app.
            title: 'Open web app',
            url: appUrl,
            icon: ExternalLinkIcon,
            group: 'System',
          },
        ]
      : []),
  ]

  // Where the page sits: the tool's own group, or the vault's for a filter.
  const current = items.find((item) => item.active)
  const group = tool !== null ? (current?.group ?? 'Tools') : 'Vault'
  const title =
    tool !== null
      ? (current?.title ?? 'Vault')
      : (filters.find((f) => f.value === filter)?.label ?? 'Vault')

  // As the web app's: Profile, Billing (Cloud only), Lock vault, then Sign out under a rule.
  const actions: UserMenuAction[] = [
    ...(appUrl
      ? [
          {
            // The profile is a page of the web app: it opens there, in a new tab.
            label: 'Profile',
            icon: UserIcon,
            onSelect: () =>
              void window.open(`${appUrl.replace(/\/$/, '')}/profile`, '_blank', 'noopener'),
          },
        ]
      : []),
    ...(COMMUNITY
      ? []
      : [{ label: 'Billing', icon: CreditCardIcon, onSelect: () => onTool('billing') }]),
    { label: 'Lock vault', icon: LockIcon, onSelect: onLock },
    { label: 'Sign out', icon: LogOutIcon, onSelect: onSignOut, destructive: true },
  ]

  return (
    // The sidebar remembers itself in this cookie.
    <SidebarProvider
      defaultOpen={!document.cookie.includes('sidebar_state=false')}
      className="h-full min-h-0"
      // The rail holds names at the frame's step: it grows with the display.
      style={{ '--sidebar-width': 'calc(15rem * var(--type-step))' } as React.CSSProperties}
    >
      <AppSidebar
        brand={{ name: NAME, logo: '/icons/128.png' }}
        groups={['Vault', 'Tools', 'System']}
        items={items}
        secondary={LINKS_OUT}
      />
      <SidebarInset className="bg-panel min-h-0 overflow-hidden">
        <Topbar group={group} title={title}>
          <HeaderClock />
          <UpdateButton />
          <UserMenu name={user?.name} email={user?.email} actions={actions} onLock={onLock} />
        </Topbar>
        {/* Passes the inset's height on: the list scrolls inside it, not past it.
            No padding of its own: the columns pad themselves, so the line
            between them runs up to the header's. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
