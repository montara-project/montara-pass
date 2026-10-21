import type { VaultItem } from '@montara-pass/shared/types/vault'

import { itemIcon } from '@montara-pass/shared/crypto/vault'

import { CardIcon, KeyholeIcon, NoteIcon, UserIcon } from './icons'

/** The line icon per item type; any other type gets the note. */
const TYPE_ICON: Record<string, typeof NoteIcon> = {
  login: KeyholeIcon,
  contact: UserIcon,
  card: CardIcon,
}

/** An item's square: the icon saved with a login, or a line icon without one. */
export function ItemTile({ item, large }: { item: VaultItem; large?: boolean }) {
  const icon = item.type === 'login' ? itemIcon(item.secret) : null
  const Icon = TYPE_ICON[item.type] ?? NoteIcon

  return (
    <span className={`tile${large ? ' tile-large' : ''}${icon ? ' tile-favicon' : ''}`}>
      {icon ? <img src={icon} alt="" /> : <Icon />}
    </span>
  )
}
