package dtos

import (
	"github.com/google/uuid"

	"montara-pass/server/internal/lib/validator"
)

// BillingListQuery pages the super user's lists of subscriptions and
// purchases. Search matches the customer's name or email and the plan's name
// or code; status is one of the listed resource's statuses.
type BillingListQuery struct {
	Offset int    `query:"offset"`
	Limit  int    `query:"limit"`
	Search string `query:"search"`
	Sorted string `query:"sorted"`
	Status string `query:"status"`
}

func (dto BillingListQuery) Validate(v *validator.MapValidator) {
	listRules(v)
	v.Field("status").Regex(`^(pending|active|canceled|expired|paid|failed|refunded)$`)
}

// Clamp applies the shared pagination bounds.
func (dto *BillingListQuery) Clamp() {
	dto.Offset, dto.Limit = clampPage(dto.Offset, dto.Limit)
}

// CheckoutBody names the plan to subscribe to or buy.
type CheckoutBody struct {
	PlanID uuid.UUID `json:"plan_id"`
}

func (dto CheckoutBody) Validate(v *validator.MapValidator) {
	v.Field("plan_id").Required().UUID()
}
