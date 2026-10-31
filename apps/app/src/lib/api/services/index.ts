import { authServices } from './auth'
import { billingServices } from './billing'
import { folderServices } from './folder'
import { itemServices } from './item'
import { keyServices } from './key'
import { securityServices } from './security'

export const services = {
  auth: authServices,
  billing: billingServices,
  keys: keyServices,
  folders: folderServices,
  items: itemServices,
  security: securityServices,
} as const
