package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"html"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/lib/lemonsqueezy"
	"montara-pass/server/internal/models"
	"montara-pass/server/internal/repositories"
)

// Billing, Cloud Edition only. Every subscription and purchase starts as one
// Lemon Squeezy checkout; its order id is a prefix and the row's id, handed
// back in every webhook about it, so the webhook leads back to the row.
const (
	orderSubscription = "sub"
	orderPurchase     = "buy"
)

var (
	errPaymentsOff = apperr.New(apperr.KindServiceUnavailable, "payments are not available on this server")
	errCheckout    = apperr.New(apperr.KindBadGateway, "the payment could not be started, try again")
	errOnlyUsers   = apperr.New(apperr.KindForbidden, "only user accounts can subscribe or buy a plan")
	errPortal      = apperr.New(apperr.KindBadGateway, "the subscription could not be opened, try again")
	errCatalog     = apperr.New(apperr.KindBadGateway, "the Lemon Squeezy catalog could not be read, try again")
	errSyncSubs    = apperr.New(apperr.KindBadGateway, "the Lemon Squeezy subscriptions could not be read, try again")
)

type billingHandler struct {
	app *app.Application
}

func (h *billingHandler) repo() *repositories.BillingRepository {
	return &h.app.Repositories.Billing
}

// ListPlans answers the plans on offer. It is public: the website shows them.
func (h *billingHandler) ListPlans(c fiber.Ctx) error {
	plans, err := h.repo().ListPlans(c.Context(), false)
	if err != nil {
		return err
	}
	return dtos.OK(c, plans)
}

// ListAllPlans answers every plan, retired ones included, for a super user.
func (h *billingHandler) ListAllPlans(c fiber.Ctx) error {
	plans, err := h.repo().ListPlans(c.Context(), true)
	if err != nil {
		return err
	}
	return dtos.OK(c, plans)
}

// Stats answers the counts of a super user's overview.
func (h *billingHandler) Stats(c fiber.Ctx) error {
	stats, err := h.repo().Stats(c.Context())
	if err != nil {
		return err
	}
	return dtos.OK(c, stats)
}

// SyncPlans reads the Lemon Squeezy catalog now, for a super user who just
// changed it, and answers every plan.
func (h *billingHandler) SyncPlans(c fiber.Ctx) error {
	if h.app.Payments == nil {
		return errPaymentsOff
	}
	if err := SyncCatalog(c.Context(), h.app); err != nil {
		h.app.Logger.Error("sync lemon squeezy catalog", "error", err)
		return errCatalog
	}
	return h.ListAllPlans(c)
}

// SyncCatalog makes the plans what the Lemon Squeezy store sells: one plan
// per variant, named after its product, at the variant's current price, on
// offer while both are published. A variant billing cannot sell (free, pay
// what you want, or renewing other than every month or year) is left out
// with a warning, and a plan whose variant is gone is taken off sale. Each
// plan takes the best of the store's live public discount codes for it.
func SyncCatalog(ctx context.Context, app *app.Application) error {
	variants, err := app.Payments.Catalog(ctx)
	if err != nil {
		return err
	}

	now := time.Now()
	discounts, err := app.Payments.Discounts(ctx, func(d lemonsqueezy.Discount) bool {
		return strings.Contains(strings.ToLower(d.Name), publicDiscount) && d.Live(now)
	})
	if err != nil {
		return err
	}

	plans := make([]models.Plan, 0, len(variants))
	for _, v := range variants {
		plan, reason := planFromVariant(v, app.Payments.Currency)
		if reason != "" {
			app.Logger.Warn("lemon squeezy variant not sold", "variant", v.ID, "product", v.ProductName, "reason", reason)
			continue
		}
		applyDiscount(&plan, discounts)
		plans = append(plans, plan)
	}

	changedKind, err := app.Repositories.Billing.SyncPlans(ctx, plans)
	if err != nil {
		return err
	}
	for _, code := range changedKind {
		app.Logger.Warn("lemon squeezy variant changed kind: its plan is off sale, sell the new kind as a new variant", "plan", code)
	}
	app.Logger.Info("lemon squeezy catalog synced", "plans", len(plans)-len(changedKind))
	return nil
}

