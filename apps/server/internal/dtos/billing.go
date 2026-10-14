package dtos

import (
	"github.com/google/uuid"

	"montara-pass/server/internal/lib/validator"
)

// Bounds matching the CHECK constraints of migrations/ee/000001.
const (
	planCodePattern     = `^[a-z0-9][a-z0-9_-]{0,63}$`
	planBillingPattern  = `^(recurring|one_time)$`
	planIntervalPattern = `^(month|year)$`
	currencyPattern     = `^[A-Z]{3}$`
	maxPlanDescLen      = 2000
	// A sane ceiling, well inside the float64 range JSON numbers decode to.
	maxAmount = 1_000_000_000_000
)

// PlanUpdateBody is what may change about a plan.
type PlanUpdateBody struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Amount      int64   `json:"amount"`
	Currency    string  `json:"currency"`
	Active      bool    `json:"active"`
}

func (dto PlanUpdateBody) Validate(v *validator.MapValidator) {
	v.Field("name").Required().String().MaxLen(maxNameLen)
	v.Field("description").String().MaxLen(maxPlanDescLen)
	v.Field("amount").Required().Int(0, maxAmount)
	v.Field("currency").Required().Regex(currencyPattern)
	v.Field("active").Required().Bool()
}

// PlanBody creates a plan. Its code, kind and interval never change.
type PlanBody struct {
	PlanUpdateBody
	Code            string  `json:"code"`
	Billing         string  `json:"billing"`
	BillingInterval *string `json:"billing_interval"`
}

func (dto PlanBody) Validate(v *validator.MapValidator) {
	dto.PlanUpdateBody.Validate(v)
	v.Field("code").Required().Regex(planCodePattern)
	v.Field("billing").Required().Regex(planBillingPattern)
	v.Field("billing_interval").Regex(planIntervalPattern)
}

// CheckoutBody names the plan to subscribe to or buy.
type CheckoutBody struct {
	PlanID uuid.UUID `json:"plan_id"`
}

func (dto CheckoutBody) Validate(v *validator.MapValidator) {
	v.Field("plan_id").Required().UUID()
}
