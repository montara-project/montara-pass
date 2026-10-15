import { authQueries } from './auth'
import { billingQueries } from './billing'
import { categoryQueries } from './category'
import { folderQueries } from './folder'
import { itemQueries } from './item'
import { keyQueries } from './key'

export const queries = {
  auth: authQueries,
  billing: billingQueries,
  categories: categoryQueries,
  keys: keyQueries,
  folders: folderQueries,
  items: itemQueries,
} as const
