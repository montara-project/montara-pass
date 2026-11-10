import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import {
  IconCreditCard,
  IconFileText,
  IconKey,
  IconLayoutGrid,
  IconLock,
  IconLogout,
  IconPassword,
  IconSettings,
  IconShield,
  IconStar,
  IconTrash,
  IconUser,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'

import type { SidebarLink } from '@/components/layout/sidebar/app-sidebar'
import type { NavLinkRenderer } from '@/components/layout/sidebar/nav-item'
import type { UserMenuAction } from '@/components/layout/sidebar/user-menu'

import AppSidebar from '@/components/layout/sidebar/app-sidebar'
import { LINKS_OUT } from '@/components/layout/sidebar/nav-secondary'
import Topbar from '@/components/layout/sidebar/topbar'
import UserMenu from '@/components/layout/sidebar/user-menu'
import UtcClock from '@/components/layout/sidebar/utc-clock'
import { SIDEBAR_COOKIE_NAME, SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { env } from '@/config/env'
import { useSignOut } from '@/hooks/use-sign-out'
import { useItemTotals } from '@/hooks/use-vault'
import { queries } from '@/lib/api/queries'
import { HOME_PATH } from '@/lib/constants/auth'
import { useVaultStore } from '@/lib/stores/vault'

type Icon = SidebarLink['icon']

/** A filter of the vault page: the same route, a narrower list. */
interface VaultView {
  title: string
  icon: Icon
  search: { type?: string; favorite?: boolean }
}

/** The vault's views, in the order the sidebar lists them. */
const VAULT_VIEWS: VaultView[] = [
  { title: 'All items', icon: IconLayoutGrid, search: {} },
  { title: 'Logins', icon: IconKey, search: { type: 'login' } },
  { title: 'Secure notes', icon: IconFileText, search: { type: 'secure_note' } },
  { title: 'Cards', icon: IconCreditCard, search: { type: 'card' } },
  { title: 'Contacts', icon: IconUser, search: { type: 'contact' } },
  { title: 'Favorites', icon: IconStar, search: { favorite: true } },
]

/** Under the vault's views: what was thrown away, until it is emptied. */
const TRASH = { title: 'Trash', url: '/trash', icon: IconTrash } as const

/** The tools, in a group of their own under the vault. */
const TOOLS: { title: string; url: string; icon: Icon }[] = [
  { title: 'Password generator', url: '/generator', icon: IconPassword },
  { title: 'Password health', url: '/health', icon: IconShield },
]

/** Settings, under System: its General tab is its own page, the others are the account's. */
const SETTINGS = { title: 'Settings', url: '/settings', icon: IconSettings } as const

/** The pages Settings' tabs lead to: the sidebar keeps Settings lit on each. */
const SETTINGS_TABS = [SETTINGS.url, '/profile', '/security']

/** In the account menu, above Lock vault and Sign out. Billing is the Cloud Edition's only. */
const MENU = [
  { title: 'Profile', url: '/profile', icon: IconUserCircle },
  ...(COMMUNITY ? [] : [{ title: 'Billing', url: '/billing', icon: IconCreditCard }]),
] as const

/** Under Settings in System. Sharing is the Cloud Edition's only. */
const SYSTEM = COMMUNITY ? [] : [{ title: 'Sharing', url: '/sharing', icon: IconUsers }]

/** The pages the header can name, by the route that shows them. */
const CRUMBS = [
  { ...TRASH, group: 'Vault' },
  ...TOOLS.map((tool) => ({ ...tool, group: 'Tools' })),
  ...SYSTEM.map((item) => ({ ...item, group: 'System' })),
  // Settings' tabs, each named under Settings; before the account menu's own Profile.
  { title: 'General', url: SETTINGS.url, group: 'Settings' },
  { title: 'Profile', url: '/profile', group: 'Settings' },
  { title: 'Security', url: '/security', group: 'Settings' },
  ...MENU.map((item) => ({ ...item, group: 'Account' })),
]

/** The router's Link, so a click moves within the page and the vault's filter rides along. */
const routerLink: NavLinkRenderer = ({ href, search, onClick, children }) => (
  <Link to={href} search={search} onClick={onClick}>
    {children}
  </Link>
)

/** The sidebar writes its state to a cookie; reading it back keeps a folded rail folded. */
const startsOpen = () => !document.cookie.split('; ').includes(`${SIDEBAR_COOKIE_NAME}=false`)

/**
 * The frame of every page after the vault is unlocked: the admin's sidebar on
 * the page itself, and the page on a sheet beside it under a bar that names
 * where it is. In a narrow window the sidebar opens over the page instead.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const items = useSidebarItems()
  // The bar names the lit row: a filter of the vault counts as a page of its own.
  const current = items.find((item) => item.active)
  const crumb = pathname.startsWith('/vault')
    ? { title: current?.title ?? 'All items', group: 'Vault' }
    : CRUMBS.find((crumb) => pathname.startsWith(crumb.url))

  return (
    <SidebarProvider
      defaultOpen={startsOpen()}
      className="h-svh min-h-0"
      // The rail holds names at the frame's step: it grows with the display.
      style={{ '--sidebar-width': 'calc(15rem * var(--type-step))' } as React.CSSProperties}
    >
      <AppSidebar
        brand={{ name: env.VITE_APP_NAME, logo: '/static/logo-128.png' }}
        groups={GROUPS}
        items={items}
        link={routerLink}
        home={HOME_PATH}
        secondary={LINKS_OUT}
      />
      <SidebarInset className="bg-panel h-svh min-w-0 overflow-hidden">
        {/* The sidebar holds a dozen links; a keyboard can go straight to the page. */}
        <a
          href="#app-main"
          className="bg-card text-foreground rounded-control sr-only text-meta font-medium focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-30 focus-visible:border focus-visible:px-3 focus-visible:py-2"
        >
          Skip to content
        </a>
        <Topbar group={crumb?.group} title={crumb?.title ?? 'Vault'}>
          <UtcClock />
          <BarAccount />
        </Topbar>
        {/* main.tsx: scrollToTopSelectors resets it on navigation. */}
        <div
          id="app-main"
          data-scroll-restoration-id="app-main"
          // Focusable so the skip link lands the caret here, not on the next link.
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] focus:outline-none"
        >
          {/* A new element for each page, so each one arrives. As tall as the
              frame, so a page like the vault can hold its list to the screen;
              a longer page runs past it and the frame scrolls. */}
          <div key={pathname} className="page-in h-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** The admin's groups, in order. */
