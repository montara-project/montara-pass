package models

import (
	"time"

	"github.com/google/uuid"
)

// Billing, Cloud Edition only (see migrations/ee). Amounts are in the
// currency's minor unit, cents as Lemon Squeezy counts them.

// Plan kinds, as stored in plans.billing.
const (
	PlanRecurring = "recurring"
	PlanOneTime   = "one_time"
)

// Subscription statuses. Lemon Squeezy renews a subscription by itself; it
// is active while it grants its plan, to current_period_end.
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
	// The Lemon Squeezy variant it is sold as; without one it cannot be bought.
	VariantID *string `db:"variant_id" json:"variant_id"`
}

// Customer is who a subscription or purchase belongs to. Only the super
// user's lists carry it.
type Customer struct {
	Name  string `json:"name"`
	Email string `json:"email"`
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
	CheckoutURL *string   `db:"checkout_url" json:"checkout_url"`
	Plan        Plan      `json:"plan"`
	User        *Customer `json:"user,omitempty"`
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
	User        *Customer  `json:"user,omitempty"`
}

// Stats is a super user's overview: customer accounts (super users left
// out), the ones made in the last 30 days, the customers in a paid
// subscription period, and the plans.
type Stats struct {
	Users           int64 `json:"users"`
	NewUsers30d     int64 `json:"new_users_30d"`
	SubscribedUsers int64 `json:"subscribed_users"`
	Plans           int64 `json:"plans"`
	PlansOnOffer    int64 `json:"plans_on_offer"`
	// One row per currency a subscription was paid in, largest first.
	SubscriptionRevenue []Revenue `json:"subscription_revenue"`
}

// Revenue is what subscriptions paid in one currency, in its minor unit: in
// all, and in the last 30 days by payment date. A refunded period is left out.
type Revenue struct {
	Currency string `json:"currency"`
	Total    int64  `json:"total"`
	Last30d  int64  `json:"last_30d"`
}
