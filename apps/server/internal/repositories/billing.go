package repositories

import (
	"context"
	"fmt"

	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/models"

	"github.com/google/uuid"
)

// BillingRepository manages the Enterprise Edition's plans, subscriptions and
// purchases (see migrations/ee/000001). The database holds the rules: only an
// account with the 'user' role subscribes or buys, each table takes only its
// kind of plan, and a user has one live subscription.
type BillingRepository struct {
	BaseRepository
}

const planColumns = `
	p.id, p.created_at, p.updated_at, p.code, p.name, p.description,
	p.billing, p.billing_interval, p.amount, p.currency, p.active`

func planDest(p *models.Plan) []any {
	return []any{&p.ID, &p.CreatedAt, &p.UpdatedAt, &p.Code, &p.Name, &p.Description,
		&p.Billing, &p.BillingInterval, &p.Amount, &p.Currency, &p.Active}
}

func scanPlan(row rowScanner) (models.Plan, error) {
	var p models.Plan
	err := row.Scan(planDest(&p)...)
	return p, translateNotFound("plans", err)
}

// ListPlans returns the plans on offer, cheapest first within each kind; with
// all, the retired ones too.
func (r *BillingRepository) ListPlans(ctx context.Context, all bool) ([]models.Plan, error) {
	query := fmt.Sprintf(`SELECT %s FROM plans p WHERE p.active OR $1 ORDER BY p.billing DESC, p.amount, p.code`, planColumns)
	rows, err := r.queryContext(ctx, query, all)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanPlan)
}

// GetPlan returns one plan, retired or not.
func (r *BillingRepository) GetPlan(ctx context.Context, id uuid.UUID) (models.Plan, error) {
	query := fmt.Sprintf(`SELECT %s FROM plans p WHERE p.id = $1`, planColumns)
	return scanPlan(r.queryRowContext(ctx, query, id))
}

// InsertPlan persists a new plan. A taken code is a conflict.
func (r *BillingRepository) InsertPlan(ctx context.Context, p models.Plan) error {
	_, err := r.execContext(ctx, `
		INSERT INTO plans (id, code, name, description, billing, billing_interval, amount, currency, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.ID, p.Code, p.Name, p.Description, p.Billing, p.BillingInterval, p.Amount, p.Currency, p.Active,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return apperr.New(apperr.KindConflict, "a plan with code %q already exists", p.Code)
	}
	return err
}

// UpdatePlan rewrites what may change about a plan: its kind and code stay,
// since subscriptions and purchases name them. A new price applies to what is
// bought next; what was bought keeps the amount it was charged.
func (r *BillingRepository) UpdatePlan(ctx context.Context, p models.Plan) error {
	res, err := r.execContext(ctx, `
		UPDATE plans
		SET name = $2, description = $3, amount = $4, currency = $5, active = $6, updated_at = now()
		WHERE id = $1`,
		p.ID, p.Name, p.Description, p.Amount, p.Currency, p.Active,
	)
	if err != nil {
		return err
	}
	return requireAffected(res, "plan")
}

const subscriptionColumns = `
	s.id, s.created_at, s.updated_at, s.user_id, s.plan_id, s.status,
	s.current_period_start, s.current_period_end, s.canceled_at,
	s.amount, s.currency, s.checkout_url, ` + planColumns

func subscriptionDest(s *models.Subscription) []any {
	return append([]any{&s.ID, &s.CreatedAt, &s.UpdatedAt, &s.UserID, &s.PlanID, &s.Status,
		&s.CurrentPeriodStart, &s.CurrentPeriodEnd, &s.CanceledAt,
		&s.Amount, &s.Currency, &s.CheckoutURL}, planDest(&s.Plan)...)
}

func scanSubscription(row rowScanner) (models.Subscription, error) {
	var s models.Subscription
	err := row.Scan(subscriptionDest(&s)...)
	return s, translateNotFound("subscriptions", err)
}

// The super user's lists: every customer's rows, with who they belong to.
const (
	subscriptionsWithUser = `subscriptions s JOIN plans p ON p.id = s.plan_id JOIN users u ON u.id = s.user_id`
	purchasesWithUser     = `purchases b JOIN plans p ON p.id = b.plan_id JOIN users u ON u.id = b.user_id`
)

var (
	subscriptionSortColumns = map[string]string{"created_at": "s.created_at", "amount": "s.amount", "current_period_end": "s.current_period_end"}
	purchaseSortColumns     = map[string]string{"created_at": "b.created_at", "amount": "b.amount", "paid_at": "b.paid_at"}
)

// customerFilters narrows a super user's list by status (of the row aliased
// alias) and by a search over the customer and the plan.
func customerFilters(alias string, p ListParams, status string) *whereBuilder {
	w := newWhere(`TRUE`)
	if status != "" {
		w.add(alias+".status = $%d", status)
	}
	w.search(p.Search, "u.email", "u.name", "p.name", "p.code")
	return w
}

func scanSubscriptionWithUser(row rowScanner) (models.Subscription, error) {
	var s models.Subscription
	s.User = &models.Customer{}
	err := row.Scan(append(subscriptionDest(&s), &s.User.Name, &s.User.Email)...)
	return s, err
}

// ListSubscriptions returns one page of every customer's subscriptions,
// newest first unless p.Sorted says otherwise.
func (r *BillingRepository) ListSubscriptions(ctx context.Context, p ListParams, status string) ([]models.Subscription, error) {
	where, args, limit, offset := customerFilters("s", p, status).page(p)
	query := fmt.Sprintf(`
		SELECT %s, u.name, u.email FROM %s
		WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		subscriptionColumns, subscriptionsWithUser, where,
		resolveOrder(p.Sorted, subscriptionSortColumns, "s.created_at DESC"), limit, offset)
	rows, err := r.queryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanSubscriptionWithUser)
}

