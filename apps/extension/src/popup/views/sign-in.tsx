import { useState, type FormEvent } from 'react'

import { signIn } from '../../lib/api'
import { AuthField, BrandMark } from '../auth-field'

interface SignInProps {
  onSignedIn: () => void
  onSettings: () => void
}

export default function SignIn({ onSignedIn, onSettings }: SignInProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    try {
      await signIn(email.trim(), password)
      onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth" onSubmit={(e) => void handleSubmit(e)}>
      <BrandMark />
      <h1 className="auth-title">Sign in</h1>
      <p className="muted auth-note">Sign in with your account password.</p>

      <AuthField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="username"
        autoFocus
        required
      />
      <AuthField
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
        aria-invalid={error ? true : undefined}
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="auth-foot">
        <button type="button" className="auth-link" onClick={onSettings}>
          Server settings
        </button>
      </div>
    </form>
  )
}
