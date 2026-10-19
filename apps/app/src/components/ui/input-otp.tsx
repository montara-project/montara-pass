import { OTPInput, OTPInputContext } from 'input-otp'
import { useContext } from 'react'

import { cn } from '@/lib/utils'

// A one-time code, a box per character, after HeroUI's InputOTP and on the
// same library (input-otp). One invisible input takes the typing, pasting
// and the code the system offers; the boxes only draw what it holds.

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      containerClassName={cn(
        'group/otp flex items-center gap-2 has-disabled:opacity-60',
        containerClassName
      )}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const { char, hasFakeCaret, isActive } = useContext(OTPInputContext).slots[index] ?? {}

  return (
    <div
      data-active={isActive}
      data-filled={Boolean(char)}
      className={cn(
        'rounded-control bg-field border-field-border relative flex size-12 items-center justify-center border text-xl font-semibold tabular-nums',
        'transition-[border-color,box-shadow] duration-[120ms] ease-out motion-reduce:transition-none',
        'group-hover/otp:border-muted-foreground',
        'data-[active=true]:border-focus data-[active=true]:shadow-[0_0_0_1px_var(--focus)]',
        // What the server refused marks every box.
        'group-has-[input[aria-invalid=true]]/otp:border-danger',
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <span
          aria-hidden="true"
          className="bg-foreground h-5 w-px animate-[caret-blink_1.2s_ease-out_infinite] motion-reduce:animate-none"
        />
      )}
    </div>
  )
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-field-border h-0.5 w-3 rounded-full', className)}
      {...props}
    />
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
