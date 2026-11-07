package models

import (
	"time"

	"github.com/google/uuid"
)

// User mirrors the Authula user of the same id (see migration 000002) and
// adds the application role.
type User struct {
	Base
	Name  string  `db:"name" json:"name"`
	Email string  `db:"email" json:"email"`
	Image *string `db:"image" json:"image"`
	Role  string  `db:"role" json:"role"`
}

// Account statuses on the super user's list of accounts.
const (
	AccountActive     = "active"
	AccountUnverified = "unverified"
)

// Account is a customer account as the super user's list shows it (GET /api/v1/users).
type Account struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
	// The paid plan held: a subscription still in a paid period, before a
	// paid one-time purchase, the latest first; null for a free account.
	Plan *AccountPlan `json:"plan"`
	// Status is AccountActive once the email is verified, AccountUnverified before.
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	// The latest of the last session renewal and the last sign-in on record;
	// null for an account that never signed in.
	LastActiveAt *time.Time `json:"last_active_at"`
}

// AccountPlan names the plan an account holds, and how it is billed.
type AccountPlan struct {
	Name            string  `json:"name"`
	Billing         string  `json:"billing"`
	BillingInterval *string `json:"billing_interval"`
}
