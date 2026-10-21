import type { VaultItem } from '@montara-pass/shared/types/vault'

import { ITEM_TYPE_LABEL } from '@montara-pass/shared/constants/vault'
import { cardEnding, itemIcon } from '@montara-pass/shared/crypto/vault'

import { maskUsername } from '../lib/username'
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

/** A row's second line: the masked username, email or card ending, else the item's type. */
export function itemSubtitle(item: VaultItem) {
  const secret = item.secret!
  if (item.type === 'login') return secret.username ? maskUsername(secret.username) : 'No username'
  if (item.type === 'contact' && secret.contact?.email) return secret.contact.email
  if (item.type === 'card') return cardEnding(secret.card?.number) ?? ITEM_TYPE_LABEL.card
  return ITEM_TYPE_LABEL[item.type]
}
