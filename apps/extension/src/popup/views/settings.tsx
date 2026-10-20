import type { Models } from '@montara-pass/shared/api/models'

import { COMMUNITY } from '@montara-pass/shared/constants/edition'
import { formatDate } from '@montara-pass/shared/date'
import { useSelector } from '@tanstack/react-form'
import { useEffect, useRef, useState } from 'react'

import { getBilling, getProfile, signOut } from '../../lib/api'
import { ServerFormSchema } from '../../lib/schemas'
import { AUTO_LOCK_MINUTES, lockVault } from '../../lib/session'
import { originOf } from '../../lib/site'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage'
import { checked, submit, useAppForm } from '../form'
import { ArrowLeftIcon, ExternalLinkIcon, LockIcon } from '../icons'
import TwoFactor from './two-factor'

interface SettingsProps {
  onClose: () => void
  /** Given while the vault is unlocked. */
  onLock?: () => void
  /** Given while someone is signed in. */
  onSignOut?: () => void
}

/** `pnpm watch`: the API and the web app run apart, each with its own URL. */
const DEV = import.meta.env.MODE === 'development'

const SITE_URL = 'https://montarapass.com'
const DOCS_URL = 'https://docs.montarapass.com/docs'

/**
 * The two origins a valid server form stands for. A released build knows one
 * server, which also serves the web app.
 */
function originsOf(value: { selfHosted: boolean; apiUrl: string; appUrl: string }) {
  const apiOrigin = DEV || value.selfHosted ? originOf(value.apiUrl)! : DEFAULT_SETTINGS.apiUrl
  const appOrigin = DEV
    ? originOf(value.appUrl)!
    : value.selfHosted
      ? apiOrigin
      : DEFAULT_SETTINGS.appUrl
  return { apiOrigin, appOrigin }
}

/** One line on the user's plan: the subscription, else what they own. */
function planSummary({ subscription, purchases }: Models.BillingOverview) {
  if (subscription?.status === 'active') {
    const when = subscription.canceled_at ? 'ends' : 'renews'
    return `${subscription.plan.name}, ${when} ${formatDate(subscription.current_period_end)}`
  }
  if (subscription?.status === 'pending') return `${subscription.plan.name}, waiting for payment`
  const owned = purchases.filter((purchase) => purchase.status === 'paid')
  return owned.length
    ? owned.map((purchase) => purchase.plan.name).join(', ')
    : 'No plan. See plans'
}

