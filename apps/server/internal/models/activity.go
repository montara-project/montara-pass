package models

import (
	"time"

	"github.com/google/uuid"
)

// The activity log (see migrations/000009): who signed in, and who created,
// changed, shared or removed an item. An item is named by id and type only;
// the server cannot read its name.

// What a row records, as stored in activity_logs.action.
const (
	ActivitySignIn            = "sign_in"
	ActivityItemCreated       = "item_created"
	ActivityItemUpdated       = "item_updated"
	ActivityItemTrashed       = "item_trashed"
	ActivityItemRestored      = "item_restored"
	ActivityItemDeleted       = "item_deleted"
	ActivityItemShared        = "item_shared"
	ActivityItemRoleChanged   = "item_role_changed"
	ActivityItemMemberRemoved = "item_member_removed"
)

// ActivityUser is who did something, or who it was about.
type ActivityUser struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}

type Activity struct {
	ID        uuid.UUID    `json:"id"`
	CreatedAt time.Time    `json:"created_at"`
	Action    string       `json:"action"`
	ItemID    *uuid.UUID   `json:"item_id"`
	ItemType  *string      `json:"item_type"`
	Actor     ActivityUser `json:"actor"`
	// The member a share, a role change or a removal was about.
	Subject *ActivityUser `json:"subject"`
	// The role a share or a role change gave the subject.
	Role *string `json:"role"`
	// Where a sign-in came from; null on every other row.
	IP        *string `json:"ip"`
	UserAgent *string `json:"user_agent"`
}
