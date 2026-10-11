import { useMemo } from 'react'

import type { VaultItem } from '@/types/vault'

import { passwordHealth } from '@/lib/password'

import { ShieldIcon } from '../icons'
import { ItemTile } from '../item-tile'

interface PasswordHealthProps {
  /** The decrypted vault; null while it loads. */
  items: VaultItem[] | null
  /** Shows an item in the vault, where it can be edited. */
  onOpen: (id: string) => void
}

function Rows({ items, onOpen }: { items: VaultItem[]; onOpen: (id: string) => void }) {
  return (
    <ul className="items health-list">
      {items.map((item) => (
        <li key={item.id}>
          <ItemTile item={item} />
          <div className="item-text">
            <span className="item-name">{item.secret!.name}</span>
            <span className="muted">{item.secret!.username || 'No username'}</span>
          </div>
          <button className="link" onClick={() => onOpen(item.id)}>
            Open
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Which logins have a weak password and which share one. The check runs in
 * the browser, on the decrypted vault; no password leaves it.
 */
export default function PasswordHealth({ items, onOpen }: PasswordHealthProps) {
  const health = useMemo(() => passwordHealth(items ?? []), [items])
  const reusedCount = health.reused.reduce((sum, group) => sum + group.length, 0)

  return (
    <div className="stack detail-body">
      <header className="detail-head">
        <span className="tile tile-large">
          <ShieldIcon />
        </span>
        <div className="item-text">
          <h2 className="detail-title">Password health</h2>
          <span className="muted">Checked in this browser. No password leaves it.</span>
        </div>
      </header>

      {items === null ? (
        <p className="muted">Decrypting…</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt className="muted">Logins checked</dt>
              <dd>{health.checked}</dd>
            </div>
            <div>
              <dt className="muted">Reused</dt>
              <dd className={reusedCount > 0 ? 'error' : undefined}>{reusedCount}</dd>
            </div>
            <div>
              <dt className="muted">Weak</dt>
              <dd className={health.weak.length > 0 ? 'error' : undefined}>{health.weak.length}</dd>
            </div>
          </dl>

          {health.checked > 0 && reusedCount === 0 && health.weak.length === 0 && (
            <p className="muted">
              Nothing to fix: every login has its own password, and none is short or simple.
            </p>
          )}

          {health.reused.length > 0 && (
            <section className="stack">
              <h3 className="section-title">Reused passwords</h3>
              <p className="muted">
                If one of these sites leaks the password, the others are open too.
              </p>
              {health.reused.map((group) => (
                <div key={group[0].id}>
                  <p className="muted meta">One password, {group.length} logins</p>
                  <Rows items={group} onOpen={onOpen} />
                </div>
              ))}
            </section>
          )}

          {health.weak.length > 0 && (
            <section className="stack">
              <h3 className="section-title">Weak passwords</h3>
              <p className="muted">Short, or made of few kinds of characters, so quick to guess.</p>
              <Rows items={health.weak} onOpen={onOpen} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
