import {
  characterKind,
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordBits,
  passwordStrength,
  type PasswordOptions,
} from '@montara-pass/shared/password'
import { useId, useState, type CSSProperties } from 'react'

import { copySecret } from '../../lib/clipboard'
import { CopyIcon, RefreshIcon } from '../icons'

type Kind = 'uppercase' | 'lowercase' | 'digits' | 'symbols'

const KINDS: { kind: Kind; label: string; sample: string }[] = [
  { kind: 'uppercase', label: 'Uppercase', sample: 'A-Z' },
  { kind: 'lowercase', label: 'Lowercase', sample: 'a-z' },
  { kind: 'digits', label: 'Numbers', sample: '0-9' },
  { kind: 'symbols', label: 'Symbols', sample: '!@#' },
]

/** How a strength is named, and how many of the four bars it fills. */
const STRENGTH = {
  weak: { label: 'Weak', bars: 1 },
  fair: { label: 'Fair', bars: 3 },
  strong: { label: 'Strong', bars: 4 },
}

/** However long the password, its characters are all on their way in by now. */
const DRAW_MS = 280
/** The longest one character waits for the one before it. */
const DRAW_STEP_MS = 14

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
      await copySecret(password)
      onNotice('Password copied')
    } catch {
      onNotice('Could not copy the password')
    }
  }

  const bits = passwordBits(password)
  const strength = passwordStrength(password)
  const chosen = KINDS.filter(({ kind }) => options[kind]).length

  return (
    <div className="stack detail-body tool-body gen-page">
      <header className="tool-page-head">
        <div className="list-title">
          <p className="eyebrow">Tools</p>
          <h1>Password generator</h1>
          <p className="muted">Made in this browser from random bytes. Nothing is saved.</p>
        </div>
        <p className="eyebrow">Client side · no storage</p>
      </header>

      {/* The password and its length on one side, what it is made of on the other. */}
      <div className="gen-grid">
        <div className="gen-main">
          <section className="field-group" aria-label="Password">
            <header className="field-group-head">
              <h3>Generated password</h3>
              <span>{password.length} chars</span>
            </header>
            <output className="gen-output" aria-label="Generated password" aria-live="polite">
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

            <div className={`gen-strength strength-label strength-${strength}`}>
              <span className="row">
                {STRENGTH[strength].label}
                <span className="spacer" />
                <span className="muted">about {bits} bits</span>
              </span>
              <span className="gen-bars" aria-hidden="true">
                {[1, 2, 3, 4].map((bar) => (
                  <i key={bar} className={bar <= STRENGTH[strength].bars ? 'on' : undefined} />
                ))}
              </span>
            </div>

            <div className="gen-foot">
              <button className="secondary" onClick={regenerate}>
                <RefreshIcon width={16} height={16} />
                Regenerate
              </button>
              <button onClick={() => void copy()}>
                <CopyIcon width={16} height={16} />
                Copy
              </button>
              <span className="spacer" />
              <span className="eyebrow">Never stored</span>
            </div>
          </section>

          <section className="field-group" aria-label="Length">
            <div className="gen-length-head">
              <label htmlFor={lengthId}>Length</label>
              {/* Digits of one width, so the box holds still while the slider moves. */}
              <span className="gen-length">{options.length}</span>
            </div>
            <div className="gen-slider">
              <input
                id={lengthId}
                className="range"
                type="range"
                min={MIN_PASSWORD_LENGTH}
                max={MAX_PASSWORD_LENGTH}
                value={options.length}
                // How far along the track is filled, which a browser does not say.
                style={
                  {
                    '--fill': `${((options.length - MIN_PASSWORD_LENGTH) / (MAX_PASSWORD_LENGTH - MIN_PASSWORD_LENGTH)) * 100}%`,
                  } as CSSProperties
                }
                onChange={(e) => change({ ...options, length: Number(e.target.value) })}
              />
              <span className="row eyebrow" aria-hidden="true">
                {MIN_PASSWORD_LENGTH}
                <span className="spacer" />
                {MAX_PASSWORD_LENGTH}
              </span>
            </div>
          </section>
        </div>

        <section className="field-group" aria-label="Character set">
          <header className="field-group-head">
            <h3>Character set</h3>
            <span>
              {chosen} of {KINDS.length} on
            </span>
          </header>
          <div className="gen-kinds">
            {KINDS.map(({ kind, label, sample }) => (
              <label key={kind} className="toggle option">
                <span>
                  {label}
                  <span className="muted mono">
                    {kind === 'digits' && !options.ambiguous ? '2-9' : sample}
                  </span>
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
            {/* 0 and O, 1, l and I: left out unless asked for, as one is easily
                read for another. */}
            <label className="toggle option gen-ambiguous">
              <span>Include ambiguous</span>
              <input
                type="checkbox"
                role="switch"
                aria-checked={options.ambiguous}
                checked={options.ambiguous}
                onChange={(e) => change({ ...options, ambiguous: e.target.checked })}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}
