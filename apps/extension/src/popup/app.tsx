import { useCallback, useEffect, useState } from 'react'

import type { Models } from '@/lib/api/models'
import type { VaultKeys } from '@/lib/crypto/vault'

import { getUserKeys, signOut, SignedOutError } from '../lib/api'
import { loadVault, lockVault } from '../lib/session'
import { getSettings, getTokens } from '../lib/storage'
import Items from './views/items'
import Settings from './views/settings'
import SignIn from './views/sign-in'
import Unlock from './views/unlock'

type Stage =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'signed-out' }
  | { name: 'no-vault'; appUrl: string }
  | { name: 'locked'; userKeys: Models.UserKeys }
  | { name: 'unlocked'; keys: VaultKeys }

/**
 * The popup is rebuilt from scratch every time it opens, so it starts by
 * working out where the user left off: signed out, locked, or unlocked.
 */
export default function App() {
  const [stage, setStage] = useState<Stage>({ name: 'loading' })
  const [showSettings, setShowSettings] = useState(false)

  const boot = useCallback(async () => {
    setStage({ name: 'loading' })

    try {
      if (!(await getTokens())) {
        setStage({ name: 'signed-out' })
        return
      }

      // Still unlocked from a previous opening: no request needed to show the vault.
      const keys = await loadVault()
      if (keys) {
        setStage({ name: 'unlocked', keys })
        return
      }

      const userKeys = await getUserKeys()
      if (userKeys) {
        setStage({ name: 'locked', userKeys })
      } else {
        setStage({ name: 'no-vault', appUrl: (await getSettings()).appUrl })
      }
    } catch (error) {
      if (error instanceof SignedOutError) {
        setStage({ name: 'signed-out' })
      } else {
        setStage({ name: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
  }, [])

  useEffect(() => {
    void boot()
  }, [boot])

  const handleLock = async () => {
    await lockVault()
    await boot()
  }

  const handleSignOut = async () => {
    await lockVault()
    await signOut()
    setStage({ name: 'signed-out' })
  }

  if (showSettings) {
    return (
      <Settings
        onClose={() => {
          setShowSettings(false)
          void boot()
        }}
      />
    )
  }

  switch (stage.name) {
    case 'loading':
      return <p className="center muted">Loading…</p>

    case 'error':
      return (
        <div className="center stack">
          <p className="error">{stage.message}</p>
          <button onClick={() => void boot()}>Try again</button>
          <button className="link" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </div>
      )

    case 'signed-out':
      return <SignIn onSignedIn={() => void boot()} onSettings={() => setShowSettings(true)} />

    case 'no-vault':
      return (
        <div className="center stack">
          <h1>No vault yet</h1>
          <p className="muted">
            Create your vault and its master password in the web app, then come back here.
          </p>
          <a className="button" href={stage.appUrl} target="_blank" rel="noreferrer">
            Open Montara Pass
          </a>
          <button className="link" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      )

    case 'locked':
      return (
        <Unlock
          userKeys={stage.userKeys}
          onUnlocked={(keys) => setStage({ name: 'unlocked', keys })}
          onSignOut={() => void handleSignOut()}
        />
      )

    case 'unlocked':
      return (
        <Items
          keys={stage.keys}
          onLock={() => void handleLock()}
          onSignOut={() => void handleSignOut()}
          onSignedOut={() => setStage({ name: 'signed-out' })}
          onSettings={() => setShowSettings(true)}
        />
      )
  }
}