// publicDiscount, in a discount's name, marks a code billing offers on the
// plans it applies to and fills in at their checkout; any other code stays
// the store's to hand out.
const publicDiscount = "[public]"

// applyDiscount gives plan the public discount that takes the most off its
// first payment.
// ponytail: a percentage is rounded down to the cent, so the price shown is
// never below Lemon Squeezy's, which may round the other way by a cent.
func applyDiscount(plan *models.Plan, discounts []lemonsqueezy.Discount) {
	for _, d := range discounts {
		if d.Variants != nil && !slices.Contains(d.Variants, *plan.VariantID) {
			continue
		}
		off := d.Amount
		if d.AmountType == "percent" {
			off = plan.Amount * d.Amount / 100
		}
		off = min(off, plan.Amount)
		if off <= 0 || (plan.DiscountAmount != nil && off <= *plan.DiscountAmount) {
			continue
		}
		code := d.Code
		plan.DiscountCode, plan.DiscountAmount, plan.DiscountEndsAt = &code, &off, d.ExpiresAt
		plan.DiscountPayments = discountPayments(*plan, d)
	}
}

// discountPayments is how many of a recurring plan's payments d takes off:
// nil for every one, and for a plan paid once. A repeating discount takes
// off those within its months.
func discountPayments(plan models.Plan, d lemonsqueezy.Discount) *int {
	if plan.Billing != models.PlanRecurring {
		return nil
	}
	var n int
	switch d.Duration {
	case "once":
		n = 1
	case "repeating":
		months := 1
		if *plan.BillingInterval == "year" {
			months = 12
		}
		n = (max(d.DurationInMonths, 1) + months - 1) / months
	default:
		return nil
	}
	return &n
}

// Bounds of the plans table (migrations/cloud/000001).
const (
	maxPlanName = 100
	maxPlanDesc = 2000
)

var htmlTag = regexp.MustCompile(`<[^>]*>`)

// planFromVariant is the plan a variant is sold as, or why it cannot be.
func planFromVariant(v lemonsqueezy.Variant, currency string) (models.Plan, string) {
	price := v.Price
	switch {
	case price == nil:
		return models.Plan{}, "it has no price"
	case price.Scheme != "standard" || price.UnitPrice == nil:
		return models.Plan{}, "its price is not a standard one"
	}

	id := v.ID
	plan := models.Plan{
		Code:      "ls-" + v.ID,
		Name:      v.ProductName,
		Amount:    *price.UnitPrice,
		Currency:  currency,
		Active:    v.Published,
		VariantID: &id,
	}
	// A product's only variant is called Default.
	if v.Name != "" && !strings.EqualFold(v.Name, "Default") {
		plan.Name += " " + v.Name
	}
	plan.Name = truncate(strings.TrimSpace(plan.Name), maxPlanName)
	if plan.Name == "" {
		return models.Plan{}, "it has no name"
	}
	if text := truncate(htmlText(v.Description), maxPlanDesc); text != "" {
		plan.Description = &text
	}

	switch price.Category {
	case "one_time":
		plan.Billing = models.PlanOneTime
	case "subscription":
		unit := ""
		if price.RenewalIntervalUnit != nil {
			unit = *price.RenewalIntervalUnit
		}
		if (unit != "month" && unit != "year") || price.RenewalIntervalQuantity == nil || *price.RenewalIntervalQuantity != 1 {
			return models.Plan{}, "it renews other than every month or year"
		}
		plan.Billing = models.PlanRecurring
		plan.BillingInterval = &unit
	default:
		return models.Plan{}, "it is " + price.Category + ", not one_time or subscription"
	}
	return plan, ""
}

// htmlText is a Lemon Squeezy description as plain text.
func htmlText(s string) string {
	return strings.Join(strings.Fields(html.UnescapeString(htmlTag.ReplaceAllString(s, " "))), " ")
}

// truncate cuts s to at most n characters.
func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return strings.TrimSpace(string(r[:n]))
	}
	return s
}

