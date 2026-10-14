import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useFieldContext } from '@/hooks/form-context'

import { useFieldErrors } from './field-error'

type AuthFieldProps = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'onBlur'> & {
  label: string
  /** What the server or the vault refused marks the field as well. */
  invalid?: boolean
}

/**
 * A field of the sign-in, sign-up and unlock screens, with its label inside
 * the box. A password gets a button that shows what was typed.
 */
export default function AuthField({ label, type = 'text', invalid, ...props }: AuthFieldProps) {
  const field = useFieldContext<string>()
  const errors = useFieldErrors()
  const [revealed, setRevealed] = useState(false)
  const secret = type === 'password'
  const error = errors[0]?.message
  const errorId = `${field.name}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="field-box rounded-row bg-card flex min-h-[58px] items-center gap-1 pr-2 pl-3.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <label htmlFor={field.name} className="text-muted-foreground text-xs">
            {label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={secret && revealed ? 'text' : type}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            aria-invalid={error || invalid ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-[26px] w-full min-w-0 bg-transparent text-[15px]"
            {...props}
          />
        </div>
        {secret && (
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="icon"
            aria-label={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <IconEyeOff /> : <IconEye />}
          </Button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-danger px-0.5 text-[13px]">
          {error}
        </p>
      )}
    </div>
  )
}
