import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { initials } from '@montara-pass/shared/string'
import {
  IconChevronRight,
  IconCreditCard,
  IconForbid,
  IconFolders,
  IconKey,
  IconLock,
  IconLogout,
  IconSelector,
  IconShieldCheck,
  IconTrash,
  IconUserCircle,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'

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
import { Separator } from '@/components/ui/separator'
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { env } from '@/config/env'
import { useSignOut } from '@/hooks/use-sign-out'
import { queries } from '@/lib/api/queries'
import { HOME_PATH } from '@/lib/constants/auth'
import { useVaultStore } from '@/lib/stores/vault'

/** Only routes that actually exist are listed, and each names its breadcrumb group. */
const NAV = [
  { title: 'Vault', url: '/vault', icon: IconLock, group: 'Vault' },
  { title: 'Folders', url: '/folders', icon: IconFolders, group: 'Vault' },
  { title: 'Trash', url: '/trash', icon: IconTrash, group: 'Vault' },
] as const

/** Shown at the foot of the sidebar, above the account. */
const TOOLS = [
  { title: 'Password generator', url: '/generator', icon: IconKey, group: 'Tools' },
  { title: 'Password health', url: '/health', icon: IconShieldCheck, group: 'Tools' },
  // Billing is the Cloud Edition's: the Community server takes no payments.
  ...(COMMUNITY
    ? []
    : [{ title: 'Billing', url: '/billing', icon: IconCreditCard, group: 'Account' } as const]),
] as const

/** Named in the breadcrumb only: the account menu is the way to it. */
const ACCOUNT = [{ title: 'Account', url: '/profile', group: 'Account' }] as const

/** The super user's pages. Hidden from everyone else, and the route refuses them too. */
const ADMIN = [
  { title: 'IP blocks', url: '/settings/ip-blocks', icon: IconForbid, group: 'Admin' },
] as const

const CRUMBS = [...NAV, ...TOOLS, ...ADMIN, ...ACCOUNT]

/**
 * The frame of every page after the vault is unlocked: an inset sidebar
 * (shadcn's sidebar-08) that folds to its icons, and the page on a sheet
 * beside it. In a narrow window the sidebar opens over the page instead.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  // The page, not its filters: choosing an item or a folder is not a move.
  const pathname = useLocation({ select: (location) => location.pathname })
  const current = CRUMBS.find((crumb) => pathname.startsWith(crumb.url))
  // The Admin group is the super user's: hidden until the role says so.
  const { data: role } = useQuery(queries.security.role())
  const isSuper = role?.role === 'super_user'

  return (
    // The sidebar remembers itself in this cookie.
    <SidebarProvider
      defaultOpen={!document.cookie.includes('sidebar_state=false')}
      className="h-svh"
    >
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to={HOME_PATH}>
                  <img src="/static/logo-128.png" alt="" className="size-8 rounded-lg" />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="text-foreground truncate font-semibold">
                      {env.VITE_APP_NAME}
                    </span>
                    <span className="truncate text-xs">
                      {COMMUNITY ? 'Community Edition' : 'Password manager'}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Vault</SidebarGroupLabel>
            <NavList items={NAV} pathname={pathname} />
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <NavList items={TOOLS} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
          {isSuper && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <NavList items={ADMIN} pathname={pathname} />
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <Account />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-panel min-h-0 overflow-hidden">
        <header className="bg-panel border-border sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-6 md:rounded-t-sheet">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
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

/** The foot of the sidebar: who is signed in, and the ways out. */
function Account() {
  const navigate = useNavigate()
  const signOut = useSignOut()
  const lock = useVaultStore((state) => state.lock)
  const { isMobile } = useSidebar()
  const { data: profile, isError, refetch } = useQuery(queries.auth.profile())
  const user = profile?.user

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
                className="bg-avatar text-avatar-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              >
                {user ? initials(user.name || user.email) : ''}
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="text-foreground truncate font-semibold">
                  {user?.name || 'Account'}
                </span>
                {user && <span className="truncate text-xs">{user.email}</span>}
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
            <DropdownMenuItem onClick={() => void navigate({ to: '/profile' })}>
              <IconUserCircle />
              Account
              <IconChevronRight className="ml-auto size-4!" />
            </DropdownMenuItem>
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
