import { generatePassword } from '@montara-pass/shared/password'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useFieldContext } from '@/hooks/form-context'

import { useFieldErrors } from './field-error'

interface PasswordFieldProps {
  label?: string
  placeholder?: string
  asterisk?: boolean
  disabled?: boolean
  /** Vault secrets pass "off" so the browser does not offer to save or fill them. */
  autoComplete?: string
  /** A button beside the field that makes a password, for a secret being chosen. */
  generate?: boolean
}

/** A password with a button that shows it, and on request one that makes it. */
export default function PasswordField({
  label,
  placeholder,
  asterisk,
  disabled,
  autoComplete,
  generate,
}: PasswordFieldProps) {
  const field = useFieldContext<string>()
  const [visible, setVisible] = useState(false)
  const errors = useFieldErrors()
  const isInvalid = errors.length > 0
  const errorId = `${field.name}-error`

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel htmlFor={field.name} className="gap-1">
        {label}
        {asterisk && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <div className="flex items-center gap-2">
        <div className="field-box rounded-control bg-field flex h-10 min-w-0 flex-1 items-center pr-0.5 pl-3">
          <input
            id={field.name}
            name={field.name}
            type={visible ? 'text' : 'password'}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            aria-invalid={isInvalid || undefined}
            aria-required={asterisk || undefined}
            aria-describedby={isInvalid ? errorId : undefined}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className="placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="icon"
            className="size-8"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <IconEyeOff /> : <IconEye />}
          </Button>
        </div>
        {/* Nothing to make where nothing may be changed. */}
        {generate && !disabled && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              field.handleChange(generatePassword())
              // Shown, so what was made can be read before it is saved.
              setVisible(true)
            }}
          >
            Generate
          </Button>
        )}
      </div>
      {isInvalid && <FieldError id={errorId} errors={errors} />}
    </Field>
  )
}
