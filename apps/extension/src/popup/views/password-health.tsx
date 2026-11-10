import type { VaultItem } from '@montara-pass/shared/types/vault'

import { passwordHealth } from '@montara-pass/shared/password'
import { maskUsername } from '@montara-pass/shared/username'
import { useMemo } from 'react'

import { GridIcon, RefreshIcon, ShieldIcon } from '../icons'
import { ItemTile } from '../item-tile'

interface PasswordHealthProps {
  /** The decrypted vault; null while it loads. */
  items: VaultItem[] | null
  /** Shows an item in the vault, where it can be edited. */
  onOpen: (id: string) => void
  /** Reads the vault again, and with it checks it again. */
  onRescan: () => void
  rescanning: boolean
  /** Back to the vault's list. */
  onOpenVault: () => void
}

/** A login in a list: the whole row opens it. A weak one says so at its end. */
function Row({ item, weak, onOpen }: { item: VaultItem; weak?: boolean; onOpen: () => void }) {
  return (
    <li>
      <button className="health-row" onClick={onOpen}>
        <ItemTile item={item} />
        <span className="item-text">
          <span className="item-name">{item.secret!.name}</span>
          <span className="muted">
            {item.secret!.username ? maskUsername(item.secret!.username) : 'No username'}
          </span>
        </span>
        {weak && <span className="health-weak">Weak</span>}
      </button>
    </li>
  )
}

/** One card of logins that share a password, each group under a line that names it. */
function ReusedCard({ groups, onOpen }: { groups: VaultItem[][]; onOpen: (id: string) => void }) {
  return (
    <div className="field-group">
      {groups.map((group) => (
        <div key={group[0].id} className="health-group">
          <p className="field-group-head">
            <span className="health-group-name">One password, {group.length} logins</span>
            <span>{group.length} logins</span>
          </p>
          <ul className="health-rows">
            {group.map((item) => (
              <Row key={item.id} item={item} onOpen={() => onOpen(item.id)} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Splits the groups in two, each half about as tall as the other. */
function halves(groups: VaultItem[][]): [VaultItem[][], VaultItem[][]] {
  const halfway = groups.reduce((sum, group) => sum + group.length + 1, 0) / 2
  const left: VaultItem[][] = []
  let rows = 0
  for (const group of groups) {
    if (rows >= halfway) break
    left.push(group)
    rows += group.length + 1
  }
  return [left, groups.slice(left.length)]
}

/**
 * Which logins have a weak password and which share one. The check runs in
 * the browser, on the decrypted vault; no password leaves it.
 */
export default function PasswordHealth({
  items,
  onOpen,
  onRescan,
  rescanning,
  onOpenVault,
}: PasswordHealthProps) {
  const health = useMemo(() => passwordHealth(items ?? []), [items])
  const reusedCount = health.reused.reduce((sum, group) => sum + group.length, 0)
  const findings = reusedCount + health.weak.length
  const [left, right] = halves(health.reused)

  const stat = (value: number) => (value > 0 ? 'health-bad' : 'health-good')

  // Decrypting, the all-clear, or the findings.
  const renderBody = () => {
    if (items === null) {
      return <p className="muted">Decrypting…</p>
    }
    if (findings === 0) {
      return (
        <div className="field-group health-empty">
          <span className="tile">
            <ShieldIcon />
          </span>
          <p className="health-empty-title">
            {health.checked === 0 ? 'Nothing to check yet.' : 'Every login looks healthy.'}
          </p>
          <p className="muted">
            {health.checked === 0
              ? 'No login in the vault has a password. Add one, and its strength shows here.'
              : 'Nothing is reused and nothing is weak. Run the scan again after you add new logins.'}
          </p>
          <div className="detail-empty-actions">
            <button disabled={rescanning} onClick={onRescan}>
              <RefreshIcon width={14} height={14} className={rescanning ? 'spin' : undefined} />
              {rescanning ? 'Scanning…' : 'Run scan'}
            </button>
            <button className="secondary" onClick={onOpenVault}>
              <GridIcon width={14} height={14} />
              Open vault
            </button>
          </div>
          <p className="eyebrow">
            Scanned {health.checked} {health.checked === 1 ? 'login' : 'logins'} · 0 findings
          </p>
        </div>
      )
    }
    return (
      // Reused takes two columns when there are groups enough for two, weak the third.
      <div className="health-grid">
        {health.reused.length > 0 && (
          <section className={right.length > 0 ? 'health-section wide' : 'health-section'}>
            <header>
              <h2>Reused passwords</h2>
              <p className="muted">If one site leaks the password, the others are open too.</p>
            </header>
            <div className={right.length > 0 ? 'health-pair' : undefined}>
              <ReusedCard groups={left} onOpen={onOpen} />
              {right.length > 0 && <ReusedCard groups={right} onOpen={onOpen} />}
            </div>
          </section>
        )}

        {health.weak.length > 0 && (
          <section className="health-section">
            <header>
              <h2>Weak passwords</h2>
              <p className="muted">Short, or made of few kinds of characters, so quick to guess.</p>
            </header>
            <ul className="field-group health-rows">
              {health.weak.map((item) => (
                <Row key={item.id} item={item} weak onOpen={() => onOpen(item.id)} />
              ))}
            </ul>
            <p className="eyebrow">
              {health.weak.length} of {health.checked} logins · open one to fix it
            </p>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="stack detail-body tool-body gen-page">
      <header className="tool-page-head">
        <div className="list-title">
          <p className="eyebrow">Tools</p>
          <h1>Password health</h1>
          <p className="muted">Checked in this browser. No password leaves it.</p>
        </div>
        {items !== null && (
          <dl className="health-stats">
            <div>
              <dt>Checked</dt>
              <dd>{health.checked}</dd>
            </div>
            <div>
              <dt>Reused</dt>
              <dd className={stat(reusedCount)}>{reusedCount}</dd>
            </div>
            <div>
              <dt>Weak</dt>
              <dd className={stat(health.weak.length)}>{health.weak.length}</dd>
            </div>
          </dl>
        )}
      </header>

      <div className="health-body">{renderBody()}</div>
    </div>
  )
}