// CountSubscriptions counts what ListSubscriptions pages through.
func (r *BillingRepository) CountSubscriptions(ctx context.Context, p ListParams, status string) (int64, error) {
	return r.countRows(ctx, subscriptionsWithUser, customerFilters("s", p, status))
}

// ExpireAllEnded is ExpireEnded for every user, so the super user's list
// shows what has ended.
func (r *BillingRepository) ExpireAllEnded(ctx context.Context) error {
	_, err := r.execContext(ctx, `
		UPDATE subscriptions SET status = 'expired', updated_at = now()
		WHERE status = 'active' AND current_period_end <= now()`)
	return err
}

// ExpireEnded marks a user's active subscription whose period is over as
// expired. Run before reading or starting one, it stands in for a job.
// ponytail: lazy, per user; a periodic job if expiry must show elsewhere.
func (r *BillingRepository) ExpireEnded(ctx context.Context, userID uuid.UUID) error {
	_, err := r.execContext(ctx, `
		UPDATE subscriptions SET status = 'expired', updated_at = now()
		WHERE user_id = $1 AND status = 'active' AND current_period_end <= now()`,
		userID,
	)
	return err
}

// LiveSubscription returns the user's pending or active subscription.
func (r *BillingRepository) LiveSubscription(ctx context.Context, userID uuid.UUID) (models.Subscription, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM subscriptions s JOIN plans p ON p.id = s.plan_id
		WHERE s.user_id = $1 AND s.status IN ('pending', 'active')`, subscriptionColumns)
	return scanSubscription(r.queryRowContext(ctx, query, userID))
}

// GetSubscription returns one subscription, whoever it belongs to.
func (r *BillingRepository) GetSubscription(ctx context.Context, id uuid.UUID) (models.Subscription, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM subscriptions s JOIN plans p ON p.id = s.plan_id
		WHERE s.id = $1`, subscriptionColumns)
	return scanSubscription(r.queryRowContext(ctx, query, id))
}

// InsertSubscription starts a pending subscription to plan at its current
// price, its period a placeholder until it is paid. orderID is the payment's
// order id. A live subscription already there is a conflict.
func (r *BillingRepository) InsertSubscription(ctx context.Context, id, userID uuid.UUID, plan models.Plan, orderID string) error {
	_, err := r.execContext(ctx, `
		INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, amount, currency, provider_ref)
		VALUES ($1, $2, $3, 'pending', now(), now() + ('1 ' || $4::text)::interval, $5, $6, $7)`,
		id, userID, plan.ID, *plan.BillingInterval, plan.Amount, plan.Currency, orderID,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return apperr.New(apperr.KindConflict, "you already have a subscription")
	}
	return translateRole(err)
}

// translateRole maps the foreign key that keeps billing to accounts with the
// 'user' role onto a 403.
func translateRole(err error) error {
	if hasPgCode(err, pgForeignKeyViolation) {
		return apperr.New(apperr.KindForbidden, "only user accounts can subscribe or buy a plan")
	}
	return err
}

