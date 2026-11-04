import type { ISO8601DateString } from '../../types/time'

// The activity log (apps/server internal/models/activity.go): who signed in,
// and who created, changed, shared or removed an item. An item comes by id
// and type only: the server cannot read its name.

export type ActivityAction =
  | 'sign_in'
  | 'item_created'
  | 'item_updated'
  | 'item_trashed'
  | 'item_restored'
  | 'item_deleted'
  | 'item_shared'
  | 'item_role_changed'
  | 'item_member_removed'

/** Who did something, or who it was about. */
export interface ActivityUser {
  id: string
  name: string
  email: string
}

export interface Activity {
  id: string
  created_at: ISO8601DateString
  action: ActivityAction
  item_id: string | null
  item_type: string | null
  actor: ActivityUser
  /** The member a share, a role change or a removal was about. */
  subject: ActivityUser | null
  /** The role a share or a role change gave the subject. */
  role: 'editor' | 'viewer' | null
  /** Where a sign-in came from; null on every other row. */
  ip: string | null
  user_agent: string | null
}
