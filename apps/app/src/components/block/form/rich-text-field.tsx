import { useSelector } from '@tanstack/react-form'
import { lazy, Suspense } from 'react'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useFieldContext } from '@/hooks/form-context'

// Every form shares the form hook that registers this field, the sign-in form
// included. The editor (Milkdown, on ProseMirror) is fetched when a field is
// shown, so only the forms that have one load it.
const RichTextEditor = lazy(() => import('@/components/block/common/rich-text-editor'))

/** The editor's frame, its toolbar row and its least height, held until it arrives. */
function EditorFrame() {
  return (
    <div aria-hidden className="field-box bg-field rounded-control w-full text-sm">
      <div className="border-b p-1">
        <div className="h-7" />
      </div>
      <div className="min-h-32" />
    </div>
  )
}

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
      <Suspense fallback={<EditorFrame />}>
        <RichTextEditor
          value={field.state.value}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          aria-labelledby={labelId}
          invalid={isInvalid}
          placeholder={placeholder}
          disabled={disabled}
        />
      </Suspense>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
