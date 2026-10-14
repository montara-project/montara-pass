package models

import (
	"time"

	"github.com/google/uuid"
)

// Billing, Enterprise Edition only (see migrations/ee/000001). Amounts are in
// the currency's minor unit.

// Plan kinds, as stored in plans.billing.
const (
	PlanRecurring = "recurring"
	PlanOneTime   = "one_time"
)

// Subscription statuses. A recurring plan is paid one period at a time.
const (
	SubscriptionPending  = "pending"
	SubscriptionActive   = "active"
	SubscriptionCanceled = "canceled"
	SubscriptionExpired  = "expired"
)

// Purchase statuses.
const (
	PurchasePending  = "pending"
	PurchasePaid     = "paid"
	PurchaseFailed   = "failed"
	PurchaseRefunded = "refunded"
)

type Plan struct {
	Base
	Code            string  `db:"code" json:"code"`
	Name            string  `db:"name" json:"name"`
	Description     *string `db:"description" json:"description"`
	Billing         string  `db:"billing" json:"billing"`
	BillingInterval *string `db:"billing_interval" json:"billing_interval"`
	Amount          int64   `db:"amount" json:"amount"`
	Currency        string  `db:"currency" json:"currency"`
	Active          bool    `db:"active" json:"active"`
}

type Subscription struct {
	Base
	UserID             uuid.UUID  `db:"user_id" json:"user_id"`
	PlanID             uuid.UUID  `db:"plan_id" json:"plan_id"`
	Status             string     `db:"status" json:"status"`
	CurrentPeriodStart time.Time  `db:"current_period_start" json:"current_period_start"`
	CurrentPeriodEnd   time.Time  `db:"current_period_end" json:"current_period_end"`
	CanceledAt         *time.Time `db:"canceled_at" json:"canceled_at"`
	Amount             int64      `db:"amount" json:"amount"`
	Currency           string     `db:"currency" json:"currency"`
	// Only while pending: where the user finishes paying.
	CheckoutURL *string `db:"checkout_url" json:"checkout_url"`
	Plan        Plan    `json:"plan"`
}

type Purchase struct {
	Base
	UserID      uuid.UUID  `db:"user_id" json:"user_id"`
	PlanID      uuid.UUID  `db:"plan_id" json:"plan_id"`
	Status      string     `db:"status" json:"status"`
	Amount      int64      `db:"amount" json:"amount"`
	Currency    string     `db:"currency" json:"currency"`
	PaidAt      *time.Time `db:"paid_at" json:"paid_at"`
	CheckoutURL *string    `db:"checkout_url" json:"checkout_url"`
	Plan        Plan       `json:"plan"`
}
