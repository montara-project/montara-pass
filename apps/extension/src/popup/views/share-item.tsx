import { useEffect, useRef, useState, type FormEvent } from 'react'

import type { Models } from '@/lib/api/models'
import type { VaultItem } from '@/types/vault'

import { SHARE_ROLES, type ShareRole } from '@/lib/constants/vault'
import { wrapItemKeyFor, type VaultKeys } from '@/lib/crypto/vault'

import { ApiError, getPublicKey, listItemMembers, shareItem, SignedOutError } from '../../lib/api'
import { ChevronDownIcon } from '../icons'
import { ItemTile } from '../item-tile'

interface ShareItemProps {
  keys: VaultKeys
  /** An item the signed-in user owns. */
  item: VaultItem
  onDone: () => void
  onSignedOut: () => void
  /** Says what just happened, in the view's toast. */
  onNotice: (notice: string) => void
}

/**
 * Share an item with another user. The item's key is wrapped with the
 * recipient's public key here; the server passes it along and cannot open
 * it. Changing a role or taking access away is done in the web app, which
 * re-encrypts the item for the people who are left.
 */
export default function ShareItem({ keys, item, onDone, onSignedOut, onNotice }: ShareItemProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('viewer')
  const [members, setMembers] = useState<Models.ItemMember[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const sharing = useRef(false)

  useEffect(() => {
    void listItemMembers(item.id)
      .then(setMembers)
      // The list only informs; sharing works without it.
      .catch(() => setMembers([]))
  }, [item.id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // A second submit can arrive before the button is drawn as disabled.
    if (sharing.current) return
    sharing.current = true
    setBusy(true)
    setError('')

    try {
      const recipient = await getPublicKey(email.trim())
      if (!recipient) {
        setError(`${email.trim()} has no vault yet. They need to sign up and create one first.`)
        return
      }

      await shareItem(item.id, {
        user_id: recipient.user_id,
        role,
        encrypted_item_key: await wrapItemKeyFor(keys, item, recipient),
      })
      onNotice(`Shared with ${recipient.name || recipient.email}`)
      setEmail('')
      // The share went through; a list that fails to reload stays as it was.
      await listItemMembers(item.id)
        .then(setMembers)
        .catch(() => undefined)
    } catch (err) {
      if (err instanceof SignedOutError) {
        onSignedOut()
        return
      }
      setError(
        err instanceof ApiError && err.status === 409
          ? 'They already have access to this item.'
          : err instanceof Error
            ? err.message
            : 'Could not share the item'
      )
    } finally {
      sharing.current = false
      setBusy(false)
    }
  }

  return (
    <form className="stack detail-body" onSubmit={(e) => void handleSubmit(e)}>
      <header className="detail-head">
        <ItemTile item={item} large />
        <div className="item-text">
          <h2 className="detail-title">Share {item.secret!.name}</h2>
          <span className="muted">Encrypted for them in this browser.</span>
        </div>
      </header>

      <div className="share-grid">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="their account email"
            autoFocus
            required
          />
        </label>

        <label>
          Access
          <div className="select-box">
            <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)}>
              {SHARE_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row form-actions">
        <button type="button" className="secondary" onClick={onDone}>
          Done
        </button>
        <button type="submit" disabled={busy}>
          {busy ? 'Sharing…' : 'Share'}
        </button>
      </div>

      <section className="stack">
        <h3 className="section-title">People with access</h3>
        {members === null ? (
          <p className="muted">Loading…</p>
        ) : (
          <ul className="items">
            {members.map((member) => (
              <li key={member.user_id}>
                <div className="item-text">
                  <span className="item-name">{member.name || member.email}</span>
                  <span className="muted">{member.email}</span>
                </div>
                <span className="muted role">{member.role}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted meta">
          To change someone's access or take it away, use the web app: it re-encrypts the item for
          the people who are left.
        </p>
      </section>
    </form>
  )
}
