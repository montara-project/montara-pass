package handlers

import (
	"encoding/json"
	"errors"
	"math"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/lib/midtrans"
	"montara-pass/server/internal/models"
	"montara-pass/server/internal/repositories"
)

// Billing, Enterprise Edition only. Every subscription period and purchase is
// one Midtrans Snap payment; its order id is a prefix and the row's id, so a
// notification leads back to the row.
const (
	orderSubscription = "sub"
	orderPurchase     = "buy"
)

var (
	errPaymentsOff = apperr.New(apperr.KindServiceUnavailable, "payments are not available on this server")
	errCheckout    = apperr.New(apperr.KindBadGateway, "the payment could not be started, try again")
	errOnlyUsers   = apperr.New(apperr.KindForbidden, "only user accounts can subscribe or buy a plan")
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
		Amount: body.Amount, Currency: body.Currency, Active: body.Active,
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

	plan := models.Plan{Name: body.Name, Description: body.Description, Amount: body.Amount, Currency: body.Currency, Active: body.Active}
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

// Overview answers the signed-in user's live subscription, or null, and
// their purchases.
func (h *billingHandler) Overview(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	if err := h.repo().ExpireEnded(c.Context(), uid); err != nil {
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
	if h.app.Midtrans == nil {
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
	if plan.Currency != midtrans.Currency {
		return models.User{}, models.Plan{}, apperr.New(apperr.KindConflict, "this plan is priced in %s; payments are taken in %s", plan.Currency, midtrans.Currency)
	}
	return user, plan, nil
}

// checkout creates the Snap payment for a row already stored as pending.
// Snap brings the user back to the web app's billing page.
func (h *billingHandler) checkout(c fiber.Ctx, user models.User, plan models.Plan, orderID string) (string, error) {
	url, err := h.app.Midtrans.Checkout(c.Context(), midtrans.Checkout{
		OrderID:   orderID,
		Amount:    plan.Amount,
		ItemID:    plan.Code,
		ItemName:  plan.Name,
		Email:     user.Email,
		Name:      user.Name,
		FinishURL: h.app.Config.Auth.BaseURL + "/billing",
	})
	if err != nil {
		h.app.Logger.Error("midtrans checkout failed", "order_id", orderID, "error", err)
		return "", errCheckout
	}
	return url, nil
}

// Subscribe starts a subscription to a recurring plan and answers it with the
// URL the user pays at. A pending one for the same plan is answered as it is,
// so an abandoned payment can be resumed.
func (h *billingHandler) Subscribe(c fiber.Ctx) error {
	user, plan, err := h.customer(c, models.PlanRecurring)
	if err != nil {
		return err
	}

	if err := h.repo().ExpireEnded(c.Context(), user.ID); err != nil {
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

	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	orderID := orderSubscription + "-" + id.String()
	if err := h.repo().InsertSubscription(c.Context(), id, user.ID, plan, orderID); err != nil {
		return err
	}
	url, err := h.checkout(c, user, plan, orderID)
	if err != nil {
		if derr := h.repo().DeleteSubscription(c.Context(), id); derr != nil {
			h.app.Logger.Error("drop subscription without checkout", "id", id, "error", derr)
		}
		return err
	}
	if err := h.repo().SetSubscriptionCheckout(c.Context(), id, url); err != nil {
		return err
	}

	s, err := h.repo().GetSubscription(c.Context(), id)
	if err != nil {
		return err
	}
	return dtos.Created(c, s, "subscription started: complete the payment")
}

// Buy starts the purchase of a one-time plan, like Subscribe.
func (h *billingHandler) Buy(c fiber.Ctx) error {
	user, plan, err := h.customer(c, models.PlanOneTime)
	if err != nil {
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

	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	orderID := orderPurchase + "-" + id.String()
	if err := h.repo().InsertPurchase(c.Context(), id, user.ID, plan, orderID); err != nil {
		return err
	}
	url, err := h.checkout(c, user, plan, orderID)
	if err != nil {
		if derr := h.repo().DeletePurchase(c.Context(), id); derr != nil {
			h.app.Logger.Error("drop purchase without checkout", "id", id, "error", derr)
		}
		return err
	}
	if err := h.repo().SetPurchaseCheckout(c.Context(), id, url); err != nil {
		return err
	}

	b, err := h.repo().GetPurchase(c.Context(), id)
	if err != nil {
		return err
	}
	return dtos.Created(c, b, "purchase started: complete the payment")
}

// sameAmount reports whether Midtrans' gross_amount ("50000.00") is the
// amount stored for the row.
func sameAmount(gross string, amount int64) bool {
	f, err := strconv.ParseFloat(gross, 64)
	return err == nil && f == math.Trunc(f) && int64(f) == amount
}

// MidtransNotification is Midtrans' HTTP notification. It is public, so only
// a correctly signed one for a known order, at the amount stored for it, is
// read. Midtrans repeats notifications: a change already made is a no-op.
func (h *billingHandler) MidtransNotification(c fiber.Ctx) error {
	if h.app.Midtrans == nil {
		return errPaymentsOff
	}
	var n midtrans.Notification
	if err := json.Unmarshal(c.Body(), &n); err != nil {
		return apperr.New(apperr.KindBadRequest, "invalid JSON body")
	}
	if !h.app.Midtrans.Verify(n) {
		return apperr.New(apperr.KindForbidden, "invalid signature")
	}

	kind, rawID, _ := strings.Cut(n.OrderID, "-")
	id, err := uuid.Parse(rawID)
	if err != nil {
		return apperr.New(apperr.KindNotFound, "unknown order")
	}
	if n.Currency != "" && n.Currency != midtrans.Currency {
		return apperr.New(apperr.KindBadRequest, "unexpected currency")
	}

	outcome := n.Outcome()
	var changed bool
	switch kind {
	case orderSubscription:
		s, err := h.repo().GetSubscription(c.Context(), id)
		if err != nil {
			return err
		}
		if !sameAmount(n.GrossAmount, s.Amount) {
			return apperr.New(apperr.KindBadRequest, "amount does not match the order")
		}
		switch outcome {
		case midtrans.OutcomePaid:
			changed, err = h.repo().SettleSubscription(c.Context(), id)
		case midtrans.OutcomeFailed:
			changed, err = h.repo().EndSubscription(c.Context(), id, models.SubscriptionPending, models.SubscriptionCanceled)
		case midtrans.OutcomeExpired:
			changed, err = h.repo().EndSubscription(c.Context(), id, models.SubscriptionPending, models.SubscriptionExpired)
		case midtrans.OutcomeRefunded:
			changed, err = h.repo().EndSubscription(c.Context(), id, models.SubscriptionActive, models.SubscriptionCanceled)
		}
		if err != nil {
			return err
		}
	case orderPurchase:
		b, err := h.repo().GetPurchase(c.Context(), id)
		if err != nil {
			return err
		}
		if !sameAmount(n.GrossAmount, b.Amount) {
			return apperr.New(apperr.KindBadRequest, "amount does not match the order")
		}
		switch outcome {
		case midtrans.OutcomePaid:
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePending, models.PurchasePaid)
		case midtrans.OutcomeFailed, midtrans.OutcomeExpired:
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePending, models.PurchaseFailed)
		case midtrans.OutcomeRefunded:
			changed, err = h.repo().MovePurchase(c.Context(), id, models.PurchasePaid, models.PurchaseRefunded)
		}
		if err != nil {
			return err
		}
	default:
		return apperr.New(apperr.KindNotFound, "unknown order")
	}

	// A payment that arrives for an order no longer pending (one that expired
	// here first, say) needs a person: it is logged, not applied.
	if !changed && outcome == midtrans.OutcomePaid {
		h.app.Logger.Warn("midtrans payment for an order that is not pending", "order_id", n.OrderID, "status", n.TransactionStatus)
	}
	h.app.Logger.Info("midtrans notification", "order_id", n.OrderID, "status", n.TransactionStatus, "outcome", outcome, "changed", changed)
	return dtos.Message(c, fiber.StatusOK, "notification received")
}
