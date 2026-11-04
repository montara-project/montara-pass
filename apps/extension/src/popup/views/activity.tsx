import type { Models } from '@montara-pass/shared/api/models'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { describeActivity, deviceName } from '@montara-pass/shared/activity'
import { formatDateTime } from '@montara-pass/shared/date'
import { errorMessage } from '@montara-pass/shared/string'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getProfile, listActivity, SignedOutError } from '../../lib/api'
import { HistoryIcon } from '../icons'

interface ActivityLogProps {
  /** The decrypted vault, which names the items; null while it loads. */
  items: VaultItem[] | null
  /** The session ended underneath the page. */
  onSignedOut: () => void
}

/**
 * The signed-in user's activity log: their sign-ins, what they did to items,
 * and what others did to the items they share. The server names an item by
 * id only; its name comes from the vault decrypted here.
 */
export default function ActivityLog({ items, onSignedOut }: ActivityLogProps) {
  const [rows, setRows] = useState<Models.Activity[] | null>(null)
  const [total, setTotal] = useState(0)
  const [meId, setMeId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    async (offset: number) => {
      setBusy(true)
      try {
        const page = await listActivity(offset)
        setRows((prev) => [...(offset > 0 ? (prev ?? []) : []), ...page.rows])
        setTotal(page.total)
        setError('')
      } catch (err) {
        if (err instanceof SignedOutError) onSignedOut()
        else setError(errorMessage(err, 'The activity could not be read'))
      } finally {
        setBusy(false)
      }
    },
    [onSignedOut]
  )

  useEffect(() => {
    void load(0)
    void getProfile()
      .then((profile) => setMeId(profile.user.id))
      .catch(() => undefined)
  }, [load])

  const names = useMemo(
    () => new Map((items ?? []).map((item) => [item.id, item.secret?.name])),
    [items]
  )

  return (
    <div className="stack detail-body tool-body">
      <header className="detail-head">
        <span className="tile tile-large">
          <HistoryIcon />
        </span>
        <div className="item-text">
          <h2 className="detail-title">Activity</h2>
          <span className="muted">
            Your sign-ins, and who changed or shared your items. Kept for 90 days.
          </span>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {rows === null && !error && <p className="muted">Loading…</p>}
      {rows?.length === 0 && <p className="muted">No activity yet.</p>}

      {rows && rows.length > 0 && (
        <ul className="items health-list">
          {rows.map((row) => (
            <li key={row.id} className="activity-row">
              <span className="item-text">
                <span className="item-name">
                  {describeActivity(row, meId, row.item_id ? names.get(row.item_id) : undefined)}
                </span>
                <span className="muted">
                  {formatDateTime(row.created_at)}
                  {row.action === 'sign_in' &&
                    ` · ${deviceName(row.user_agent) || 'Unknown device'}${row.ip ? ` · ${row.ip}` : ''}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows && rows.length < total && (
        <button className="link" disabled={busy} onClick={() => void load(rows.length)}>
          {busy ? 'Loading…' : 'Show more'}
        </button>
      )}
    </div>
  )
}
