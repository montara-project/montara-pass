import { capitalizeFirstLetter } from '../string'

/** Item types this app can create and edit; the API also knows card and identity. */
export const ITEM_TYPES = ['login', 'secure_note'] as const

export type ItemType = (typeof ITEM_TYPES)[number]

export const ItemTypeOptions = ITEM_TYPES.map((type) => ({
  label: capitalizeFirstLetter(type),
  value: type,
}))

/** Roles an item can be shared with; the owner's own role is `owner`. */
export const SHARE_ROLES = ['viewer', 'editor'] as const

export type ShareRole = (typeof SHARE_ROLES)[number]

export const ShareRoleOptions = SHARE_ROLES.map((role) => ({
  label: capitalizeFirstLetter(role),
  value: role,
}))

export const ITEM_ROLE_OWNER = 'owner'