// EnsureCustomer saves the user as a Lemon Squeezy customer, found by email
// or made, unless they already are one.
func EnsureCustomer(ctx context.Context, app *app.Application, user models.User) error {
	repo := &app.Repositories.Billing
	if _, err := repo.CustomerID(ctx, user.ID); !errors.Is(err, apperr.ErrNotFound) {
		return err
	}
	name := user.Name
	if name == "" {
		name = user.Email
	}
	id, err := app.Payments.Customer(ctx, name, user.Email)
	if err != nil {
		return err
	}
	return repo.SetCustomerID(ctx, user.ID, id)
}

// billingListParams validates and clamps the super user's list query.
func billingListParams(c fiber.Ctx) (repositories.ListParams, dtos.BillingListQuery, error) {
	var q dtos.BillingListQuery
	if err := lib.ValidateRequestQuery(c, &q); err != nil {
		return repositories.ListParams{}, q, err
	}
	q.Clamp()
	return repositories.ListParams{Offset: q.Offset, Limit: q.Limit, Search: q.Search, Sorted: q.Sorted}, q, nil
}

// ListSubscriptions answers every customer's subscriptions, for a super user.
func (h *billingHandler) ListSubscriptions(c fiber.Ctx) error {
	p, q, err := billingListParams(c)
	if err != nil {
		return err
	}
	if err := h.repo().ExpireEnded(c.Context(), nil); err != nil {
		return err
	}

	subscriptions, err := h.repo().ListSubscriptions(c.Context(), p, q.Status, q.Mode)
	if err != nil {
		return err
	}
	total, err := h.repo().CountSubscriptions(c.Context(), p, q.Status, q.Mode)
	if err != nil {
		return err
	}
	return dtos.List(c, subscriptions, dtos.ListMeta(int(total), q.Offset, q.Limit))
}

// SyncSubscriptions brings every subscription Lemon Squeezy already reported
// on to what it says now, for a super user who suspects a missed webhook, and
// answers how many changed. A Lemon Squeezy subscription carries no order id,
// so one whose first webhook never came cannot be matched: it stays pending
// until it lapses.
func (h *billingHandler) SyncSubscriptions(c fiber.Ctx) error {
	if h.app.Payments == nil {
		return errPaymentsOff
	}
	remote, err := h.app.Payments.Subscriptions(c.Context())
	if err != nil {
		h.app.Logger.Error("sync lemon squeezy subscriptions", "error", err)
		return errSyncSubs
	}
	local, err := h.repo().LinkedSubscriptions(c.Context())
	if err != nil {
		return err
	}

	// ponytail: one UPDATE per linked subscription; batch it if the store
	// ever holds thousands.
	updated := 0
	for _, r := range remote {
		s, ok := local[r.ID]
		if !ok {
			// Sold outside billing, or never reported by a webhook.
			continue
		}
		if !sameVariant(s.Plan, r.Attributes) {
			h.app.Logger.Warn("lemon squeezy subscription on another variant", "subscription", r.ID)
			continue
		}
		changed, err := h.repo().ApplySubscription(c.Context(), s.ID, r.ID, subscriptionStatus(r.Attributes), r.Attributes.PeriodEnd(), r.Attributes.Cancelled, r.Attributes.UpdatedAt)
		if errors.Is(err, apperr.New(apperr.KindConflict, "")) {
			// The user holds another live subscription; a person sorts it out.
			h.app.Logger.Warn("lemon squeezy subscription not applied", "subscription", r.ID, "error", err)
			continue
		}
		if err != nil {
			return err
		}
		if changed {
			updated++
		}
	}
	return dtos.OK(c, fiber.Map{"updated": updated})
}

// subscriptionStatus is what a Lemon Squeezy subscription makes its own.
func subscriptionStatus(a lemonsqueezy.Attributes) string {
	if a.Live() {
		return models.SubscriptionActive
	}
	return models.SubscriptionExpired
}

// ListPurchases answers every customer's purchases, for a super user.
func (h *billingHandler) ListPurchases(c fiber.Ctx) error {
	p, q, err := billingListParams(c)
	if err != nil {
		return err
	}

	if err := h.repo().ExpireEnded(c.Context(), nil); err != nil {
		return err
	}

	purchases, err := h.repo().ListAllPurchases(c.Context(), p, q.Status, q.Mode)
	if err != nil {
		return err
	}
	total, err := h.repo().CountAllPurchases(c.Context(), p, q.Status, q.Mode)
	if err != nil {
		return err
	}
	return dtos.List(c, purchases, dtos.ListMeta(int(total), q.Offset, q.Limit))
}

