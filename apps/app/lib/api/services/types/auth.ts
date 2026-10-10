import type { AxiosResponse } from 'axios'

import type { SignInDto, SignUpDto } from '../../dtos/auth/schema'
import type { Profile, SignInData } from '../../models/user'

// Authula's routes answer with their own bodies, not the {data} envelope.
export type AuthResources = {
  signIn: (body: SignInDto) => Promise<AxiosResponse<SignInData>>
  signUp: (body: SignUpDto) => Promise<AxiosResponse<SignInData>>
  me: () => Promise<AxiosResponse<Profile>>
  signOut: () => Promise<AxiosResponse<unknown>>
}
