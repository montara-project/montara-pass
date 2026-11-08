import type { VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { cardEnding, itemIcon } from '@montara-pass/shared/crypto/vault'
import { IconCreditCard, IconKey, IconNote, IconUser } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

/** The line icon per item type; any other type gets the note. */
const TYPE_ICON: Record<string, typeof IconNote> = {
  login: IconKey,
  contact: IconUser,
  card: IconCreditCard,
}

/** An item's square: the icon saved with a login, or a line icon without one. */
export default function ItemTile({ item, large }: { item: VaultItem; large?: boolean }) {
  const icon = item.type === 'login' ? itemIcon(item.secret) : null
  const Icon = TYPE_ICON[item.type] ?? IconNote

  return (
    <span
      className={cn(
        // On the page's own tone, so a favicon reads on any surface.
        'bg-background text-foreground inline-flex shrink-0 items-center justify-center border',
        large ? 'size-11 rounded-xl' : 'size-8 rounded-md',
        icon && (large ? 'p-1.5' : 'p-1')
      )}
    >
      {icon ? (
        <img src={icon} alt="" className="size-full object-contain" />
      ) : (
        <Icon className={large ? 'size-5' : 'size-4'} />
      )}
    </span>
  )
}

/** A row's second line: the username, email or card ending, else the item's type. */
export function itemSubtitle(item: VaultItem) {
  if (item.type === 'login') return item.secret?.username || 'No username'
  if (!item.secret) return ''
  if (item.type === 'contact' && item.secret.contact?.email) return item.secret.contact.email
  if (item.type === 'card') return cardEnding(item.secret.card?.number) ?? ITEM_TYPE_LABEL.card
  return ITEM_TYPE_LABEL[item.type]
}
