import type { KeyResources } from './types/key'

import { api } from '../client-fetch'

const path = '/api/v1/keys'

const resources = (): KeyResources => ({
  get: () => api.get(path),
  create: (body) => api.post(path, body),
  updateKDF: (body) => api.put(path, body),
  publicKey: (email) => api.get(`${path}/public`, { params: { email } }),
})

export const keyServices = resources()
