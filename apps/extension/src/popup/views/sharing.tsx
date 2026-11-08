import type { Models } from '@montara-pass/shared/api/models'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { initials, errorMessage } from '@montara-pass/shared/string'
import { useEffect, useMemo, useState } from 'react'

import { listShared, SignedOutError } from '../../lib/api'
import { itemSubtitle, ItemTile } from '../item-tile'

interface SharingProps {
  /** The decrypted vault, which names the items; null while it loads. */
  items: VaultItem[] | null
  /** The signed-in user's email: they are not counted among the people. */
  meEmail?: string
  /** The session ended underneath the page. */
  onSignedOut: () => void
  /** Who can open an item you own, in the share pane beside the list. */
  onManage: (id: string) => void
  /** An item, in the vault. */
  onOpen: (id: string) => void
}

/**
 * The items that are shared, either way: the ones you own and others can
 * open, and the ones others share with you. The server says who can open
 * each; the names come from the vault decrypted here.
 */
export default function Sharing({ items, meEmail, onSignedOut, onManage, onOpen }: SharingProps) {
  const [shared, setShared] = useState<Models.SharedItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listShared().then(setShared, (err) => {
      if (err instanceof SignedOutError) onSignedOut()
      else setError(errorMessage(err, 'The shared items could not be read'))
    })
  }, [onSignedOut])

  const byId = useMemo(() => new Map((items ?? []).map((item) => [item.id, item])), [items])
  const rows = (shared ?? []).flatMap((s) => {
    const item = byId.get(s.id)
    return item?.secret ? [{ item, members: s.members }] : []
  })
  // Everyone else who can open your shared items.
  const people = new Set(
    rows.flatMap(({ members }) => members.filter((m) => m.email !== meEmail).map((m) => m.user_id))
  )

  // Loading, nothing shared, or the list.
  const renderList = () => {
    if (shared === null) {
      return !error && <p className="muted">Loading…</p>
    }
    if (rows.length === 0) {
      return (
        <div className="field-group health-empty">
          <p className="health-empty-title">Nothing is shared yet</p>
          <p className="muted">
            Share an item from its More menu, with someone who has a vault, and it shows here.
          </p>
        </div>
      )
    }
    return (
      <div className="field-group">
        <ul className="sec-rows">
          {rows.map(({ item, members }) => {
            const owner = item.role === 'owner'
            return (
              <li key={item.id}>
                <ItemTile item={item} />
                <span className="item-text">
                  <span className="item-name">{item.secret!.name}</span>
                  <span className="eyebrow share-sub">{itemSubtitle(item)}</span>
                </span>
                <span
                  className="share-people"
                  role="img"
                  aria-label={members.map((m) => m.name || m.email).join(', ')}
                >
                  {members.slice(0, 3).map((m) => (
                    <span
                      key={m.user_id}
                      className={m.role === 'owner' ? 'share-avatar owner' : 'share-avatar'}
                      title={`${m.name || m.email} · ${m.role}`}
                    >
                      {initials(m.name || m.email)}
                    </span>
                  ))}
                  {members.length > 3 && (
                    <span className="share-avatar">+{members.length - 3}</span>
                  )}
                </span>
                <span className={owner ? 'share-role owner' : 'share-role'}>{item.role}</span>
                <button
                  className="secondary small"
                  onClick={() => (owner ? onManage(item.id) : onOpen(item.id))}
                >
                  {owner ? 'Manage' : 'Open'}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="field-group-foot">
          <span>
            {rows.length} shared {rows.length === 1 ? 'item' : 'items'}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="stack detail-body tool-body gen-page">
      <header className="tool-page-head">
        <div className="list-title">
          <p className="eyebrow">Vault · Sharing</p>
          <h1>Manage sharing</h1>
          <p className="muted">
            Who can open an item, and whether they can only read it or also change it.
          </p>
        </div>
        <dl className="health-stats">
          <div>
            <dt>Shared items</dt>
            <dd>{shared === null ? '—' : rows.length}</dd>
          </div>
          <div>
            <dt>People</dt>
            <dd>{shared === null ? '—' : people.size}</dd>
          </div>
        </dl>
      </header>

      <div className="sec-body">
        {error && <p className="error">{error}</p>}
        <section className="sec-section">
          <h2 className="eyebrow">Shared items</h2>
          {renderList()}
          <p className="eyebrow">
            Viewers read an item · editors can change it too · only its owner shares it
          </p>
        </section>
      </div>
    </div>
  )
}
