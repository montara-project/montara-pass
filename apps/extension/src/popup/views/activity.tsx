import type { Models } from '@montara-pass/shared/api/models'
import type { VaultItem } from '@montara-pass/shared/types/vault'

import { deviceName } from '@montara-pass/shared/activity'
import { formatDate, formatDateTime } from '@montara-pass/shared/date'
import { errorMessage, onOffLabel } from '@montara-pass/shared/string'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import AuditTable from '@/components/block/security/audit-table'

import {
  getProfile,
  listActivity,
  listPasskeys,
  listSessions,
  revokeSession,
  SignedOutError,
} from '../../lib/api'
import { ExternalLinkIcon, GlobeIcon, KeyIcon } from '../icons'

interface SecurityProps {
  /** The decrypted vault, which names the items; null while it loads. */
  items: VaultItem[] | null
  /** The web app's address: two-step verification and passkeys are set up there. */
  appUrl: string
  /** The session ended underneath the page. */
  onSignedOut: () => void
  onNotice: (notice: string) => void
}

/** Devices to a page. The server sends them all; a page is a slice of them. */
const PAGE_SIZE = 5

/**
 * A card's last line: which rows are shown out of how many, and the way to
 * the page before and after. `page` counts from 0.
 */
function Pager({
  page,
  shown,
  total,
  onTurn,
}: {
  page: number
  shown: number
  total: number
  onTurn: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = page * PAGE_SIZE
  return (
    <footer className="sec-log-foot">
      <span className="eyebrow">
        {total === 0 ? '0 of 0' : `${from + 1}–${Math.min(from + shown, total)} of ${total}`}
      </span>
      <span className="sec-pager">
        <button disabled={page <= 0} onClick={() => onTurn(page - 1)}>
          Prev
        </button>
        <span className="sec-page">{page + 1}</span>
        <button disabled={page >= pages - 1} onClick={() => onTurn(page + 1)}>
          Next
        </button>
      </span>
    </footer>
  )
}

/** A part of the page: what it is, its one action, and its card. */
function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="sec-section">
      <header>
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        {action}
      </header>
      <div className="field-group">{children}</div>
    </section>
  )
}

/**
 * How the account signs in, where it is signed in, and what happened. The
 * second factor and passkeys are set up in the web app; here they are shown,
 * and other devices can be signed out.
 */
