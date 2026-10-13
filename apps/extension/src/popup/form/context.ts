import { createFormHookContexts } from '@tanstack/react-form'

// The contexts the extension's fields and form parts read their form from.
// See form/index.ts for the hook that binds them, as the web app's
// hooks/form.tsx does.
export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts()
