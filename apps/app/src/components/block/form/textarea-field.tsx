import { useSelector } from '@tanstack/react-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useFieldContext } from '@/hooks/form-context'

interface TextareaFieldProps {
  label?: string
  placeholder?: string
  asterisk?: boolean
  rows?: number
  disabled?: boolean
}

export default function TextareaField({
  label,
  placeholder,
  asterisk,
  rows = 4,
  disabled,
}: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const errors = useSelector(field.store, (state) => state.meta.errors)

  const isInvalid = !!errors?.length

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
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