// SettleSubscription activates a pending subscription for one billing
// interval from now. It reports whether it changed anything: a repeated
// notification finds it active already.
func (r *BillingRepository) SettleSubscription(ctx context.Context, id uuid.UUID) (bool, error) {
	res, err := r.execContext(ctx, `
		UPDATE subscriptions s
		SET status = 'active', current_period_start = now(),
		    current_period_end = now() + ('1 ' || p.billing_interval)::interval,
		    checkout_url = NULL, updated_at = now()
		FROM plans p
		WHERE s.id = $1 AND p.id = s.plan_id AND s.status = 'pending'`,
		id,
	)
	return affected(res, err)
}

// EndSubscription moves a subscription in status from to status to: a
// pending one whose payment failed or expired, or an active one refunded.
func (r *BillingRepository) EndSubscription(ctx context.Context, id uuid.UUID, from, to string) (bool, error) {
	res, err := r.execContext(ctx, `
		UPDATE subscriptions
		SET status = $3, checkout_url = NULL, updated_at = now(),
		    canceled_at = CASE WHEN $3 = 'canceled' THEN now() END
		WHERE id = $1 AND status = $2`,
		id, from, to,
	)
	return affected(res, err)
}

// SetSubscriptionCheckout stores where the user pays for a pending subscription.
func (r *BillingRepository) SetSubscriptionCheckout(ctx context.Context, id uuid.UUID, url string) error {
	_, err := r.execContext(ctx, `UPDATE subscriptions SET checkout_url = $2, updated_at = now() WHERE id = $1`, id, url)
	return err
}

// DeleteSubscription removes a pending subscription whose checkout could not
// be created, so the user is free to try again.
func (r *BillingRepository) DeleteSubscription(ctx context.Context, id uuid.UUID) error {
	_, err := r.execContext(ctx, `DELETE FROM subscriptions WHERE id = $1 AND status = 'pending'`, id)
	return err
}

const purchaseColumns = `
	b.id, b.created_at, b.updated_at, b.user_id, b.plan_id, b.status,
	b.amount, b.currency, b.paid_at, b.checkout_url, ` + planColumns

func purchaseDest(b *models.Purchase) []any {
	return append([]any{&b.ID, &b.CreatedAt, &b.UpdatedAt, &b.UserID, &b.PlanID, &b.Status,
		&b.Amount, &b.Currency, &b.PaidAt, &b.CheckoutURL}, planDest(&b.Plan)...)
}

func scanPurchase(row rowScanner) (models.Purchase, error) {
	var b models.Purchase
	err := row.Scan(purchaseDest(&b)...)
	return b, translateNotFound("purchases", err)
}

func scanPurchaseWithUser(row rowScanner) (models.Purchase, error) {
	var b models.Purchase
	b.User = &models.Customer{}
	err := row.Scan(append(purchaseDest(&b), &b.User.Name, &b.User.Email)...)
	return b, err
}

// ListAllPurchases returns one page of every customer's purchases, newest
// first unless p.Sorted says otherwise.
func (r *BillingRepository) ListAllPurchases(ctx context.Context, p ListParams, status string) ([]models.Purchase, error) {
	where, args, limit, offset := customerFilters("b", p, status).page(p)
	query := fmt.Sprintf(`
		SELECT %s, u.name, u.email FROM %s
		WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		purchaseColumns, purchasesWithUser, where,
		resolveOrder(p.Sorted, purchaseSortColumns, "b.created_at DESC"), limit, offset)
	rows, err := r.queryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanPurchaseWithUser)
}

// CountAllPurchases counts what ListAllPurchases pages through.
func (r *BillingRepository) CountAllPurchases(ctx context.Context, p ListParams, status string) (int64, error) {
	return r.countRows(ctx, purchasesWithUser, customerFilters("b", p, status))
}

// ListPurchases returns a user's purchases, newest first.
func (r *BillingRepository) ListPurchases(ctx context.Context, userID uuid.UUID) ([]models.Purchase, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM purchases b JOIN plans p ON p.id = b.plan_id
		WHERE b.user_id = $1 ORDER BY b.created_at DESC`, purchaseColumns)
	rows, err := r.queryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanPurchase)
}

