import { useSelector } from '@tanstack/react-form'

import { useFieldContext } from '@/hooks/form-context'

/** What the field in context has to say about its value: a schema answers with issues. */
export function useFieldErrors(): { message?: string }[] {
  const field = useFieldContext<unknown>()
  return useSelector(field.store, (state) => state.meta.errors) as { message?: string }[]
}
