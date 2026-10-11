import type { VaultItem } from '@/types/vault'

import { itemIcon } from '@/lib/crypto/vault'

import { KeyholeIcon, NoteIcon } from './icons'

/** An item's square: the icon saved with a login, or a keyhole without one. */
export function ItemTile({ item, large }: { item: VaultItem; large?: boolean }) {
  const icon = item.type === 'login' ? itemIcon(item.secret) : null

  return (
    <span className={`tile${large ? ' tile-large' : ''}${icon ? ' tile-favicon' : ''}`}>
      {icon ? <img src={icon} alt="" /> : item.type === 'login' ? <KeyholeIcon /> : <NoteIcon />}
    </span>
  )
}