// LivePurchase returns the user's pending or paid purchase of a plan.
func (r *BillingRepository) LivePurchase(ctx context.Context, userID, planID uuid.UUID) (models.Purchase, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM purchases b JOIN plans p ON p.id = b.plan_id
		WHERE b.user_id = $1 AND b.plan_id = $2 AND b.status IN ('pending', 'paid')`, purchaseColumns)
	return scanPurchase(r.queryRowContext(ctx, query, userID, planID))
}

// GetPurchase returns one purchase, whoever it belongs to.
func (r *BillingRepository) GetPurchase(ctx context.Context, id uuid.UUID) (models.Purchase, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM purchases b JOIN plans p ON p.id = b.plan_id
		WHERE b.id = $1`, purchaseColumns)
	return scanPurchase(r.queryRowContext(ctx, query, id))
}

// InsertPurchase starts a pending purchase of plan at its current price.
// A pending or paid purchase of the same plan already there is a conflict.
func (r *BillingRepository) InsertPurchase(ctx context.Context, id, userID uuid.UUID, plan models.Plan, orderID string) error {
	_, err := r.execContext(ctx, `
		INSERT INTO purchases (id, user_id, plan_id, status, amount, currency, provider_ref)
		VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
		id, userID, plan.ID, plan.Amount, plan.Currency, orderID,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return apperr.New(apperr.KindConflict, "you already bought this plan")
	}
	return translateRole(err)
}

// MovePurchase moves a purchase in status from to status to: pending to paid
// or failed, paid to refunded. It reports whether it changed anything.
func (r *BillingRepository) MovePurchase(ctx context.Context, id uuid.UUID, from, to string) (bool, error) {
	res, err := r.execContext(ctx, `
		UPDATE purchases
		SET status = $3, checkout_url = NULL, updated_at = now(),
		    paid_at = CASE WHEN $3 = 'paid' THEN now() ELSE paid_at END
		WHERE id = $1 AND status = $2`,
		id, from, to,
	)
	return affected(res, err)
}

// SetPurchaseCheckout stores where the user pays for a pending purchase.
func (r *BillingRepository) SetPurchaseCheckout(ctx context.Context, id uuid.UUID, url string) error {
	_, err := r.execContext(ctx, `UPDATE purchases SET checkout_url = $2, updated_at = now() WHERE id = $1`, id, url)
	return err
}

// DeletePurchase removes a pending purchase whose checkout could not be
// created.
func (r *BillingRepository) DeletePurchase(ctx context.Context, id uuid.UUID) error {
	_, err := r.execContext(ctx, `DELETE FROM purchases WHERE id = $1 AND status = 'pending'`, id)
	return err
}

// Stats counts what a super user's overview shows, in one round trip.
// Accounts are read from Authula, which owns them; a user whose mirror row
// is missing still counts, and super users do not. A subscription counts
// while its paid period runs, whether or not it was swept to expired yet.
func (r *BillingRepository) Stats(ctx context.Context) (models.Stats, error) {
	var s models.Stats
	err := r.queryRowContext(ctx, `
		SELECT u.total, u.recent, s.subscribed, p.total, p.on_offer
		FROM
			(SELECT count(*) AS total,
			        count(*) FILTER (WHERE a.created_at >= now() - interval '30 days') AS recent
			 FROM authula.users a LEFT JOIN users m ON m.id = a.id
			 WHERE m.role IS DISTINCT FROM $1) u,
			(SELECT count(DISTINCT user_id) AS subscribed FROM subscriptions
			 WHERE status = $2 AND current_period_end > now()) s,
			(SELECT count(*) AS total, count(*) FILTER (WHERE active) AS on_offer FROM plans) p`,
		constant.RoleSuperUser, models.SubscriptionActive,
	).Scan(&s.Users, &s.NewUsers30d, &s.SubscribedUsers, &s.Plans, &s.PlansOnOffer)
	if err != nil {
		return s, err
	}

	// A paid period is one whose start was moved to the payment
	// (SettleSubscription): unpaid ones keep the start they were created
	// with. Of those, active and expired ones were kept; a canceled one was
	// refunded.
	rows, err := r.queryContext(ctx, `
		SELECT currency, sum(amount)::bigint,
		       (coalesce(sum(amount) FILTER (WHERE current_period_start >= now() - interval '30 days'), 0))::bigint
		FROM subscriptions
		WHERE status IN ($1, $2) AND current_period_start > created_at
		GROUP BY currency
		ORDER BY sum(amount) DESC, currency`,
		models.SubscriptionActive, models.SubscriptionExpired,
	)
	if err != nil {
		return s, err
	}
	s.SubscriptionRevenue, err = collectRows(rows, func(row rowScanner) (models.Revenue, error) {
		var rev models.Revenue
		err := row.Scan(&rev.Currency, &rev.Total, &rev.Last30d)
		return rev, err
	})
	return s, err
}
