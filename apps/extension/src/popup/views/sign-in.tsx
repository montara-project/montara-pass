import { useState, type FormEvent } from 'react'

import { signIn } from '../../lib/api'

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
    <form className="stack pad" onSubmit={(e) => void handleSubmit(e)}>
      <h1>Montara Pass</h1>
      <p className="muted">Sign in with your account password.</p>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <button type="button" className="link" onClick={onSettings}>
        Server settings
      </button>
    </form>
  )
}
