import { useId, useState, type InputHTMLAttributes } from 'react'

import { EyeIcon, EyeOffIcon, KeyholeIcon } from './icons'

/** The mark above the title of the sign-in and unlock screens. */
export function BrandMark() {
  return (
    <span className="auth-mark" aria-hidden="true">
      <KeyholeIcon width={36} height={36} />
    </span>
  )
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  onChange: (value: string) => void
}

/**
 * A field with its label inside the box. A password field gets a button that
 * shows what was typed.
 */
export function AuthField({ label, type = 'text', onChange, ...input }: AuthFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const secret = type === 'password'

  return (
    <div className="auth-field">
      <div className="auth-field-text">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type={secret && revealed ? 'text' : type}
          onChange={(e) => onChange(e.target.value)}
          {...input}
        />
      </div>
      {secret && (
        <button
          type="button"
          className="icon-button"
          aria-label={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={revealed}
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </div>
  )
}