// Overview answers the signed-in user's live subscription, or null, and
// their purchases.
func (h *billingHandler) Overview(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	if err := h.repo().ExpireEnded(c.Context(), &uid); err != nil {
		return err
	}
	var subscription *models.Subscription
	s, err := h.repo().LiveSubscription(c.Context(), uid)
	switch {
	case err == nil:
		subscription = &s
	case !errors.Is(err, apperr.ErrNotFound):
		return err
	}

	purchases, err := h.repo().ListPurchases(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, fiber.Map{"subscription": subscription, "purchases": purchases})
}

// customer returns the signed-in user and the plan they asked for, refusing
// anyone but a user account (the database refuses them too) and a plan that
// is retired or of another kind.
func (h *billingHandler) customer(c fiber.Ctx, kind string) (models.User, models.Plan, error) {
	if h.app.Payments == nil {
		return models.User{}, models.Plan{}, errPaymentsOff
	}
	uid, err := currentUser(c)
	if err != nil {
		return models.User{}, models.Plan{}, err
	}
	var body dtos.CheckoutBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return models.User{}, models.Plan{}, err
	}

	user, err := h.app.Repositories.User.Get(c.Context(), uid)
	if err != nil {
		return models.User{}, models.Plan{}, err
	}
	if user.Role != constant.RoleUser {
		return models.User{}, models.Plan{}, errOnlyUsers
	}

	plan, err := h.repo().GetPlan(c.Context(), body.PlanID)
	if errors.Is(err, apperr.ErrNotFound) || (err == nil && (!plan.Active || plan.Billing != kind)) {
		return models.User{}, models.Plan{}, apperr.New(apperr.KindNotFound, "no such plan on offer")
	}
	if err != nil {
		return models.User{}, models.Plan{}, err
	}
	if plan.VariantID == nil {
		return models.User{}, models.Plan{}, apperr.New(apperr.KindConflict, "this plan is not sold through Lemon Squeezy")
	}
	if plan.Currency != h.app.Payments.Currency {
		return models.User{}, models.Plan{}, apperr.New(apperr.KindConflict, "this plan is priced in %s; payments are taken in %s", plan.Currency, h.app.Payments.Currency)
	}
	return user, plan, nil
}

// startCheckout stores a pending row for plan with insert, in table
// ("subscriptions" or "purchases"), creates its Lemon Squeezy checkout and
// answers the row, re-read with get. The checkout brings the user back to the
// web app's billing page. A row whose payment could not be created is dropped, so the user is
// free to try again.
func startCheckout[T any](
	h *billingHandler, c fiber.Ctx, user models.User, plan models.Plan, order, table string,
	insert func(context.Context, uuid.UUID, uuid.UUID, models.Plan, int64, string) error,
	get func(context.Context, uuid.UUID) (T, error),
	message string,
) error {
	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	orderID := order + "-" + id.String()
	// The account and its orders meet in one Lemon Squeezy customer.
	if err := EnsureCustomer(c.Context(), h.app, user); err != nil {
		h.app.Logger.Error("save lemon squeezy customer", "user", user.ID, "error", err)
		return errCheckout
	}
	// The row and the checkout take one reading of the discount, so the
	// price recorded is the one asked.
	discount, amount := plan.Discount(time.Now())
	if err := insert(c.Context(), id, user.ID, plan, amount, orderID); err != nil {
		return err
	}

	checkout := lemonsqueezy.Checkout{
		VariantID:    *plan.VariantID,
		Email:        user.Email,
		Name:         user.Name,
		OrderID:      orderID,
		RedirectURL:  h.app.Config.Auth.BaseURL + "/billing?checkout=done",
		DiscountCode: discount,
	}
	url, err := h.app.Payments.Checkout(c.Context(), checkout)
	// The code is as of the last catalog sync: one deleted, rescoped or used
	// up since may get the checkout refused. When Lemon Squeezy says so, it
	// is opened once more without it, at the full price. Any other failure is
	// not retried, so a price is never changed for a network error.
	if discount != "" && lemonsqueezy.RefusedDiscount(err) {
		h.app.Logger.Warn("lemon squeezy checkout with a discount failed, trying without it", "order_id", orderID, "code", discount, "error", err)
		if _, err = h.repo().SetAmount(c.Context(), table, id, plan.Amount); err == nil {
			checkout.DiscountCode = ""
			url, err = h.app.Payments.Checkout(c.Context(), checkout)
		}
	}
	if err != nil {
		h.app.Logger.Error("lemon squeezy checkout failed", "order_id", orderID, "error", err)
		if derr := h.repo().DeletePending(c.Context(), table, id); derr != nil {
			h.app.Logger.Error("drop order without checkout", "order_id", orderID, "error", derr)
		}
		return errCheckout
	}
	if err := h.repo().SetCheckout(c.Context(), table, id, url); err != nil {
		return err
	}

	row, err := get(c.Context(), id)
	if err != nil {
		return err
	}
	return dtos.Created(c, row, message)
}

