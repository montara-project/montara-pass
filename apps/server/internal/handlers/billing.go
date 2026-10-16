package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

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
	return dtos.Get(c, plans)
}

// ListAllPlans answers every plan, retired ones included, for a super user.
func (h *billingHandler) ListAllPlans(c fiber.Ctx) error {
	plans, err := h.repo().ListPlans(c.Context(), true)
	if err != nil {
		return err
	}
	return dtos.Get(c, plans)
}

// Stats answers the counts of a super user's overview.
func (h *billingHandler) Stats(c fiber.Ctx) error {
	stats, err := h.repo().Stats(c.Context())
	if err != nil {
		return err
	}
	return dtos.Get(c, stats)
}

func (h *billingHandler) CreatePlan(c fiber.Ctx) error {
	var body dtos.PlanBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}
	if (body.Billing == models.PlanRecurring) != (body.BillingInterval != nil) {
		return apperr.New(apperr.KindBadRequest, "billing_interval is required for a recurring plan, and only for one")
	}

	plan := models.Plan{
		Code: body.Code, Name: body.Name, Description: body.Description,
		Billing: body.Billing, BillingInterval: body.BillingInterval,
		Amount: body.Amount, Currency: body.Currency, Active: body.Active, VariantID: body.VariantID,
	}
	var err error
	if plan.ID, err = uuid.NewV7(); err != nil {
		return err
	}
	if err := h.repo().InsertPlan(c.Context(), plan); err != nil {
		return err
	}

	plan, err = h.repo().GetPlan(c.Context(), plan.ID)
	if err != nil {
		return err
	}
	return dtos.Created(c, plan, "plan created")
}

func (h *billingHandler) UpdatePlan(c fiber.Ctx) error {
	id, err := pathID(c, "plan")
	if err != nil {
		return err
	}
	var body dtos.PlanUpdateBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	plan := models.Plan{Name: body.Name, Description: body.Description, Amount: body.Amount, Currency: body.Currency, Active: body.Active, VariantID: body.VariantID}
	plan.ID = id
	if err := h.repo().UpdatePlan(c.Context(), plan); err != nil {
		return err
	}

	plan, err = h.repo().GetPlan(c.Context(), id)
	if err != nil {
		return err
	}
	return dtos.OK(c, plan)
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

	subscriptions, err := h.repo().ListSubscriptions(c.Context(), p, q.Status)
	if err != nil {
		return err
	}
	total, err := h.repo().CountSubscriptions(c.Context(), p, q.Status)
	if err != nil {
		return err
	}
	return dtos.List(c, subscriptions, dtos.ListMeta(int(total), q.Offset, q.Limit))
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

	purchases, err := h.repo().ListAllPurchases(c.Context(), p, q.Status)
	if err != nil {
		return err
	}
	total, err := h.repo().CountAllPurchases(c.Context(), p, q.Status)
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
		return models.User{}, models.Plan{}, apperr.New(apperr.KindConflict, "this plan cannot be bought yet: it is not sold through Lemon Squeezy")
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
	insert func(context.Context, uuid.UUID, uuid.UUID, models.Plan, string) error,
	get func(context.Context, uuid.UUID) (T, error),
	message string,
) error {
	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	orderID := order + "-" + id.String()
	if err := insert(c.Context(), id, user.ID, plan, orderID); err != nil {
		return err
	}

	url, err := h.app.Payments.Checkout(c.Context(), lemonsqueezy.Checkout{
		VariantID:   *plan.VariantID,
		Amount:      plan.Amount,
		Email:       user.Email,
		Name:        user.Name,
		OrderID:     orderID,
		RedirectURL: h.app.Config.Auth.BaseURL + "/billing?checkout=done",
	})
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
// The webhook needs order_created, order_refunded, subscription_created and
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
		status := models.SubscriptionExpired
		if a.Live() {
			status = models.SubscriptionActive
		}
		if changed, err = h.repo().ApplySubscription(c.Context(), id, e.Data.ID, status, a.PeriodEnd(), a.Cancelled); err != nil {
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
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePaid, models.PurchaseRefunded)
		case event == "order_created" && a.Status == orderPaid:
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePending, models.PurchasePaid)
			// A payment that arrives for an order no longer pending needs a
			// person: it is logged, not applied.
			if err == nil && !changed {
				h.app.Logger.Warn("lemon squeezy payment for an order that is not pending", "order_id", orderID)
			}
		case event == "order_created" && (a.Status == orderFailed || a.Status == orderFraudulent):
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePending, models.PurchaseFailed)
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
