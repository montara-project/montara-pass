package handlers

import (
	"testing"
	"time"

	"montara-pass/server/internal/lib/lemonsqueezy"
	"montara-pass/server/internal/models"
)

func TestApplyDiscount(t *testing.T) {
	month, year := "month", "year"
	plan := func(variant, billing string, interval *string, amount int64) models.Plan {
		return models.Plan{VariantID: &variant, Billing: billing, BillingInterval: interval, Amount: amount}
	}
	ends := time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC)
	discounts := []lemonsqueezy.Discount{
		{Code: "LAUNCH20", AmountType: "percent", Amount: 20, Duration: "repeating", DurationInMonths: 3, Variants: []string{"1", "2"}, ExpiresAt: &ends},
		{Code: "FIVE", AmountType: "fixed", Amount: 500, Duration: "once"},
		{Code: "HUGE", AmountType: "fixed", Amount: 1_000_000, Duration: "forever", Variants: []string{"3"}},
	}
	cases := []struct {
		name     string
		plan     models.Plan
		code     string
		off      int64
		payments int // 0: nil
	}{
		// 20% of 300 is 60, less than FIVE's 500 off, which is capped at 300.
		{"monthly", plan("1", models.PlanRecurring, &month, 300), "FIVE", 300, 1},
		// 20% of 3000 is 600: three months of a yearly plan is its first payment.
		{"yearly", plan("2", models.PlanRecurring, &year, 3000), "LAUNCH20", 600, 1},
		{"lifetime", plan("3", models.PlanOneTime, nil, 30000), "HUGE", 30000, 0},
		{"rounded down", plan("2", models.PlanRecurring, &month, 3333), "LAUNCH20", 666, 3},
		{"no code applies", plan("9", models.PlanOneTime, nil, 100), "FIVE", 100, 0},
	}
	for _, c := range cases {
		p := c.plan
		applyDiscount(&p, discounts)
		if p.DiscountCode == nil || *p.DiscountCode != c.code || *p.DiscountAmount != c.off {
			t.Errorf("%s: %v %v, want %s %d", c.name, p.DiscountCode, p.DiscountAmount, c.code, c.off)
			continue
		}
		if (c.payments == 0) != (p.DiscountPayments == nil) || (p.DiscountPayments != nil && *p.DiscountPayments != c.payments) {
			t.Errorf("%s: payments %v, want %d", c.name, p.DiscountPayments, c.payments)
		}
	}

	bare := plan("9", models.PlanOneTime, nil, 100)
	applyDiscount(&bare, discounts[:1])
	if bare.DiscountCode != nil {
		t.Errorf("a discount for other variants applied: %v", *bare.DiscountCode)
	}

	yearly := plan("2", models.PlanRecurring, &year, 3000)
	applyDiscount(&yearly, discounts[:1])
	if code, amount := yearly.Discount(ends.Add(-time.Second)); code != "LAUNCH20" || amount != 2400 {
		t.Errorf("before it ends: %q %d", code, amount)
	}
	if code, amount := yearly.Discount(ends); code != "" || amount != 3000 {
		t.Errorf("once it ended: %q %d", code, amount)
	}
}
