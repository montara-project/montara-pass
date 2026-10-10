import z from 'zod'

import { requiredString } from '@/lib/validation'

export const CategoryFormSchema = z.object({
  name: requiredString('name').max(100, 'The name must be at most 100 characters.'),
})

export type CategoryFormDto = z.infer<typeof CategoryFormSchema>
