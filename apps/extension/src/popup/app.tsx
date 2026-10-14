import { useCallback, useEffect, useState, type ReactNode } from 'react'

import type { Models } from '@/lib/api/models'
import type { VaultKeys } from '@/lib/crypto/vault'

import { getUserKeys, SignedOutError, signOut } from '../lib/api'
import { loadVault, lockVault } from '../lib/session'
import { getSettings, getTokens } from '../lib/storage'
import { isFullScreen } from './layout'
import FullVault from './views/full-vault'
import Items from './views/items'
import Settings from './views/settings'
import SignIn from './views/sign-in'
import Unlock from './views/unlock'

type Stage =
  | { name: 'loading' }
  | { name: 'error'; message: string; signedIn: boolean }
  | { name: 'signed-out' }
  | { name: 'no-vault'; appUrl: string }
  | { name: 'locked'; userKeys: Models.UserKeys }
  | { name: 'unlocked'; keys: VaultKeys }

/** Works out where the user left off: signed out, locked, or unlocked. */
async function resolveStage(): Promise<Stage> {
  // Whether it got as far as finding the tokens, for an error that comes after.
  let signedIn = false

  try {
    if (!(await getTokens())) return { name: 'signed-out' }
    signedIn = true

    // Still unlocked from a previous opening: no request needed to show the vault.
    const keys = await loadVault()
    if (keys) return { name: 'unlocked', keys }

    const userKeys = await getUserKeys()
    return userKeys
      ? { name: 'locked', userKeys }
      : { name: 'no-vault', appUrl: (await getSettings()).appUrl }
  } catch (error) {
    if (error instanceof SignedOutError) return { name: 'signed-out' }
    return {
      name: 'error',
      message: error instanceof Error ? error.message : String(error),
      signedIn,
    }
  }
}

/**
 * The popup is rebuilt from scratch every time it opens, so it starts by
 * working out where the user left off: signed out, locked, or unlocked.
 */
export default function App() {
  const [stage, setStage] = useState<Stage>({ name: 'loading' })
  const [showSettings, setShowSettings] = useState(false)

  // The initial stage is already 'loading'; state is only set once the async
  // lookup resolves, and dropped if the popup unmounts first.
  useEffect(() => {
    let cancelled = false
    void resolveStage().then((next) => {
      if (!cancelled) setStage(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Called from event handlers: show the loading screen, then re-resolve.
  const boot = () => {
    setStage({ name: 'loading' })
    void resolveStage().then(setStage)
  }

  // Stable: the vault views reload whenever this callback changes.
  const handleSignedOut = useCallback(() => setStage({ name: 'signed-out' }), [])

  const handleLock = async () => {
    await lockVault()
    boot()
  }

  const handleSignOut = async () => {
    await lockVault()
    await signOut()
    setStage({ name: 'signed-out' })
  }

  // In a tab, the popup-sized forms sit in a centered card.
  const framed = (node: ReactNode) =>
    isFullScreen ? (
      <div className="full-center">
        <div className="full-card">{node}</div>
      </div>
    ) : (
      node
    )

  if (showSettings) {
    const leaving = (act: () => Promise<void>) => () => {
      setShowSettings(false)
      void act()
    }
    // Signed in is every stage that got past the tokens, an error after them included.
    const signedIn =
      stage.name === 'error'
        ? stage.signedIn
        : ['no-vault', 'locked', 'unlocked'].includes(stage.name)

    return (
      <Settings
        onClose={() => {
          setShowSettings(false)
          boot()
        }}
        onLock={stage.name === 'unlocked' ? leaving(handleLock) : undefined}
        onSignOut={signedIn ? leaving(handleSignOut) : undefined}
      />
    )
  }

  switch (stage.name) {
    case 'loading':
      return framed(
        <p className="center muted" role="status">
          Loading…
        </p>
      )

    case 'error':
      return framed(
        <div className="center stack">
          <p className="error">{stage.message}</p>
          <button onClick={boot}>Try again</button>
          <button className="link" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </div>
      )

    case 'signed-out':
      return framed(<SignIn onSignedIn={boot} onSettings={() => setShowSettings(true)} />)

    case 'no-vault':
      return framed(
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
      return framed(
        <Unlock
          userKeys={stage.userKeys}
          onUnlocked={(keys) => setStage({ name: 'unlocked', keys })}
          onSignOut={() => void handleSignOut()}
        />
      )

    case 'unlocked': {
      const Vault = isFullScreen ? FullVault : Items
      return (
        <Vault
          keys={stage.keys}
          onLock={() => void handleLock()}
          onSignOut={() => void handleSignOut()}
          onSignedOut={handleSignedOut}
          onSettings={() => setShowSettings(true)}
        />
      )
    }
  }
}
