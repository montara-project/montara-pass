import { IconKey, IconNote, IconUser } from '@tabler/icons-react'

import type { VaultItem } from '@/types/vault'

import { itemIcon } from '@/lib/crypto/vault'
import { cn } from '@/lib/utils'

/** An item's square: the icon saved with a login, or a line icon without one. */
export default function ItemTile({ item, large }: { item: VaultItem; large?: boolean }) {
  const icon = item.type === 'login' ? itemIcon(item.secret) : null
  const Icon = item.type === 'login' ? IconKey : item.type === 'contact' ? IconUser : IconNote

  return (
    <span
      className={cn(
        // On the page's own tone, so a favicon reads on any surface.
        'bg-background text-foreground inline-flex shrink-0 items-center justify-center border',
        large ? 'rounded-card size-12' : 'rounded-control size-9',
        icon && 'p-1.5'
      )}
    >
      {icon ? (
        <img src={icon} alt="" className="size-full object-contain" />
      ) : (
        <Icon className="size-5" />
      )}
    </span>
  )
}
