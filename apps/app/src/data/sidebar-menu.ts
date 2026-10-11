import {
  IconCategory,
  IconFolders,
  IconKey,
  IconLock,
  IconShieldCheck,
  IconTrash,
  IconUserCircle,
} from '@tabler/icons-react'

import type { NavMainItem, SidebarMenuData } from '@/types/menu'

const NAV_VAULT: NavMainItem = {
  title: 'Vault',
  url: '/vault',
  icon: IconLock,
  isActive: true,
  items: [],
}

const NAV_FOLDERS: NavMainItem = {
  title: 'Folders',
  url: '/folders',
  icon: IconFolders,
  items: [],
}

const NAV_TRASH: NavMainItem = {
  title: 'Trash',
  url: '/trash',
  icon: IconTrash,
  items: [],
}

const NAV_CATEGORIES: NavMainItem = {
  title: 'Categories',
  url: '/categories',
  icon: IconCategory,
  items: [],
}

const NAV_PROFILE: NavMainItem = {
  title: 'Profile',
  url: '/profile',
  icon: IconUserCircle,
  items: [],
}

const NAV_GENERATOR: NavMainItem = {
  title: 'Password Generator',
  url: '/generator',
  icon: IconKey,
  items: [],
}

const NAV_HEALTH: NavMainItem = {
  title: 'Password Health',
  url: '/health',
  icon: IconShieldCheck,
  items: [],
}

/** Only routes that actually exist are listed. */
export const SIDEBAR_MENU: SidebarMenuData = {
  navMenu: {
    overview: [NAV_VAULT, NAV_FOLDERS, NAV_TRASH, NAV_CATEGORIES, NAV_PROFILE],
    // Shown at the foot of the sidebar, above the account.
    tools: [NAV_GENERATOR, NAV_HEALTH],
  },
}