// Subscribe starts a subscription to a recurring plan and answers it with the
// URL the user pays at. A pending one for the same plan is answered as it is,
// so an abandoned payment can be resumed.
func (h *billingHandler) Subscribe(c fiber.Ctx) error {
	user, plan, err := h.customer(c, models.PlanRecurring)
	if err != nil {
		return err
	}

	if err := h.repo().ExpireEnded(c.Context(), &user.ID); err != nil {
		return err
	}
	live, err := h.repo().LiveSubscription(c.Context(), user.ID)
	switch {
	case err == nil && live.Status == models.SubscriptionPending && live.PlanID == plan.ID && live.CheckoutURL != nil:
		return dtos.OK(c, live)
	case err == nil && live.Status == models.SubscriptionPending:
		return apperr.New(apperr.KindConflict, "another payment is pending: finish it, or wait for it to expire")
	case err == nil:
		return apperr.New(apperr.KindConflict, "you already have a subscription until %s", live.CurrentPeriodEnd.Format("2 January 2006"))
	case !errors.Is(err, apperr.ErrNotFound):
		return err
	}

	return startCheckout(h, c, user, plan, orderSubscription, "subscriptions",
		h.repo().InsertSubscription, h.repo().GetSubscription, "subscription started: complete the payment")
}

// Buy starts the purchase of a one-time plan, like Subscribe.
func (h *billingHandler) Buy(c fiber.Ctx) error {
	user, plan, err := h.customer(c, models.PlanOneTime)
	if err != nil {
		return err
	}

	if err := h.repo().ExpireEnded(c.Context(), &user.ID); err != nil {
		return err
	}
	live, err := h.repo().LivePurchase(c.Context(), user.ID, plan.ID)
	switch {
	case err == nil && live.Status == models.PurchasePending && live.CheckoutURL != nil:
		return dtos.OK(c, live)
	case err == nil:
		return apperr.New(apperr.KindConflict, "you already bought this plan")
	case !errors.Is(err, apperr.ErrNotFound):
		return err
	}

	return startCheckout(h, c, user, plan, orderPurchase, "purchases",
		h.repo().InsertPurchase, h.repo().GetPurchase, "purchase started: complete the payment")
}

// Portal answers a freshly signed link to the Lemon Squeezy customer portal
// of the user's subscription, where it is cancelled or its card changed.
func (h *billingHandler) Portal(c fiber.Ctx) error {
	if h.app.Payments == nil {
		return errPaymentsOff
	}
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	providerID, err := h.repo().ProviderSubscriptionID(c.Context(), uid)
	if errors.Is(err, apperr.ErrNotFound) {
		return apperr.New(apperr.KindNotFound, "you have no subscription to manage")
	}
	if err != nil {
		return err
	}
	url, err := h.app.Payments.PortalURL(c.Context(), providerID)
	if err != nil {
		h.app.Logger.Error("lemon squeezy customer portal failed", "subscription", providerID, "error", err)
		return errPortal
	}
	return dtos.OK(c, fiber.Map{"url": url})
}

// Lemon Squeezy outcomes of an order.
const (
	orderPaid       = "paid"
	orderFailed     = "failed"
	orderFraudulent = "fraudulent"
)

