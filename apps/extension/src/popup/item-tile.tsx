import { useState } from 'react'

import type { VaultItem } from '@/types/vault'

import { faviconOf } from '../lib/site'
import { KeyholeIcon, NoteIcon } from './icons'

/** An item's square: the site's own icon for a login that has one. */
export function ItemTile({ item, large }: { item: VaultItem; large?: boolean }) {
  const src = item.type === 'login' ? faviconOf(item.secret?.url) : null
  // The address that loaded; the keyhole stays for one that has not, or cannot.
  const [loaded, setLoaded] = useState<string | null>(null)
  const shown = src !== null && loaded === src

  return (
    <span className={`tile${large ? ' tile-large' : ''}${shown ? ' tile-favicon' : ''}`}>
      {!shown && (item.type === 'login' ? <KeyholeIcon /> : <NoteIcon />)}
      {src && (
        <img
          src={src}
          alt=""
          hidden={!shown}
          // The site is not told which extension asked.
          referrerPolicy="no-referrer"
          // Some servers answer a missing icon with a 1×1 image.
          onLoad={(e) => e.currentTarget.naturalWidth > 1 && setLoaded(src)}
        />
      )}
    </span>
  )
}
