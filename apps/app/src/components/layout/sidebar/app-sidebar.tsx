import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from '@/components/ui/sidebar'

import SidebarNavItem, { type IconType, type NavLinkRenderer } from './nav-item'
import NavSecondary, { type NavSecondaryLink } from './nav-secondary'

export interface SidebarLink {
  title: string
  /** A route, which the host's link opens without reloading the page. */
  url?: string
  /** The page's search, for a link that narrows the page rather than moving off it. */
  search?: Record<string, unknown>
  /** What it does, for a page the host has no address for. */
  onSelect?: () => void
  icon: IconType
  /** The group it sits under; a group named '' carries no heading. */
  group: string
  /** A count at the far end. */
  badge?: number
  /** Lit as the page; the caller knows what counts as being on it. */
  active?: boolean
}

interface AppSidebarProps {
  /** The name beside the mark, and the logo it draws. */
  brand: { name: string; logo: string }
  /** The groups, in order. */
  groups: readonly string[]
  /** Every link the sidebar lists, grouped by the names above. */
  items: readonly SidebarLink[]
  /**
   * How a link is rendered. The web app hands in the router's Link, so a click
   * moves within the page; an anchor does for an app with no router.
   */
  link?: NavLinkRenderer
  /** Where the name in the head leads; it is a mark, not a link, without one. */
  home?: string
  /** The small links out, pinned at the foot of the nav. */
  secondary?: readonly NavSecondaryLink[]
}

/**
 * The admin's sidebar, shared by the web app and the extension's full tab: the
 * same column on the page itself, folding to a rail of icons whose names show
 * as tooltips, each group named above its links, and the small links out at
 * its foot. Its head is as tall as the header and shares its rule, so the two
 * read as one line across the page.
 */
export default function AppSidebar({
  brand,
  groups,
  items,
  link,
  home,
  secondary,
}: AppSidebarProps) {
  const mark = (
    <>
      <img src={brand.logo} alt="" width={32} height={32} className="size-8 shrink-0" />
      <span className="text-foreground truncate text-sm font-semibold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
        {brand.name}
      </span>
    </>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border h-(--topbar-h) flex-row items-center border-b px-4 py-0 group-data-[collapsible=icon]:px-2">
        {link && home ? (
          link({
            href: home,
            onClick: () => {},
            children: <span className="flex min-w-0 flex-1 items-center gap-2.5">{mark}</span>,
          })
        ) : (
          // Nowhere else to go: the name stands rather than linking.
          <div className="flex min-w-0 flex-1 items-center gap-2.5">{mark}</div>
        )}
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2.5 pt-2 pb-4 group-data-[collapsible=icon]:px-2">
        {groups.map((group) => {
          const links = items.filter((item) => item.group === group)
          if (links.length === 0) return null
          return (
            <SidebarGroup key={group} className="p-0">
              {group !== '' && (
                <SidebarGroupLabel className="text-subtle-foreground h-auto px-2.5 pb-1.5 text-label leading-normal">
                  {group}
                </SidebarGroupLabel>
              )}
              <SidebarMenu className="gap-px">
                {links.map((item) => (
                  <SidebarNavItem
                    key={`${item.group}:${item.title}`}
                    label={item.title}
                    icon={item.icon}
                    href={item.url}
                    search={item.search}
                    onSelect={item.onSelect}
                    active={item.active ?? false}
                    badge={item.badge}
                    link={item.url !== undefined ? link : undefined}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
        {secondary && secondary.length > 0 && <NavSecondary links={secondary} />}
      </SidebarContent>
      {/* Drag handle for a pointer; the header's trigger already names the action. */}
      <SidebarRail aria-hidden="true" tabIndex={-1} />
    </Sidebar>
  )
}