const GROUPS = ['Vault', 'Tools', 'System']

/**
 * The sidebar's rows: the vault's views with their counts and what was thrown
 * away, the tools, and the account's settings with sharing. The one the page
 * shows is lit.
 */
function useSidebarItems(): SidebarLink[] {
  const pathname = useLocation({ select: (location) => location.pathname })
  const search = useLocation({ select: (location) => location.search }) as {
    type?: string
    favorite?: boolean
  }
  const totals = useItemTotals([...VAULT_VIEWS.map((view) => view.search), { trashed: true }])
  const onVault = pathname.startsWith('/vault')

  const views: SidebarLink[] = VAULT_VIEWS.map((view, index) => ({
    title: view.title,
    url: '/vault',
    search: view.search,
    icon: view.icon,
    group: 'Vault',
    badge: totals[index],
    active:
      onVault &&
      search.type === view.search.type &&
      Boolean(search.favorite) === Boolean(view.search.favorite),
  }))

  return [
    ...views,
    {
      ...TRASH,
      group: 'Vault',
      badge: totals[VAULT_VIEWS.length],
      active: pathname.startsWith(TRASH.url),
    },
    ...TOOLS.map((tool) => ({
      ...tool,
      group: 'Tools',
      active: pathname.startsWith(tool.url),
    })),
    { ...SETTINGS, group: 'System', active: SETTINGS_TABS.includes(pathname) },
    ...SYSTEM.map((item) => ({ ...item, group: 'System', active: pathname.startsWith(item.url) })),
  ]
}

/**
 * The bar's avatar: who is signed in, the account's pages the sidebar leaves
 * out, and the two ways out of it, with Lock vault also as a button beside it.
 */
function BarAccount() {
  const navigate = useNavigate()
  const signOut = useSignOut()
  const lock = useVaultStore((state) => state.lock)
  const { data: profile } = useQuery(queries.auth.profile())

  const actions: UserMenuAction[] = [
    ...MENU.map(({ title, url, icon }) => ({
      label: title,
      icon,
      onSelect: () => void navigate({ to: url }),
    })),
    { label: 'Lock vault', icon: IconLock, onSelect: lock },
    { label: 'Sign out', icon: IconLogout, onSelect: () => void signOut(), destructive: true },
  ]

  return (
    <UserMenu
      name={profile?.user.name}
      email={profile?.user.email}
      actions={actions}
      onLock={lock}
    />
  )
}
