import { authServices } from './auth'
import { billingServices } from './billing'
import { categoryServices } from './category'
import { folderServices } from './folder'
import { itemServices } from './item'
import { keyServices } from './key'

export const services = {
  auth: authServices,
  billing: billingServices,
  categories: categoryServices,
  keys: keyServices,
  folders: folderServices,
  items: itemServices,
} as const
