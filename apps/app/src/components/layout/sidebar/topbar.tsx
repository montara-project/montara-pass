import type { ReactNode } from 'react'

import { IconLayoutSidebar } from '@tabler/icons-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/components/ui/sidebar'

interface TopbarProps {
  /** The page's name, and the group it belongs to above it on a wide screen. */
  group?: string
  title: string
  /** The bar's far end: the clock, and whatever else the page has to offer. */
  children?: ReactNode
}

/**
 * The bar across the top of the sheet: the sidebar's trigger, then where the
 * page sits, then what belongs at the far end. It is as tall as the sidebar's
 * own head and on the sidebar's tone, so the two read as one frame around
 * the sheet.
 */
export default function Topbar({ group, title, children }: TopbarProps) {
  const { toggleSidebar } = useSidebar()

  return (
    <header
      data-slot="topbar"
      className="bg-sidebar border-border z-20 flex h-(--topbar-h) shrink-0 items-center gap-3 border-b px-4 md:px-8"
    >
      <div className="flex min-w-0 items-center">
        {/* Folds the sidebar to its rail (also ⌘B); on a phone it opens the drawer. */}
        <Button
          aria-label="Toggle sidebar"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="-ml-2 size-9"
        >
          <IconLayoutSidebar stroke={1.75} />
        </Button>
        {/* The button pads its icon by 8px; 4 more puts the rule 12px from the icon and the name. */}
        <Separator orientation="vertical" className="mr-3 ml-1 data-[orientation=vertical]:h-4" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList>
            {group && (
              <>
                <BreadcrumbItem className="hidden md:block">{group}</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </header>
  )
}
