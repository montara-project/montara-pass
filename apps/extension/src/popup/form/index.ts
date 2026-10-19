import { createFormHook, revalidateLogic } from '@tanstack/react-form'

import { fieldContext, formContext } from './context'
import {
  AuthField,
  Input,
  NotesField,
  OtpField,
  PasswordField,
  SelectField,
  SubmitButton,
  Switch,
  SwitchField,
  TextField,
} from './fields'

/**
 * The form hook of the extension, set up as TanStack Form's form composition
 * guide has it and as the web app's hooks/form.tsx does: a view names its
 * fields with form.AppField and picks a bound component for each.
 */
export const { useAppForm } = createFormHook({
  fieldComponents: {
    AuthField,
    Input,
    NotesField,
    OtpField,
    PasswordField,
    SelectField,
    Switch,
    SwitchField,
    TextField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})

/**
 * When a form is checked against its schema (validators.onDynamic): on
 * sending it, and from then on as its fields change. Nobody is told an email
 * is wrong while they are still typing it for the first time.
 */
export const checked = revalidateLogic()

/**
 * Send a form, and put the focus on the first field it has something to say
 * about: an error under a field nobody is in goes unheard.
 */
export async function submit(
  el: HTMLFormElement,
  form: {
    handleSubmit: () => Promise<void>
    state: { fieldMeta: Record<string, { errors: unknown[] } | undefined> }
  }
): Promise<void> {
  await form.handleSubmit()

  const meta = form.state.fieldMeta
  const refused = Array.from(el.elements).find(
    (control) => meta[(control as HTMLInputElement).name]?.errors.length
  )
  if (refused instanceof HTMLElement) refused.focus()
}