// LemonSqueezyWebhook is Lemon Squeezy's webhook. It is public, so only a
// correctly signed one is read, and only for a known order of the variant
// its plan is sold as: the store's public links carry custom data too, so
// a payment for another product does not settle an order of ours. Lemon
// Squeezy repeats webhooks it gets no 200 for: a change already made is a
// no-op. Events it sends that billing does not use are answered 200, so they
// are not repeated.
//
// The webhook needs order_created (a purchase's payment, and a
// subscription's first), order_refunded, subscription_created and
// subscription_updated, which follows every other change to a subscription.
func (h *billingHandler) LemonSqueezyWebhook(c fiber.Ctx) error {
	if h.app.Payments == nil {
		return errPaymentsOff
	}
	if !h.app.Payments.Verify(c.Body(), c.Get("X-Signature")) {
		return apperr.New(apperr.KindForbidden, "invalid signature")
	}
	var e lemonsqueezy.Event
	if err := json.Unmarshal(c.Body(), &e); err != nil {
		return apperr.New(apperr.KindBadRequest, "invalid JSON body")
	}

	event, orderID, a := e.Meta.EventName, e.Meta.CustomData.OrderID, e.Data.Attributes
	kind, rawID, _ := strings.Cut(orderID, "-")
	id, err := uuid.Parse(rawID)
	if err != nil {
		// Something sold without billing, from the store's own links.
		h.app.Logger.Info("lemon squeezy webhook ignored: not a billing order", "event", event, "order_id", orderID)
		return dtos.Message(c, fiber.StatusOK, "webhook ignored")
	}

	var changed bool
	switch {
	case kind == orderSubscription && (event == "subscription_created" || event == "subscription_updated"):
		s, err := h.repo().GetSubscription(c.Context(), id)
		if err != nil {
			return err
		}
		if !sameVariant(s.Plan, a) {
			return apperr.New(apperr.KindBadRequest, "variant does not match the order")
		}
		if changed, err = h.repo().ApplySubscription(c.Context(), id, e.Data.ID, subscriptionStatus(a), a.PeriodEnd(), a.Cancelled, a.UpdatedAt); err != nil {
			return err
		}

	// A subscription's first payment is an order too, sent alongside
	// subscription_created: what it settled at is recorded. Renewals are
	// not orders.
	case kind == orderSubscription && event == "order_created" && a.Status == orderPaid && a.Paid() != nil:
		s, err := h.repo().GetSubscription(c.Context(), id)
		if err != nil {
			return err
		}
		if !sameVariant(s.Plan, a) {
			return apperr.New(apperr.KindBadRequest, "variant does not match the order")
		}
		if changed, err = h.repo().SetAmount(c.Context(), "subscriptions", id, *a.Paid()); err != nil {
			return err
		}

	case kind == orderPurchase && (event == "order_created" || event == "order_refunded"):
		b, err := h.repo().GetPurchase(c.Context(), id)
		if err != nil {
			return err
		}
		if !sameVariant(b.Plan, a) {
			return apperr.New(apperr.KindBadRequest, "variant does not match the order")
		}
		switch {
		case event == "order_refunded" && a.Refunded:
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePaid, models.PurchaseRefunded, nil)
		case event == "order_created" && a.Status == orderPaid:
			// At what Lemon Squeezy settled: the discount code may not have
			// been taken.
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePending, models.PurchasePaid, a.Paid())
			// A payment that arrives for an order no longer pending needs a
			// person: it is logged, not applied.
			if err == nil && !changed {
				h.app.Logger.Warn("lemon squeezy payment for an order that is not pending", "order_id", orderID)
			}
		case event == "order_created" && (a.Status == orderFailed || a.Status == orderFraudulent):
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePending, models.PurchaseFailed, nil)
		}
		if err != nil {
			return err
		}
	}

	h.app.Logger.Info("lemon squeezy webhook", "event", event, "order_id", orderID, "status", a.Status, "changed", changed)
	return dtos.Message(c, fiber.StatusOK, "webhook received")
}

// sameVariant reports whether what was paid for is the variant plan is sold as.
func sameVariant(plan models.Plan, a lemonsqueezy.Attributes) bool {
	return plan.VariantID != nil && *plan.VariantID == a.VariantID()
}
