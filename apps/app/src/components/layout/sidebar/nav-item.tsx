import type { ComponentType, MouseEvent, ReactNode } from 'react'

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

/** A line icon: the extension's own SVG set, or @tabler's. */
export type IconType = ComponentType<{ className?: string }>

/**
 * How a link is drawn: the host returns its router's own Link, or an anchor.
 * It must return an *element* rather than a component of its own, because the
 * sidebar's button clones it to merge in its classes, tooltip and state.
 */
export type NavLinkRenderer = (props: {
  href: string
  search?: Record<string, unknown>
  onClick: (event: MouseEvent) => void
  children: ReactNode
}) => ReactNode

interface SidebarNavItemProps {
  label: string
  icon: IconType
  /** Where the item goes, when it is a link. */
  href?: string
  /** The page's search, for a link that narrows the page rather than moving off it. */
  search?: Record<string, unknown>
  /** What it does, when it is not a link. */
  onSelect?: () => void
  active?: boolean
  /** A count at the far end, in tabular figures. */
  badge?: number
  link?: NavLinkRenderer
}

/** The plain anchor, for a host with no router. */
const anchor: NavLinkRenderer = ({ href, onClick, children }) => (
  <a href={href} onClick={onClick}>
    {children}
  </a>
)

/**
 * One row of the sidebar's nav, at the admin's scale: a 32px item, muted at
 * rest, body-coloured under the pointer and while its menu is open, the
 * primary wash when it is the page.
 */
export default function SidebarNavItem({
  label,
  icon: Icon,
  href,
  search,
  onSelect,
  active = false,
  badge,
  link = anchor,
}: SidebarNavItemProps) {
  // Over the page on a narrow screen, the drawer steps aside once a choice is made.
  const { isMobile, setOpenMobile } = useSidebar()
  const done = () => {
    if (isMobile) setOpenMobile(false)
  }
  const content = (
    <>
      <Icon />
      <span>{label}</span>
    </>
  )

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={label}
        isActive={active}
        className="text-sidebar-foreground hover:text-foreground data-[state=open]:text-foreground data-[active=true]:bg-primary/12 dark:data-[active=true]:bg-primary/12 data-[active=true]:text-foreground h-(--control-h) gap-2.5 rounded-sm px-2.5 text-meta font-medium [&>svg]:size-4"
      >
        {href === undefined ? (
          <button
            type="button"
            onClick={() => {
              onSelect?.()
              done()
            }}
            aria-current={active ? 'true' : undefined}
          >
            {content}
          </button>
        ) : (
          link({ href, search, onClick: done, children: content })
        )}
      </SidebarMenuButton>
      {badge !== undefined && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}
