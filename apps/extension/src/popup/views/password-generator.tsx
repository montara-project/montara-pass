import { useId, useState } from 'react'

import {
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordStrength,
  type PasswordOptions,
} from '@/lib/password'

import { CopyIcon, KeyIcon, RefreshIcon } from '../icons'

type Kind = 'uppercase' | 'lowercase' | 'digits' | 'symbols'

const KINDS: { kind: Kind; label: string; sample: string }[] = [
  { kind: 'uppercase', label: 'Uppercase', sample: 'A-Z' },
  { kind: 'lowercase', label: 'Lowercase', sample: 'a-z' },
  { kind: 'digits', label: 'Numbers', sample: '2-9' },
  { kind: 'symbols', label: 'Symbols', sample: '!@#$' },
]

const STRENGTH_LABEL = { weak: 'Weak', fair: 'Fair', strong: 'Strong' }

interface PasswordGeneratorProps {
  /** Says what just happened, in the view's toast. */
  onNotice: (notice: string) => void
}

/** Makes random passwords in the browser. Nothing here is saved or sent. */
export default function PasswordGenerator({ onNotice }: PasswordGeneratorProps) {
  const lengthId = useId()
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))

  const change = (next: PasswordOptions) => {
    setOptions(next)
    setPassword(generatePassword(next))
  }

  const copy = async () => {
    await navigator.clipboard.writeText(password)
    onNotice('Password copied')
  }

  const strength = passwordStrength(password)
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <div className="stack detail-body">
      <header className="detail-head">
        <span className="tile tile-large">
          <KeyIcon />
        </span>
        <div className="item-text">
          <h2 className="detail-title">Password generator</h2>
          <span className="muted">Made in this browser from random bytes. Nothing is saved.</span>
        </div>
      </header>

      <div className="generated">
        <output aria-label="Generated password" aria-live="polite">
          {password}
        </output>
        <div className="row">
          <span className={`strength strength-${strength}`}>{STRENGTH_LABEL[strength]}</span>
          <span className="spacer" />
          <button
            className="icon-button"
            aria-label="Regenerate"
            title="Regenerate"
            onClick={() => setPassword(generatePassword(options))}
          >
            <RefreshIcon />
          </button>
          <button className="new-item" onClick={() => void copy()}>
            <CopyIcon width={18} height={18} />
            Copy
          </button>
        </div>
      </div>

      <label htmlFor={lengthId}>
        <span className="row">
          Length
          <span className="spacer" />
          <span className="muted">{options.length} characters</span>
        </span>
        <input
          id={lengthId}
          className="range"
          type="range"
          min={MIN_PASSWORD_LENGTH}
          max={MAX_PASSWORD_LENGTH}
          value={options.length}
          onChange={(e) => change({ ...options, length: Number(e.target.value) })}
        />
      </label>

      <div className="form-grid">
        {KINDS.map(({ kind, label, sample }) => (
          <label key={kind} className="toggle option">
            <input
              type="checkbox"
              role="switch"
              aria-checked={options[kind]}
              checked={options[kind]}
              // A password needs at least one kind of character.
              disabled={options[kind] && chosen === 1}
              onChange={(e) => change({ ...options, [kind]: e.target.checked })}
            />
            <span>
              {label}
              <span className="muted">{sample}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
