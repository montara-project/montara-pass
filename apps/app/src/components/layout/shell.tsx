import {
  IconCategory,
  IconCreditCard,
  IconChevronRight,
  IconFolders,
  IconKey,
  IconLayoutSidebar,
  IconLock,
  IconLogout,
  IconSelector,
  IconShieldCheck,
  IconTrash,
  IconUserCircle,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { env } from '@/config/env'
import { useSignOut } from '@/hooks/use-sign-out'
import { queries } from '@/lib/api/queries'
import { HOME_PATH } from '@/lib/constants/auth'
import { COMMUNITY } from '@/lib/constants/edition'
import { useVaultStore } from '@/lib/stores/vault'
import { initials } from '@/lib/string'
import { cn } from '@/lib/utils'

/** Where the folded sidebar is remembered, in this browser. */
const SIDE_KEY = 'side'

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

const sideItem =
  'text-muted-foreground hover:bg-hover hover:text-foreground data-[status=active]:bg-panel dark:data-[status=active]:bg-card data-[status=active]:text-foreground rounded-control flex h-10 w-full items-center gap-3 px-2.5 font-medium whitespace-nowrap transition-colors duration-[120ms] motion-reduce:transition-none max-[860px]:w-auto min-[861px]:group-data-[collapsed=true]/shell:justify-center min-[861px]:group-data-[collapsed=true]/shell:px-0'

/** Out of sight but still the name of the link: the icon alone says nothing to a screen reader. */
const sideLabel = 'min-[861px]:group-data-[collapsed=true]/shell:sr-only'

function NavList({ items, collapsed }: { items: typeof NAV | typeof TOOLS; collapsed: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 max-[860px]:flex-row">
      {items.map(({ title, url, icon: Icon }) => (
        <li key={url}>
          <Link to={url} className={sideItem} title={collapsed ? title : undefined}>
            <Icon className="size-5 shrink-0" />
            <span className={sideLabel}>{title}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * The frame of every page after the vault is unlocked: the sidebar sits on
 * the page itself, and the content on a sheet raised from it by tone alone.
 * In a narrow window the sidebar becomes a strip along the top.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDE_KEY) === 'collapsed')
  // The page, not its filters: choosing an item or a folder is not a move.
  const pathname = useLocation({ select: (location) => location.pathname })

  const toggle = () => {
    setCollapsed((was) => {
      localStorage.setItem(SIDE_KEY, was ? '' : 'collapsed')
      return !was
    })
  }

  return (
    <div
      data-collapsed={collapsed}
      className="group/shell bg-background grid h-svh grid-cols-[248px_minmax(0,1fr)] transition-[grid-template-columns] duration-[160ms] ease-out-expo motion-reduce:transition-none data-[collapsed=true]:grid-cols-[64px_minmax(0,1fr)] max-[860px]:grid-cols-1! max-[860px]:grid-rows-[auto_minmax(0,1fr)]"
    >
      <nav
        aria-label="Main"
        className="flex min-h-0 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3 py-4 max-[860px]:flex-row max-[860px]:items-center max-[860px]:overflow-x-auto max-[860px]:overflow-y-hidden max-[860px]:px-3 max-[860px]:py-2"
      >
        <div className="flex items-center gap-2.5 px-2 pt-1 pb-4 max-[860px]:hidden min-[861px]:group-data-[collapsed=true]/shell:flex-col min-[861px]:group-data-[collapsed=true]/shell:px-0 min-[861px]:group-data-[collapsed=true]/shell:pb-3">
          <Link to={HOME_PATH} className="flex min-w-0 items-center gap-2.5 rounded-control">
            <img src="/static/logo-128.png" alt="" width={36} height={36} className="size-9" />
            <strong
              className={cn('truncate text-base font-semibold tracking-[-0.01em]', sideLabel)}
            >
              {env.VITE_APP_NAME}
            </strong>
          </Link>
          <Button
            variant="ghost"
            mode="icon"
            size="icon"
            className="ml-auto min-[861px]:group-data-[collapsed=true]/shell:ml-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggle}
          >
            <IconLayoutSidebar />
          </Button>
        </div>

        <NavList items={NAV} collapsed={collapsed} />
        <span className="flex-1 max-[860px]:hidden" />
        <NavList items={TOOLS} collapsed={collapsed} />

        <Account collapsed={collapsed} />
      </nav>

      <main className="rounded-tl-sheet bg-panel min-h-0 overflow-y-auto max-[860px]:rounded-t-sheet">
        {/* A new element for each page, so each one arrives. */}
        <div key={pathname} className="page-in h-full">
          {children}
        </div>
      </main>
    </div>
  )
}

/** The foot of the sidebar: who is signed in, and the ways out. */
function Account({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate()
  const signOut = useSignOut()
  const lock = useVaultStore((state) => state.lock)
  const { data: profile, isError, refetch } = useQuery(queries.auth.profile())
  const user = profile?.user

  return (
    <div className="mt-2 border-t pt-2 max-[860px]:sticky max-[860px]:right-0 max-[860px]:mt-0 max-[860px]:ml-auto max-[860px]:shrink-0 max-[860px]:border-0 max-[860px]:bg-background max-[860px]:pt-0 max-[860px]:pl-2">
      {isError && !user ? (
        <button
          type="button"
          className="text-danger hover:bg-hover rounded-control w-full px-2 py-2 text-left text-[13px]"
          onClick={() => void refetch()}
        >
          <span className={sideLabel}>Couldn't load your profile. Try again</span>
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account"
              className="text-muted-foreground hover:bg-hover data-[state=open]:bg-hover rounded-control flex w-full items-center gap-2.5 p-2 text-left transition-colors duration-[120ms] motion-reduce:transition-none max-[860px]:p-1 min-[861px]:group-data-[collapsed=true]/shell:justify-center min-[861px]:group-data-[collapsed=true]/shell:p-1"
            >
              <span
                aria-hidden="true"
                className="bg-avatar text-avatar-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              >
                {user ? initials(user.name || user.email) : ''}
              </span>
              <span
                className={cn(
                  'flex min-w-0 flex-1 flex-col max-[860px]:hidden',
                  collapsed && 'min-[861px]:hidden'
                )}
              >
                <span className="text-foreground truncate font-semibold">
                  {user?.name || 'Account'}
                </span>
                {user && <span className="truncate text-[13px]">{user.email}</span>}
              </span>
              <IconSelector
                className={cn(
                  'size-4 shrink-0 max-[860px]:hidden',
                  collapsed && 'min-[861px]:hidden'
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
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
      )}
    </div>
  )
}
