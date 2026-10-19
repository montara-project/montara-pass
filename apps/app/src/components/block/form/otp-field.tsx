import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { useFieldContext } from '@/hooks/form-context'

import { useFieldErrors } from './field-error'

interface OtpFieldProps {
  label: string
  /** What the server refused marks the field as well. */
  invalid?: boolean
  autoFocus?: boolean
}

/** A 6-digit code from an authenticator app: three boxes, a dash, three more. */
export default function OtpField({ label, invalid = false, autoFocus }: OtpFieldProps) {
  const field = useFieldContext<string>()
  const errors = useFieldErrors()
  const isInvalid = invalid || errors.length > 0
  const errorId = `${field.name}-error`

  return (
    <Field data-invalid={isInvalid} className="gap-1.5">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputOTP
        id={field.name}
        name={field.name}
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={field.state.value}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid || undefined}
        aria-describedby={errors.length > 0 ? errorId : undefined}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      {errors.length > 0 && <FieldError id={errorId} errors={errors} />}
    </Field>
  )
}
