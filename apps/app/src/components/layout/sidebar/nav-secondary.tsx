import { IconBook, IconBrandGithub, IconMessageReport } from '@tabler/icons-react'

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

import type { IconType } from './nav-item'

export interface NavSecondaryLink {
  title: string
  url: string
  icon: IconType
}

/** The links out at the sidebar's foot, the same in the web app and the extension. */
export const LINKS_OUT: NavSecondaryLink[] = [
  { title: 'Documentation', url: 'https://docs.montarapass.com', icon: IconBook },
  {
    title: 'GitHub',
    url: 'https://github.com/montara-project/montara-pass',
    icon: IconBrandGithub,
  },
  {
    title: 'Feedback',
    url: 'https://github.com/montara-project/montara-pass/issues',
    icon: IconMessageReport,
  },
]

interface NavSecondaryProps {
  links: readonly NavSecondaryLink[]
}

/** Small links out, pinned under the pages; each opens in a new tab. */
export default function NavSecondary({ links }: NavSecondaryProps) {
  return (
    <SidebarGroup className="mt-auto p-0">
      <SidebarMenu className="gap-px">
        {links.map(({ title, url, icon: Icon }) => (
          <SidebarMenuItem key={url}>
            <SidebarMenuButton
              asChild
              size="sm"
              tooltip={title}
              className="text-subtle-foreground hover:text-foreground gap-2.5 rounded-sm px-2.5 text-meta [&>svg]:size-4"
            >
              <a href={url} target="_blank" rel="noreferrer">
                <Icon />
                <span>{title}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
