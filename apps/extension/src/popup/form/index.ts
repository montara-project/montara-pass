import { createFormHook, revalidateLogic } from '@tanstack/react-form'

import { fieldContext, formContext } from './context'
import {
  AuthField,
  Input,
  NotesField,
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