export default function Security({ items, appUrl, onSignedOut, onNotice }: SecurityProps) {
  const [profile, setProfile] = useState<Models.Profile | null>(null)
  const [passkeys, setPasskeys] = useState<Models.AccountPasskey[] | null>(null)
  const [sessions, setSessions] = useState<Models.Device[] | null>(null)
  const [rows, setRows] = useState<Models.Activity[] | null>(null)
  // How many rows the server has handed over: the next page starts there.
  const [fetched, setFetched] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)

  const failed = useCallback(
    (err: unknown, what: string) => {
      if (err instanceof SignedOutError) onSignedOut()
      else setError(errorMessage(err, what))
    },
    [onSignedOut]
  )

  const load = useCallback(
    async (offset: number) => {
      setBusy(true)
      try {
        const page = await listActivity(offset)
        setFetched(offset + page.rows.length)
        // A row that moved onto this page as new ones came in is shown once.
        setRows((prev) => {
          const kept = offset > 0 ? (prev ?? []) : []
          const seen = new Set(kept.map((row) => row.id))
          return [...kept, ...page.rows.filter((row) => !seen.has(row.id))]
        })
        setTotal(page.total)
      } catch (err) {
        failed(err, 'The activity could not be read')
      } finally {
        setBusy(false)
      }
    },
    [failed]
  )

  useEffect(() => {
    void load(0)
    getProfile().then(setProfile, (err) => failed(err, 'Your account could not be read'))
    listPasskeys().then(setPasskeys, (err) => failed(err, 'Your passkeys could not be read'))
    listSessions().then(setSessions, (err) => failed(err, 'Your devices could not be read'))
  }, [load, failed])

  const names = useMemo(
    () => new Map((items ?? []).map((item) => [item.id, item.secret?.name])),
    [items]
  )

  const revoke = async (device: Models.Device) => {
    const name = deviceName(device.user_agent) || 'this device'
    // Signed out at once; the password or a passkey signs it in again.
    const question =
      `Sign out of ${name}? It can sign in again with your password or one of your passkeys: ` +
      `if someone else may have either, change your password and remove the passkeys you don't recognize.`
    if (!confirm(question)) return
    try {
      await revokeSession(device.id)
      setSessions((prev) => prev?.filter((d) => d.id !== device.id) ?? null)
      onNotice(`Signed out of ${name}`)
    } catch (err) {
      failed(err, 'The device could not be signed out')
    }
  }

  // A sign-out can empty the last page: then the one before it shows.
  const deviceCount = sessions?.length ?? 0
  const devicePage = Math.min(page, Math.max(0, Math.ceil(deviceCount / PAGE_SIZE) - 1))
  const shownSessions = (sessions ?? []).slice(devicePage * PAGE_SIZE, (devicePage + 1) * PAGE_SIZE)

  const totp = profile?.totp_enabled
  const webApp = (label: string) =>
    appUrl && (
      <a
        className="button secondary small"
        href={`${appUrl.replace(/\/$/, '')}/security`}
        target="_blank"
        rel="noreferrer"
      >
        {label}
        <ExternalLinkIcon width={12} height={12} />
      </a>
    )

  return (
    <div className="stack detail-body tool-body gen-page">
      <header className="tool-page-head">
        <div className="list-title">
          <p className="eyebrow">Account</p>
          <h1>Security</h1>
          <p className="muted">
            How this account signs in, where it is signed in, and what happened.
          </p>
        </div>
        <dl className="health-stats">
          <div>
            <dt>TOTP</dt>
            <dd className={totp ? 'health-good' : undefined}>{onOffLabel(totp)}</dd>
          </div>
          <div>
            <dt>Passkeys</dt>
            <dd>{passkeys?.length ?? '—'}</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd>{sessions?.length ?? '—'}</dd>
          </div>
        </dl>
      </header>

      <div className="sec-body">
        {error && <p className="error">{error}</p>}

        <Section
          title="Two-step verification (TOTP)"
          description="A code from an authenticator app is asked for on every sign-in."
          action={webApp(totp ? 'Manage in web app' : 'Turn on in web app')}
        >
          <p className="sec-status">
            <span className={totp ? 'sec-chip on' : 'sec-chip'}>{totp ? 'On' : 'Off'}</span>
            {totp
              ? 'On. Signing in asks for a code from your authenticator app.'
              : 'Not enabled. Sign-in asks for the account password only.'}
          </p>
        </Section>

        <Section
          title="Passkeys"
          description="A fingerprint, face or security key replaces both the password and the code."
          action={webApp(passkeys?.length ? 'Manage in web app' : 'Add in web app')}
        >
          {passkeys && passkeys.length > 0 ? (
            <ul className="sec-rows">
              {passkeys.map((passkey) => (
                <li key={passkey.id}>
                  <span className="tile">
                    <KeyIcon />
                  </span>
                  <span className="item-text">
                    <span className="item-name">{passkey.name}</span>
                    <span className="eyebrow">
                      {passkey.encrypted_vault_key ? 'Signs in and unlocks' : 'Signs in only'} ·
                      Added {formatDate(passkey.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sec-status">
              <span className="sec-chip">None</span>
              No passkey registered on this account yet.
            </p>
          )}
        </Section>

        <Section
          title="Active sessions"
          description="Every device signed in to this account, most recently active first."
        >
          {sessions === null ? (
            <p className="sec-status muted">Loading…</p>
          ) : (
            <>
              <ul className="sec-rows">
                {shownSessions.map((device) => (
                  <li key={device.id}>
                    <span className="tile">
                      <GlobeIcon />
                    </span>
                    <span className="item-text">
                      <span className="item-name">
                        {deviceName(device.user_agent) || 'Unknown device'}
                      </span>
                      <span className="eyebrow">
                        {[
                          device.ip,
                          device.current ? 'Active now' : formatDateTime(device.updated_at),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {/* This device signs out the usual way, from the account menu. */}
                    {device.current ? (
                      <span className="sec-this">This device</span>
                    ) : (
                      <button className="secondary small" onClick={() => void revoke(device)}>
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <Pager
                page={devicePage}
                shown={shownSessions.length}
                total={deviceCount}
                onTurn={setPage}
              />
            </>
          )}
        </Section>

        <Section
          title="Audit log"
          description="Sign-ins and changes to the items you have access to, kept 90 days."
        >
          <AuditTable
            rows={rows ?? []}
            total={total}
            pageSize={Math.max(rows?.length ?? 0, 3)}
            isLoading={rows === null}
            meId={profile?.user.id ?? ''}
            names={names}
            footer={
              <footer className="sec-log-foot">
                <span className="eyebrow">
                  {rows?.length ?? 0} of {total}
                </span>
                {rows && fetched < total && (
                  <button
                    className="secondary small"
                    disabled={busy}
                    onClick={() => void load(fetched)}
                  >
                    {busy ? 'Loading…' : 'Show more'}
                  </button>
                )}
              </footer>
            }
          />
        </Section>
      </div>
    </div>
  )
}
