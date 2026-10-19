import { ItemFormSchema } from '@montara-pass/shared/api/dtos/vault/schema'
import { optionalString } from '@montara-pass/shared/validation'
import z from 'zod'

import { originOf } from './site'

// The schemas of the extension's own forms. Sign-in, unlock, sharing and the
// item form use the web app's, so both check the same things in the same
// words (apps/app/src/lib/api/dtos).

/** `pnpm watch`: the API and the web app run apart, each with its own URL. */
const DEV = import.meta.env.MODE === 'development'

const NOT_A_URL = 'Enter an http(s) URL, like https://vault.example.com'

/**
 * Where the extension finds its server. A released build asks for one URL,
 * and only when it is self-hosted; a development build asks for two.
 */
export const ServerFormSchema = z
  .object({
    selfHosted: z.boolean(),
    apiUrl: z.string(),
    appUrl: z.string(),
  })
  .superRefine((value, ctx) => {
    if ((DEV || value.selfHosted) && !originOf(value.apiUrl)) {
      ctx.addIssue({ code: 'custom', path: ['apiUrl'], message: NOT_A_URL })
    }
    if (DEV && !originOf(value.appUrl)) {
      ctx.addIssue({ code: 'custom', path: ['appUrl'], message: NOT_A_URL })
    }
  })

/** The popup's short form for a login: the item form without type, folder and notes. */
export const AddLoginFormSchema = ItemFormSchema.pick({
  name: true,
  url: true,
  username: true,
  password: true,
})

export type AddLoginFormDto = z.infer<typeof AddLoginFormSchema>

// The item form with its Visible switch is the web app's own, as the other
// shared schemas are.
export {
  ItemEditFormSchema,
  type ItemEditFormDto,
} from '@montara-pass/shared/api/dtos/vault/schema'

/** The save prompt: the password is the page's, only the username can be put right. */
export const SaveLoginFormSchema = z.object({
  username: optionalString('username'),
})

export type SaveLoginFormDto = z.infer<typeof SaveLoginFormSchema>
