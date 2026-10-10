import { useId, useState, type InputHTMLAttributes } from 'react'

import { EyeIcon, EyeOffIcon } from './icons'

/** The logo above the title of the sign-in and unlock screens. */
export function BrandMark() {
  // Decorative: the title under it names the product.
  return <img className="auth-mark" src="/icons/256.png" alt="" width={72} height={72} />
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
