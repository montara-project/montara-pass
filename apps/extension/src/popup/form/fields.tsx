import { generatePassword } from '@montara-pass/shared/password'
import { useStore } from '@tanstack/react-form'
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp'
import {
  lazy,
  Suspense,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

import { ChevronDownIcon, EyeIcon, EyeOffIcon } from '../icons'
import { useFieldContext, useFormContext } from './context'

// The fields and form parts every form of the extension is put together from.
// Each one reads its field from the context form.AppField provides, so a view
// only names the field and says how it is labelled.

// The notes editor is fetched when a form with notes is opened, and so stays
// out of the popup's first load.
const NotesEditor = lazy(() => import('../notes-editor'))

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>

/**
 * What a field has to say about its value, once it has been touched: a save
 * that was tried touches every field. A schema answers with issues, a
 * function with plain text.
 */
function useFieldError(): string | undefined {
  const field = useFieldContext<unknown>()
  const meta = useStore(field.store, (state) => state.meta)
  if (!meta.isTouched) return undefined

  const [first] = meta.errors as unknown[]
  if (typeof first === 'string') return first
  return (first as { message?: string } | undefined)?.message
}

/** The input of the field in context, with nothing around it. */
export function Input(props: InputProps) {
  const field = useFieldContext<string | undefined>()
  const value = useStore(field.store, (state) => state.value)
  const error = useFieldError()

  return (
    <input
      name={field.name}
      value={value ?? ''}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  )
}

/** The switch of the boolean field in context, with nothing around it. */
export function Switch(props: InputProps) {
  const field = useFieldContext<boolean>()
  const checked = useStore(field.store, (state) => state.value)

  return (
    <input
      type="checkbox"
      role="switch"
      name={field.name}
      aria-checked={checked}
      checked={checked}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.checked)}
      {...props}
    />
  )
}

interface FrameProps {
  label: string
  required?: boolean
  children: (props: {
    id: string
    'aria-required'?: true
    'aria-describedby'?: string
  }) => ReactNode
}

