import type { AuthResources } from './types/auth'

import { api, AUTH_PATH } from '../client-fetch'

const resources = (): AuthResources => ({
  signIn: (body) => api.post(`${AUTH_PATH}/email-password/sign-in`, body),
  signUp: (body) => api.post(`${AUTH_PATH}/email-password/sign-up`, body),
  me: () => api.get(`${AUTH_PATH}/me`),
  signOut: () => api.post(`${AUTH_PATH}/sign-out`, {}),
})

export const authServices = resources()
