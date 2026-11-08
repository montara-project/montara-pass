import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { initials } from '@montara-pass/shared/string'
import {
  IconCreditCard,
  IconFileText,
  IconFolders,
  IconForbid,
  IconKey,
  IconLayoutGrid,
  IconLock,
  IconLogout,
  IconPassword,
  IconSelector,
  IconShield,
  IconShieldCheck,
  IconStar,
  IconTrash,
  IconUser,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'

import ServerTime from '@/components/layout/server-time'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { env } from '@/config/env'
import { useSignOut } from '@/hooks/use-sign-out'
import { useItemTotals } from '@/hooks/use-vault'
import { queries } from '@/lib/api/queries'
import { HOME_PATH } from '@/lib/constants/auth'
import { useVaultStore } from '@/lib/stores/vault'

/** The vault's views, each a filter of the vault page, with how many items it holds. */
const VAULT_VIEWS: {
  title: string
  icon: React.ElementType
  search: { type?: string; favorite?: boolean }
}[] = [
  { title: 'All items', icon: IconLayoutGrid, search: {} },
  { title: 'Logins', icon: IconKey, search: { type: 'login' } },
  { title: 'Secure notes', icon: IconFileText, search: { type: 'secure_note' } },
  { title: 'Cards', icon: IconCreditCard, search: { type: 'card' } },
  { title: 'Contacts', icon: IconUser, search: { type: 'contact' } },
  { title: 'Favorites', icon: IconStar, search: { favorite: true } },
]

/** Shown at the foot of the sidebar, above the account. */
const TOOLS = [
  { title: 'Password generator', url: '/generator', icon: IconPassword, group: 'Tools' },
  { title: 'Password health', url: '/health', icon: IconShield, group: 'Tools' },
  // How the account signs in, where it is signed in, and what happened.
  { title: 'Security', url: '/security', icon: IconShieldCheck, group: 'Account' },
] as const

/** In the account menu: the vault's other pages and the account's own. */
const MENU = [
  { title: 'Profile', url: '/profile', icon: IconUserCircle, group: 'Account' },
  { title: 'Manage folders', url: '/folders', icon: IconFolders, group: 'Vault' },
  { title: 'Trash', url: '/trash', icon: IconTrash, group: 'Vault' },
  // Sharing is the Cloud Edition's: the Community server has one user.
  ...(COMMUNITY
    ? []
    : [{ title: 'Manage sharing', url: '/sharing', icon: IconUsers, group: 'Vault' } as const]),
  // Billing is the Cloud Edition's: the Community server takes no payments.
  ...(COMMUNITY
    ? []
    : [{ title: 'Billing', url: '/billing', icon: IconCreditCard, group: 'Account' } as const]),
] as const

/** The super user's pages. Hidden from everyone else, and the route refuses them too. */
const ADMIN = [
  { title: 'IP blocks', url: '/settings/ip-blocks', icon: IconForbid, group: 'Admin' },
] as const

/** Only routes that actually exist are listed, and each names its breadcrumb group. */
const CRUMBS = [{ title: 'Vault', url: '/vault', group: 'Vault' }, ...TOOLS, ...MENU, ...ADMIN]

/**
 * The frame of every page after the vault is unlocked: an inset sidebar
 * (shadcn's sidebar-08) that folds to its icons, and the page on a sheet
 * beside it. In a narrow window the sidebar opens over the page instead.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  // The page, not its filters: choosing an item or a folder is not a move.
  const pathname = useLocation({ select: (location) => location.pathname })
  const current = CRUMBS.find((crumb) => pathname.startsWith(crumb.url))

  return (
    // The sidebar remembers itself in this cookie.
    <SidebarProvider
      defaultOpen={!document.cookie.includes('sidebar_state=false')}
      className="h-svh"
    >
      <Sidebar variant="inset" collapsible="icon">
        {/* As tall as the page's header, with its line along the bottom: the
            two lines meet as one, open or folded. */}
        <SidebarHeader className="relative h-14 shrink-0 justify-center gap-0 py-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to={HOME_PATH}>
                  <img src="/static/logo-128.png" alt="" className="size-8 rounded-lg" />
                  <div className="grid flex-1 gap-0.5 text-left leading-tight">
                    <span className="text-foreground truncate text-[15px] font-semibold tracking-[-0.01em]">
                      {env.VITE_APP_NAME}
                    </span>
                    <span className="truncate text-xs font-normal">
                      {COMMUNITY ? 'Community Edition' : 'Your vault'}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator className="absolute inset-x-0 bottom-0 mx-0 w-auto" />
        </SidebarHeader>

        <SidebarContent className="pt-2">
          <SidebarGroup>
            <SidebarGroupLabel>Vault</SidebarGroupLabel>
            <VaultViews pathname={pathname} />
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <NavList items={TOOLS} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-1">
          <SidebarSeparator className="mx-0.5 bg-sidebar-border/50" />
          <Account />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-panel min-h-0 overflow-hidden">
        <header className="bg-panel border-border sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-6 md:rounded-t-sheet">
          <SidebarTrigger className="-ml-2" />
          {current && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">{current.group}</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{current.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <ServerTime className="ml-auto" />
        </header>
        {/* A new scroller for each page, so each one arrives at its top. It is
            what moves as the page arrives, and the inset clips it: the content
            never overflows, so no scrollbar flashes. */}
        <div key={pathname} className="page-in min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** The vault's views, each with its count; the one the vault page shows is lit. */
function VaultViews({ pathname }: { pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const search = useLocation({ select: (location) => location.search }) as {
    type?: string
    favorite?: boolean
  }
  const totals = useItemTotals(VAULT_VIEWS.map((view) => view.search))
  const onVault = pathname.startsWith('/vault')

  return (
    <SidebarMenu>
      {VAULT_VIEWS.map(({ title, icon: Icon, search: view }, index) => {
        const active =
          onVault &&
          search.type === view.type &&
          Boolean(search.favorite) === Boolean(view.favorite)
        return (
          <SidebarMenuItem key={title}>
            <SidebarMenuButton asChild tooltip={title} isActive={active}>
              <Link
                to="/vault"
                search={view}
                aria-current={active ? 'page' : undefined}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <Icon />
                <span>{title}</span>
              </Link>
            </SidebarMenuButton>
            {totals[index] !== undefined && <SidebarMenuBadge>{totals[index]}</SidebarMenuBadge>}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

type NavItem = { title: string; url: string; icon: React.ElementType; group: string }

function NavList({ items, pathname }: { items: readonly NavItem[]; pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      {items.map(({ title, url, icon: Icon }) => (
        <SidebarMenuItem key={url}>
          <SidebarMenuButton asChild tooltip={title} isActive={pathname.startsWith(url)}>
            {/* Over the page in a narrow window, so it steps aside once a page is chosen. */}
            <Link to={url} onClick={() => isMobile && setOpenMobile(false)}>
              <Icon />
              <span>{title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

/** The foot of the sidebar: who is signed in, the account's other pages, and the ways out. */
function Account() {
  const navigate = useNavigate()
  const signOut = useSignOut()
  const lock = useVaultStore((state) => state.lock)
  const { isMobile } = useSidebar()
  const { data: profile, isError, refetch } = useQuery(queries.auth.profile())
  const user = profile?.user
  // The Admin pages are the super user's: hidden until the role says so.
  const { data: role } = useQuery(queries.security.role())
  const pages = role?.role === 'super_user' ? [...MENU, ...ADMIN] : MENU

  if (isError && !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="text-danger" onClick={() => void refetch()}>
            <span>Couldn't load your profile. Try again</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="Account"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <span
                aria-hidden="true"
                className="bg-avatar text-avatar-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              >
                {user ? initials(user.name || user.email) : ''}
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="text-foreground truncate text-sm font-semibold">
                  {user?.name || 'Account'}
                </span>
                {user && <span className="truncate text-[13px] font-normal">{user.email}</span>}
              </div>
              <IconSelector className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            {pages.map(({ title, url, icon: Icon }) => (
              <DropdownMenuItem key={url} onClick={() => void navigate({ to: url })}>
                <Icon />
                {title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={lock}>
              <IconLock />
              Lock vault
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <IconLogout />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