export default function Settings({ onClose, onLock, onSignOut }: SettingsProps) {
  const [saved, setSaved] = useState(DEFAULT_SETTINGS)
  const [email, setEmail] = useState('')
  // Whether signing in asks for an authenticator code; undefined while loading.
  const [totpEnabled, setTotpEnabled] = useState<boolean>()
  // undefined while loading; null where the server has no billing.
  const [billing, setBilling] = useState<Models.BillingOverview | null>()
  // What the browser said about reaching the server, as opposed to the fields.
  const [error, setError] = useState('')

  /** The browser's answer to the last request for access to the server. */
  const asked = useRef<Promise<boolean>>(Promise.resolve(false))

  const signedIn = !!onSignOut

  const form = useAppForm({
    // What is saved, once it has been read: the form starts over from it.
    defaultValues: {
      selfHosted: saved.apiUrl !== DEFAULT_SETTINGS.apiUrl,
      apiUrl: saved.apiUrl,
      appUrl: saved.appUrl,
    },
    validationLogic: checked,
    validators: { onDynamic: ServerFormSchema },
    onSubmit: async ({ value }) => {
      setError('')

      const { apiOrigin, appOrigin } = originsOf(value)
      if (!(await asked.current)) {
        setError(`Without access to ${apiOrigin} the extension cannot reach that server.`)
        return
      }

      // Another server: the session belongs to the one the extension leaves.
      // It is ended there and its tokens and vault keys forgotten before the
      // new address is saved, so they are never sent to the new server.
      if (apiOrigin !== saved.apiUrl) {
        await lockVault()
        await signOut()
      }
      await saveSettings({ apiUrl: apiOrigin, appUrl: appOrigin })
      onClose()
    },
  })

  /**
   * Ask the browser for the server's site before the form goes through its
   * checks: a permission prompt is only shown in direct response to a user
   * action, and the form answers a moment later. It says yes without a prompt
   * unless site access was taken away in the browser.
   */
  const ask = () => {
    const value = form.state.values
    asked.current = ServerFormSchema.safeParse(value).success
      ? chrome.permissions.request({
          origins: [`${originsOf(value).apiOrigin}/*`],
        })
      : Promise.resolve(false)
  }

  useEffect(() => {
    void getSettings().then(setSaved)
  }, [])

  // The row shows without the address when the server cannot be reached.
  useEffect(() => {
    if (!signedIn) return
    void getProfile()
      .then((profile) => {
        setEmail(profile.user.email)
        setTotpEnabled(profile.totp_enabled ?? false)
      })
      .catch(() => {})
    if (!COMMUNITY) {
      void getBilling()
        .then(setBilling)
        .catch(() => setBilling(null))
    }
  }, [signedIn])

  const { selfHosted, apiUrl, appUrl } = useSelector(form.store, (state) => state.values)
  const wasSelfHosted = saved.apiUrl !== DEFAULT_SETTINGS.apiUrl
  const changed = DEV
    ? apiUrl !== saved.apiUrl || appUrl !== saved.appUrl
    : selfHosted !== wasSelfHosted || (selfHosted && apiUrl !== saved.apiUrl)

  // One line under the fields says what is wrong with them, or with the server.
  const fieldError = useSelector(form.store, (state) =>
    Object.values(state.fieldMeta)
      .filter((meta) => meta?.isTouched)
      .flatMap((meta) => meta!.errors as { message?: string }[])
      .find((issue) => issue?.message)
  )?.message
  const shownError = fieldError || error

  return (
    <div className="settings">
      <header className="set-head">
        <button type="button" className="icon-button" aria-label="Back" onClick={onClose}>
          <ArrowLeftIcon />
        </button>
        <h1>Settings</h1>
        <span className="muted set-version">Version {chrome.runtime.getManifest().version}</span>
      </header>

      {signedIn && (
        <section className="set-section" aria-labelledby="set-account">
          <h2 id="set-account">Account</h2>
          <div className="set-card">
            <div className="set-row">
              <span className="set-text">
                Email
                <span className="muted">{email || '…'}</span>
              </span>
              <span className="set-actions">
                {onLock && (
                  <button type="button" className="secondary" onClick={onLock}>
                    <LockIcon />
                    <span>Lock</span>
                  </button>
                )}
                <button type="button" className="secondary" onClick={onSignOut}>
                  <span>Sign out</span>
                </button>
              </span>
            </div>

            <a
              className="set-row"
              href={`${saved.appUrl}/profile`}
              target="_blank"
              rel="noreferrer"
            >
              <span className="set-text">
                Manage account
                <span className="muted">Your profile, in the web app</span>
              </span>
              <ExternalLinkIcon />
            </a>

            {billing !== null && !COMMUNITY && (
              <a
                className="set-row"
                href={`${saved.appUrl}/billing`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="set-text">
                  Plan
                  <span className="muted">{billing ? planSummary(billing) : '…'}</span>
                </span>
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        </section>
      )}

      <section className="set-section" aria-labelledby="set-security">
        <h2 id="set-security">Security</h2>
        <div className="set-card">
          {signedIn && <TwoFactor enabled={totpEnabled} onChange={setTotpEnabled} />}
          <div className="set-row">
            <span className="set-text">
              Auto-lock
              <span className="muted">The vault locks when it has not been used for this long</span>
            </span>
            <span className="set-value">{AUTO_LOCK_MINUTES} minutes</span>
          </div>
        </div>
      </section>

      <section className="set-section" aria-labelledby="set-server">
        <h2 id="set-server">Server</h2>
        <form
          className="set-card"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            ask()
            void submit(e.currentTarget, form)
          }}
        >
          {DEV ? (
            <>
              <label className="set-row set-field" htmlFor="set-api-dev">
                <span className="set-text">API server</span>
                <form.AppField
                  name="apiUrl"
                  children={(field) => <field.Input id="set-api-dev" />}
                />
              </label>

              <label className="set-row set-field" htmlFor="set-app">
                <span className="set-text">Web app</span>
                <form.AppField name="appUrl" children={(field) => <field.Input id="set-app" />} />
              </label>
            </>
          ) : (
            <>
              <label className="set-row toggle" htmlFor="set-self-hosted">
                <span className="set-text">
                  Self-hosted
                  <span className="muted">Use your own Montara Pass server</span>
                </span>
                <form.AppField
                  name="selfHosted"
                  children={(field) => <field.Switch id="set-self-hosted" />}
                />
              </label>

              <label className="set-row set-field" htmlFor="set-api">
                <span className="set-text">
                  Server URL
                  <span className="muted">
                    {selfHosted ? 'The address of your server' : 'The Montara Pass server'}
                  </span>
                </span>
                {/* The API lives under /api of the server; only the origin is kept. */}
                {selfHosted ? (
                  <form.AppField
                    name="apiUrl"
                    children={(field) => (
                      <field.Input id="set-api" placeholder="https://vault.example.com/api" />
                    )}
                  />
                ) : (
                  // The server every release knows: shown, not asked for.
                  <input id="set-api" value={`${DEFAULT_SETTINGS.apiUrl}/api`} disabled readOnly />
                )}
              </label>
            </>
          )}

          <div className="set-row">
            <span className="set-text">
              {shownError ? (
                <span className="error" role="alert">
                  {shownError}
                </span>
              ) : (
                <span className="muted">
                  {signedIn ? 'Changing the server signs you in again.' : 'Saved in this browser.'}
                </span>
              )}
            </span>
            <form.AppForm>
              <form.SubmitButton label="Save" busyLabel="Saving…" disabled={!changed} />
            </form.AppForm>
          </div>
        </form>
      </section>

      <section className="set-section" aria-labelledby="set-other">
        <h2 id="set-other">Other</h2>
        <div className="set-card">
          <a className="set-row" href={saved.appUrl} target="_blank" rel="noreferrer">
            <span className="set-text">
              Open the web app
              <span className="muted">Folders, sharing and the trash</span>
            </span>
            <ExternalLinkIcon />
          </a>

          <a className="set-row" href={DOCS_URL} target="_blank" rel="noreferrer">
            <span className="set-text">Documentation</span>
            <ExternalLinkIcon />
          </a>
        </div>
      </section>

      <footer className="set-foot">
        <a href={`${SITE_URL}/terms`} target="_blank" rel="noreferrer">
          Terms of Service
        </a>
        <a href={`${SITE_URL}/privacy`} target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
      </footer>
    </div>
  )
}
