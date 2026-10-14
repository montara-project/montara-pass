import type { ButtonHTMLAttributes } from 'react'

import { useSelector } from '@tanstack/react-form'

import { Button } from '@/components/ui/button'
import { useFormContext } from '@/hooks/form-context'

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  /** Shown while the form is being sent: the label changes, nothing spins. */
  busyLabel?: string
  size?: 'md' | 'lg'
}

/** The button that sends the form; it waits while the form is being sent. */
export default function SubmitButton({
  label,
  busyLabel,
  size,
  disabled,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext()
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting)

  return (
    <Button type="submit" size={size} disabled={isSubmitting || disabled} {...props}>
      {isSubmitting ? (busyLabel ?? label) : label}
    </Button>
  )
}
