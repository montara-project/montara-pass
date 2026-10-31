import { authQueries } from './auth'
import { billingQueries } from './billing'
import { folderQueries } from './folder'
import { itemQueries } from './item'
import { keyQueries } from './key'
import { securityQueries } from './security'

export const queries = {
  auth: authQueries,
  billing: billingQueries,
  keys: keyQueries,
  folders: folderQueries,
  items: itemQueries,
  security: securityQueries,
} as const
