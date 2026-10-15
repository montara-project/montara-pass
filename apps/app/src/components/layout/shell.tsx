import {
  IconCategory,
  IconChevronRight,
  IconCreditCard,
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
import { COMMUNITY } from '@/lib/constants/edition'
import { useVaultStore } from '@/lib/stores/vault'
import { initials } from '@/lib/string'

/** Only routes that actually exist are listed. */
const NAV = [
  { title: 'Vault', url: '/vault', icon: IconLock },
  { title: 'Folders', url: '/folders', icon: IconFolders },
  { title: 'Trash', url: '/trash', icon: IconTrash },
  { title: 'Categories', url: '/categories', icon: IconCategory },
] as const

/** Shown at the foot of the sidebar, above the account. */
const TOOLS = [
  { title: 'Password generator', url: '/generator', icon: IconKey },
  { title: 'Password health', url: '/health', icon: IconShieldCheck },
] as const

/** The account menu's pages, named in the breadcrumb only. */
const ACCOUNT = [
  { title: 'Account', url: '/profile' },
  { title: 'Billing', url: '/billing' },
] as const

const CRUMBS = [
  ...NAV.map((item) => ({ group: 'Vault', ...item })),
  ...TOOLS.map((item) => ({ group: 'Tools', ...item })),
  ...ACCOUNT.map((item) => ({ group: 'Account', ...item })),
]

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
        </SidebarContent>

        <SidebarFooter>
          <Account />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-panel min-h-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* A new element for each page, so each one arrives. */}
          <div key={pathname} className="page-in h-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function NavList({ items, pathname }: { items: typeof NAV | typeof TOOLS; pathname: string }) {
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
            {!COMMUNITY && (
              <DropdownMenuItem onClick={() => void navigate({ to: '/billing' })}>
                <IconCreditCard />
                Billing
                <IconChevronRight className="ml-auto size-4!" />
              </DropdownMenuItem>
            )}
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
