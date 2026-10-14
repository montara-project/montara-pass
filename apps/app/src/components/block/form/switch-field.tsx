import { useId } from 'react'

import { Switch } from '@/components/ui/switch'
import { useFieldContext } from '@/hooks/form-context'

interface SwitchFieldProps {
  label: string
  /** A line that says what the switch does. */
  description?: string
  disabled?: boolean
}

/** A switch in a box of its own: what it is called, what it does, and the switch at the far end. */
export default function SwitchField({ label, description, disabled }: SwitchFieldProps) {
  const field = useFieldContext<boolean>()
  const id = useId()
  const descriptionId = `${id}-description`

  return (
    <label
      htmlFor={id}
      className={`rounded-row flex items-center justify-between gap-4 border px-3.5 py-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {description && (
          <span id={descriptionId} className="text-muted-foreground text-[13px]">
            {description}
          </span>
        )}
      </span>
      <Switch
        id={id}
        name={field.name}
        checked={field.state.value}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onBlur={field.handleBlur}
        onCheckedChange={field.handleChange}
      />
    </label>
  )
}
