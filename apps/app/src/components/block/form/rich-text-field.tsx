import { useSelector } from '@tanstack/react-form'

import RichTextEditor from '@/components/block/common/rich-text-editor'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useFieldContext } from '@/hooks/form-context'

interface RichTextFieldProps {
  label?: string
  placeholder?: string
  asterisk?: boolean
  disabled?: boolean
}

/** A form field edited as rich text and kept as Markdown. */
export default function RichTextField({
  label,
  placeholder,
  asterisk,
  disabled,
}: RichTextFieldProps) {
  const field = useFieldContext<string>()
  const errors = useSelector(field.store, (state) => state.meta.errors)

  const isInvalid = !!errors?.length
  const labelId = `${field.name}-label`

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel id={labelId} className="gap-1">
        {label}
        {asterisk && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <RichTextEditor
        value={field.state.value}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        aria-labelledby={labelId}
        invalid={isInvalid}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
