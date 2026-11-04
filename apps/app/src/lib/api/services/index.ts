import { activityServices } from './activity'
import { authServices } from './auth'
import { billingServices } from './billing'
import { folderServices } from './folder'
import { itemServices } from './item'
import { keyServices } from './key'
import { passkeyServices } from './passkey'
import { securityServices } from './security'
import { sessionServices } from './session'

export const services = {
  activity: activityServices,
  auth: authServices,
  billing: billingServices,
  keys: keyServices,
  folders: folderServices,
  items: itemServices,
  passkeys: passkeyServices,
  security: securityServices,
  sessions: sessionServices,
} as const
