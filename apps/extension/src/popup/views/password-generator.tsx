import { useId, useState, type CSSProperties } from 'react'

import {
  characterKind,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordBits,
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

/** However long the password, its characters are all on their way in by now. */
const DRAW_MS = 280
/** The longest one character waits for the one before it. */
const DRAW_STEP_MS = 14

/** The meter is full at this many bits; beyond it a password is only longer. */
const FULL_BITS = 128

interface PasswordGeneratorProps {
  /** Says what just happened, in the view's toast. */
  onNotice: (notice: string) => void
}

/** Makes random passwords in the browser. Nothing here is saved or sent. */
export default function PasswordGenerator({ onNotice }: PasswordGeneratorProps) {
  const lengthId = useId()
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))

  // Counts the passwords asked for by name: each one is drawn in, where one
  // that follows the slider just changes under it.
  const [drawn, setDrawn] = useState(0)

  const regenerate = () => {
    setPassword(generatePassword(options))
    setDrawn((count) => count + 1)
  }

  const change = (next: PasswordOptions) => {
    setOptions(next)
    setPassword(generatePassword(next))
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      onNotice('Password copied')
    } catch {
      onNotice('Could not copy the password')
    }
  }

  const bits = passwordBits(password)
  const strength = passwordStrength(password)
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <div className="stack detail-body tool-body">
      <header className="detail-head">
        <span className="tile tile-large">
          <KeyIcon />
        </span>
        <div className="item-text">
          <h2 className="detail-title">Password generator</h2>
          <span className="muted">Made in this browser from random bytes. Nothing is saved.</span>
        </div>
      </header>

      {/* The password on one side, what shapes it on the other. */}
      <div className="gen-grid">
        <section className="generated" aria-label="Password">
          <output aria-label="Generated password" aria-live="polite">
            {/* One element, so it copies and reads as one word. */}
            <span
              // A new element each time, so the characters come in again.
              key={drawn}
              className={drawn ? 'gen-drawn' : undefined}
              style={
                {
                  '--step': `${Math.min(DRAW_STEP_MS, DRAW_MS / password.length)}ms`,
                } as CSSProperties
              }
            >
              {[...password].map((char, index) => (
                // The position is the identity: characters repeat.
                // eslint-disable-next-line react/no-array-index-key
                <span
                  key={index}
                  className={`ch-${characterKind(char)}`}
                  style={{ '--i': index } as CSSProperties}
                >
                  {char}
                </span>
              ))}
            </span>
          </output>

          <div className="stack">
            <div className="row">
              <span className={`strength-label strength-${strength}`}>
                {STRENGTH_LABEL[strength]}
              </span>
              <span className="spacer" />
              <span className="muted meta">about {bits} bits</span>
            </div>
            <div className="meter" aria-hidden="true">
              <div
                className={`meter-fill strength-${strength}`}
                style={{ width: `${Math.min(bits / FULL_BITS, 1) * 100}%` }}
              />
            </div>
            <div className="gen-actions">
              <button className="secondary" onClick={regenerate}>
                <RefreshIcon width={18} height={18} />
                Regenerate
              </button>
              <button onClick={() => void copy()}>
                <CopyIcon width={18} height={18} />
                Copy
              </button>
            </div>
          </div>
        </section>

        <section className="gen-options" aria-label="Options">
          <label htmlFor={lengthId}>
            <span className="row">
              Length
              <span className="spacer" />
              <span className="muted">
                <strong className="gen-length">{options.length}</strong> characters
              </span>
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
            <span className="row muted meta" aria-hidden="true">
              {MIN_PASSWORD_LENGTH}
              <span className="spacer" />
              {MAX_PASSWORD_LENGTH}
            </span>
          </label>

          <div className="gen-kinds">
            {KINDS.map(({ kind, label, sample }) => (
              <label key={kind} className="toggle option">
                <span>
                  {label}
                  <span className="muted">{sample}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={options[kind]}
                  checked={options[kind]}
                  // A password needs at least one kind of character.
                  disabled={options[kind] && chosen === 1}
                  onChange={(e) => change({ ...options, [kind]: e.target.checked })}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
