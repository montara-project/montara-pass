import { capitalizeFirstLetter } from '../string'

/** Item types this app can create and edit; the API also knows card and identity. */
export const ITEM_TYPES = ['login', 'secure_note', 'contact'] as const

export type ItemType = (typeof ITEM_TYPES)[number]

export const ItemTypeOptions = ITEM_TYPES.map((type) => ({
  label: capitalizeFirstLetter(type),
  value: type,
}))

/** What an item is called under its name. */
export const ITEM_TYPE_LABEL: Record<string, string> = {
  login: 'Login',
  secure_note: 'Secure note',
  contact: 'Contact',
}

/**
 * A contact's fields, in the order the forms and the detail show them. A
 * wide one takes a whole row of the form.
 */
export const CONTACT_FIELDS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company', wide: true },
  { key: 'address', label: 'Address', wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State / province' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'country', label: 'Country' },
] as const

export type ContactField = (typeof CONTACT_FIELDS)[number]['key']

/** Roles an item can be shared with; the owner's own role is `owner`. */
export const SHARE_ROLES = ['viewer', 'editor'] as const

export const ShareRoleOptions = SHARE_ROLES.map((role) => ({
  label: capitalizeFirstLetter(role),
  value: role,
}))

export const ITEM_ROLE_OWNER = 'owner'
