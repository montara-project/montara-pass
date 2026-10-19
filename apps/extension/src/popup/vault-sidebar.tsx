import './sidebar.css'

import type { ReactNode } from 'react'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'

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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

import {
  CreditCardIcon,
  ExternalLinkIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldIcon,
  SortIcon,
} from './icons'
import { initials } from './layout'
import { UpdateButton } from './update-button'

type Icon = typeof KeyIcon
export type Tool = 'generator' | 'health' | 'billing'

// group is what the breadcrumb names above the page. Billing is the Cloud
// Edition's only: the Community Edition takes no payments.
const TOOLS: { value: Tool; label: string; group: string; icon: Icon }[] = [
  { value: 'generator', label: 'Password generator', group: 'Tools', icon: KeyIcon },
  { value: 'health', label: 'Password health', group: 'Tools', icon: ShieldIcon },
  ...(COMMUNITY
    ? []
    : [{ value: 'billing' as const, label: 'Billing', group: 'Account', icon: CreditCardIcon }]),
]

interface VaultSidebarProps<F extends string> {
  filters: { value: F; label: string; icon: Icon; count: number }[]
  filter: F
  tool: Tool | null
  appUrl: string
  user?: { name: string; email: string } | null
  onFilter: (filter: F) => void
  onTool: (tool: Tool) => void
  onSettings: () => void
  onLock: () => void
  onSignOut: () => void
  /** The list and the item beside it. */
  children: ReactNode
}

/**
 * The full tab's frame: the web app's inset sidebar (shadcn's sidebar-08)
 * with the filters, the tools and the account, and the vault on a sheet
 * beside it. Every Tailwind class of the extension lives in this file.
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
  const active = TOOLS.find((t) => t.value === tool)
  const current = active
    ? { group: active.group, title: active.label }
    : { group: 'Vault', title: filters.find((f) => f.value === filter)?.label }

  return (
    // The sidebar remembers itself in this cookie.
    <SidebarProvider
      defaultOpen={!document.cookie.includes('sidebar_state=false')}
      className="h-full min-h-0"
    >
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* The name, not a control: there is nowhere else in the extension to go. */}
              <SidebarMenuButton size="lg" asChild className="pointer-events-none">
                <div>
                  <img src="/icons/128.png" alt="" className="size-8 rounded-lg" />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="text-foreground truncate font-semibold">Montara Pass</span>
                    <span className="truncate text-xs">Your vault</span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Vault</SidebarGroupLabel>
            <SidebarMenu>
              {filters.map(({ value, label, icon: Icon, count }) => (
                <SidebarMenuItem key={value}>
                  <Item
                    label={label}
                    active={!tool && filter === value}
                    onClick={() => onFilter(value)}
                  >
                    <Icon />
                  </Item>
                  <SidebarMenuBadge className="tabular-nums">{count}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {TOOLS.map(({ value, label, icon: Icon }) => (
                  <SidebarMenuItem key={value}>
                    <Item label={label} active={tool === value} onClick={() => onTool(value)}>
                      <Icon />
                    </Item>
                  </SidebarMenuItem>
                ))}
                {appUrl && (
                  <SidebarMenuItem>
                    {/* Folders, the trash and who else has an item live in the web app. */}
                    <SidebarMenuButton asChild tooltip="Open web app">
                      <a href={appUrl} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon />
                        <span>Open web app</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <Account user={user} onSettings={onSettings} onLock={onLock} onSignOut={onSignOut} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-panel min-h-0 overflow-hidden">
        <header className="bg-panel border-border sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-6 md:rounded-t-sheet">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">{current.group}</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{current.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <UpdateButton className="ml-auto" />
        </header>
        {/* Passes the inset's height on: the list scrolls inside it, not past it.
            No padding of its own: the columns pad themselves, so the line
            between them runs up to the header's. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** A choice in the sidebar. Over the page on a narrow screen, it steps aside once made. */
function Item({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenuButton
      tooltip={label}
      isActive={active}
      aria-current={active ? 'true' : undefined}
      onClick={() => {
        onClick()
        if (isMobile) setOpenMobile(false)
      }}
    >
      {children}
      <span>{label}</span>
    </SidebarMenuButton>
  )
}

/** The foot of the sidebar: who is signed in, and the ways out. */
function Account({
  user,
  onSettings,
  onLock,
  onSignOut,
}: Pick<VaultSidebarProps<string>, 'user' | 'onSettings' | 'onLock' | 'onSignOut'>) {
  const { isMobile } = useSidebar()

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
              <SortIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuItem onClick={onSettings}>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLock}>
              <LockIcon />
              Lock vault
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
