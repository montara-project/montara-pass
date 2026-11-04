import { activityQueries } from './activity'
import { authQueries } from './auth'
import { billingQueries } from './billing'
import { folderQueries } from './folder'
import { itemQueries } from './item'
import { keyQueries } from './key'
import { passkeyQueries } from './passkey'
import { securityQueries } from './security'
import { sessionQueries } from './session'

export const queries = {
  activity: activityQueries,
  auth: authQueries,
  billing: billingQueries,
  keys: keyQueries,
  folders: folderQueries,
  items: itemQueries,
  passkeys: passkeyQueries,
  security: securityQueries,
  sessions: sessionQueries,
} as const
