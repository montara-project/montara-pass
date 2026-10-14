import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useFieldContext } from '@/hooks/form-context'

import { useFieldErrors } from './field-error'

type TextFieldProps = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'onBlur'> & {
  label?: string
  onChange?: (value: string) => void
  asterisk?: boolean
}

/** A label over an input, with the field's error under it. */
export default function TextField({ label, onChange, asterisk = false, ...props }: TextFieldProps) {
  const field = useFieldContext<string | number>()
  const errors = useFieldErrors()
  const isInvalid = errors.length > 0
  const errorId = `${field.name}-error`

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel htmlFor={field.name} className="gap-1">
        {label}
        {/* Kept out of the name so the field is still called by its label. */}
        {asterisk && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => {
          field.handleChange(e.target.value)
          onChange?.(e.target.value)
        }}
        aria-invalid={isInvalid || undefined}
        aria-required={asterisk || undefined}
        aria-describedby={isInvalid ? errorId : undefined}
        className="field-box rounded-control bg-field placeholder:text-muted-foreground h-10 w-full min-w-0 px-3 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      />
      {isInvalid && <FieldError id={errorId} errors={errors} />}
    </Field>
  )
}
