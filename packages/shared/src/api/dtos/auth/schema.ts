import z from 'zod'

import { requiredString } from '../../../validation'

export const SignInSchema = z.object({
  email: requiredString('email').email('email must be a valid email address'),
  password: requiredString('password'),
})

export type SignInDto = z.infer<typeof SignInSchema>

/** A code from an authenticator app, or a backup code. */
export const TotpCodeSchema = z.object({
  code: requiredString('code'),
})

// The API accepts passwords of 8 to 128 characters.
export const SignUpSchema = z.object({
  name: requiredString('name'),
  email: requiredString('email').email('email must be a valid email address'),
  password: requiredString('password')
    .min(8, 'The password must be at least 8 characters.')
    .max(128, 'The password must be at most 128 characters.'),
})

export type SignUpDto = z.infer<typeof SignUpSchema>