/** A label over a control, with the field's error under it. */
function Frame({ label, required, children }: FrameProps) {
  const id = useId()
  const errorId = `${id}-error`
  const error = useFieldError()

  return (
    <div className="form-field">
      <div className="form-label">
        <label htmlFor={id}>{label}</label>
        {/* Kept out of the label so the field is still called "Name". */}
        {required && (
          <span className="asterisk" aria-hidden="true">
            *
          </span>
        )}
      </div>
      {children({
        id,
        ...(required ? { 'aria-required': true as const } : {}),
        ...(error ? { 'aria-describedby': errorId } : {}),
      })}
      {error && (
        <p className="error field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface LabelledProps {
  label: string
  required?: boolean
}

export function TextField({ label, required, ...input }: LabelledProps & InputProps) {
  return (
    <Frame label={label} required={required}>
      {(props) => <Input {...props} {...input} />}
    </Frame>
  )
}

/** A password with a button that shows it, and on request one that makes it. */
export function PasswordField({
  label,
  required,
  generate,
  ...input
}: LabelledProps & InputProps & { generate?: boolean }) {
  const field = useFieldContext<string | undefined>()
  const [shown, setShown] = useState(false)

  return (
    <Frame label={label} required={required}>
      {(props) => (
        <div className="row">
          <div className="password-box">
            <Input {...props} {...input} type={shown ? 'text' : 'password'} />
            <button
              type="button"
              className="icon-button"
              aria-label={shown ? 'Hide password' : 'Show password'}
              aria-pressed={shown}
              onClick={() => setShown((value) => !value)}
            >
              {shown ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {generate && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                field.handleChange(generatePassword())
                setShown(true)
              }}
            >
              Generate
            </button>
          )}
        </div>
      )}
    </Frame>
  )
}

/**
 * A native select drawn like the other fields: the browser's own arrow and
 * inner padding are dropped, and the chevron is ours.
 */
export function SelectField({
  label,
  required,
  children,
  ...select
}: LabelledProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) {
  const field = useFieldContext<string | undefined>()
  const value = useStore(field.store, (state) => state.value)

  return (
    <Frame label={label} required={required}>
      {(props) => (
        <div className="select-box">
          <select
            {...props}
            name={field.name}
            value={value ?? ''}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            {...select}
          >
            {children}
          </select>
          <ChevronDownIcon width={16} height={16} />
        </div>
      )}
    </Frame>
  )
}

/** Notes as Markdown, edited as rich text. */
export function NotesField({ label, placeholder }: { label: string; placeholder?: string }) {
  const field = useFieldContext<string | undefined>()
  const id = useId()
  const error = useFieldError()

  return (
    <div className="form-field">
      <div className="form-label">
        <span id={id}>{label}</span>
      </div>
      <Suspense fallback={<div className="notes-editor notes-loading" />}>
        <NotesEditor
          // Read once, when the editor mounts: it keeps the text from there on.
          value={field.state.value ?? ''}
          onChange={(notes) => field.handleChange(notes)}
          placeholder={placeholder}
          labelledBy={id}
        />
      </Suspense>
      {error && (
        <p className="error field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** A switch in a box of its own, with a line that says what it does. */
export function SwitchField({ label, description }: { label: string; description?: string }) {
  return (
    <label className="toggle option">
      <Switch />
      <span>
        {label}
        {description && <span className="muted">{description}</span>}
      </span>
    </label>
  )
}

/**
 * A field of the sign-in and unlock screens, with its label inside the box.
 * A password gets a button that shows what was typed.
 */
/** One box of a code: the digit typed into it, or the caret while it waits for one. */
function OtpSlot({ char, hasFakeCaret, isActive }: SlotProps) {
  return (
    <div className="otp-slot" data-active={isActive || undefined}>
      {char}
      {hasFakeCaret && <span className="otp-caret" aria-hidden="true" />}
    </div>
  )
}

/**
 * A 6-digit code from an authenticator app, a box per digit, as the web app
 * has it (after HeroUI's InputOTP, on the same library). One invisible input
 * takes the typing, pasting and the code the system offers.
 */
export function OtpField({
  label,
  invalid,
  autoFocus,
}: {
  label: string
  /** What the server refused marks the field as well. */
  invalid?: boolean
  autoFocus?: boolean
}) {
  const field = useFieldContext<string>()
  const value = useStore(field.store, (state) => state.value)
  const error = useFieldError()

  return (
    <Frame label={label}>
      {(props) => (
        <OTPInput
          {...props}
          name={field.name}
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          value={value}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          aria-invalid={invalid || error ? true : undefined}
          containerClassName="otp"
          render={({ slots }) => (
            <>
              <div className="otp-group">
                {slots.slice(0, 3).map((slot, i) => (
                  <OtpSlot key={i} {...slot} />
                ))}
              </div>
              <div className="otp-separator" aria-hidden="true" />
              <div className="otp-group">
                {slots.slice(3).map((slot, i) => (
                  <OtpSlot key={i} {...slot} />
                ))}
              </div>
            </>
          )}
        />
      )}
    </Frame>
  )
}

export function AuthField({
  label,
  type = 'text',
  invalid,
  ...input
}: { label: string; invalid?: boolean } & InputProps) {
  const id = useId()
  const errorId = `${id}-error`
  const error = useFieldError()
  const [revealed, setRevealed] = useState(false)
  const secret = type === 'password'

  return (
    <>
      <div className="auth-field">
        <div className="auth-field-text">
          <label htmlFor={id}>{label}</label>
          <Input
            id={id}
            type={secret && revealed ? 'text' : type}
            // What the server or the vault refused marks the field as well.
            {...(invalid ? { 'aria-invalid': true } : {})}
            {...(error ? { 'aria-describedby': errorId } : {})}
            {...input}
          />
        </div>
        {secret && (
          <button
            type="button"
            className="icon-button"
            aria-label={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && (
        <p className="error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </>
  )
}

/** The button that sends the form; it waits while the form is being sent. */
export function SubmitButton({
  label,
  busyLabel,
  disabled,
  className,
}: {
  label: string
  /** Shown while the form is being sent. */
  busyLabel: string
  disabled?: boolean
  className?: string
}) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <button type="submit" className={className} disabled={isSubmitting || disabled}>
          {isSubmitting ? busyLabel : label}
        </button>
      )}
    </form.Subscribe>
  )
}
