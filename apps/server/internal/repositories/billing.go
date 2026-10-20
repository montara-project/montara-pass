package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/models"

	"github.com/google/uuid"
)

// BillingRepository manages the Cloud Edition's plans, subscriptions and
// purchases (see migrations/cloud). The database holds the rules: only an
// account with the 'user' role subscribes or buys, each table takes only its
// kind of plan, and a user has one live subscription.
type BillingRepository struct {
	BaseRepository
}

const planColumns = `
	p.id, p.created_at, p.updated_at, p.code, p.name, p.description,
	p.billing, p.billing_interval, p.amount, p.compare_at_amount, p.currency, p.active, p.variant_id,
	p.discount_code, p.discount_amount, p.discount_payments, p.discount_ends_at`

func planDest(p *models.Plan) []any {
	return []any{&p.ID, &p.CreatedAt, &p.UpdatedAt, &p.Code, &p.Name, &p.Description,
		&p.Billing, &p.BillingInterval, &p.Amount, &p.CompareAtAmount, &p.Currency, &p.Active, &p.VariantID,
		&p.DiscountCode, &p.DiscountAmount, &p.DiscountPayments, &p.DiscountEndsAt}
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

// SyncPlans makes the plans what the Lemon Squeezy catalog sells: each of
// plans, found by its variant, is added or brought up to date, and every
// other plan is taken off sale. A plan keeps its kind, which subscriptions
// and purchases name: one whose variant changed kind is taken off sale too.
// It returns the codes of those that did. A plan's compare_at_amount is
// not Lemon Squeezy's and is kept, unless the new price meets it.
func (r *BillingRepository) SyncPlans(ctx context.Context, plans []models.Plan) (changedKind []string, err error) {
	err = lib.WithTransaction(ctx, r.DB, func(tx *sql.Tx) error {
		kept := []string{}
		for _, p := range plans {
			var id uuid.UUID
			err := tx.QueryRowContext(ctx, `
				INSERT INTO plans (code, name, description, billing, billing_interval, amount, currency, active, variant_id,
				                   discount_code, discount_amount, discount_payments, discount_ends_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
				ON CONFLICT (variant_id) DO UPDATE
				SET name = EXCLUDED.name, description = EXCLUDED.description,
				    billing_interval = EXCLUDED.billing_interval, amount = EXCLUDED.amount,
				    currency = EXCLUDED.currency, active = EXCLUDED.active, updated_at = now(),
				    discount_code = EXCLUDED.discount_code, discount_amount = EXCLUDED.discount_amount,
				    discount_payments = EXCLUDED.discount_payments, discount_ends_at = EXCLUDED.discount_ends_at,
				    -- Set by hand, not by Lemon Squeezy: kept while it is still a markdown.
				    compare_at_amount = CASE WHEN plans.compare_at_amount > EXCLUDED.amount
				                             THEN plans.compare_at_amount END
				WHERE plans.billing = EXCLUDED.billing
				RETURNING id`,
				p.Code, p.Name, p.Description, p.Billing, p.BillingInterval, p.Amount, p.Currency, p.Active, p.VariantID,
				p.DiscountCode, p.DiscountAmount, p.DiscountPayments, p.DiscountEndsAt,
			).Scan(&id)
			switch {
			case errors.Is(err, sql.ErrNoRows):
				changedKind = append(changedKind, p.Code)
			case err != nil:
				return fmt.Errorf("sync plan %s: %w", p.Code, err)
			default:
				kept = append(kept, *p.VariantID)
			}
		}

		_, err := tx.ExecContext(ctx, `
			UPDATE plans SET active = false, updated_at = now()
			WHERE active AND (variant_id IS NULL OR NOT (variant_id = ANY($1)))`, kept)
		return err
	})
	return changedKind, err
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

// ExpireEnded marks the active subscriptions whose period is over as
// expired, and drops the pending payments whose checkout can no longer be
// paid: the user's, or with a nil userID everyone's, for the super user's
// lists. Lemon Squeezy sends nothing when a checkout lapses, so a pending
// row is let go a little after lemonsqueezy.CheckoutLifetime (an hour), once
// a payment made at its last minute has had time to be reported. Run before
// reading or starting one, it stands in for a job.
// ponytail: lazy, on read; a periodic job if expiry must show elsewhere.
func (r *BillingRepository) ExpireEnded(ctx context.Context, userID *uuid.UUID) error {
	_, err := r.execContext(ctx, `
		UPDATE subscriptions SET status = 'expired', checkout_url = NULL, updated_at = now()
		WHERE ($1::uuid IS NULL OR user_id = $1)
		  AND ((status = 'active' AND current_period_end <= now())
		    OR (status = 'pending' AND created_at <= now() - interval '65 minutes'))`,
		userID,
	)
	if err != nil {
		return err
	}
	_, err = r.execContext(ctx, `
		UPDATE purchases SET status = 'failed', checkout_url = NULL, updated_at = now()
		WHERE ($1::uuid IS NULL OR user_id = $1)
		  AND status = 'pending' AND created_at <= now() - interval '65 minutes'`,
		userID,
	)
	return err
}

// HasPaidPlan reports whether the user holds a paid plan: an active
// subscription whose period still runs, or a paid one-time purchase, which
// never renews and so unlocks for good. The period is checked here, so an
// active subscription that ExpireEnded has not swept yet does not count.
func (r *BillingRepository) HasPaidPlan(ctx context.Context, userID uuid.UUID) (bool, error) {
	var paid bool
	err := r.queryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM subscriptions
			WHERE user_id = $1 AND status = $2 AND current_period_end > now()
		) OR EXISTS (
			SELECT 1 FROM purchases WHERE user_id = $1 AND status = $3
		)`,
		userID, models.SubscriptionActive, models.PurchasePaid,
	).Scan(&paid)
	return paid, err
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

// InsertSubscription starts a pending subscription to plan at amount, the
// price its checkout asks, its period a placeholder until it is paid.
// orderID is the payment's order id. A live subscription already there is a
// conflict.
func (r *BillingRepository) InsertSubscription(ctx context.Context, id, userID uuid.UUID, plan models.Plan, amount int64, orderID string) error {
	_, err := r.execContext(ctx, `
		INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, amount, currency, provider_ref)
		VALUES ($1, $2, $3, 'pending', now(), now() + ('1 ' || $4::text)::interval, $5, $6, $7)`,
		id, userID, plan.ID, *plan.BillingInterval, amount, plan.Currency, orderID,
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

// ApplySubscription brings a subscription to what Lemon Squeezy reports for
// it: active to periodEnd while it grants its plan, expired otherwise, with
// canceled_at set once it will not renew. The first report (a pending row)
// starts its period now and ties it to providerID. An active one moves on;
// an expired one comes back only for its own Lemon Squeezy subscription, as
// a renewal that was retried and then went through. A canceled (refunded)
// one stays. A report older than the last one applied (by Lemon Squeezy's
// updated_at, providerUpdatedAt) is stale, as from a late retry, and left
// out. It reports whether it changed anything.
func (r *BillingRepository) ApplySubscription(ctx context.Context, id uuid.UUID, providerID, status string, periodEnd time.Time, cancelled bool, providerUpdatedAt time.Time) (bool, error) {
	res, err := r.execContext(ctx, `
		UPDATE subscriptions SET
		    status = $3,
		    current_period_start = CASE WHEN status = 'pending' THEN now() ELSE current_period_start END,
		    current_period_end = GREATEST($4,
		        (CASE WHEN status = 'pending' THEN now() ELSE current_period_start END) + interval '1 second'),
		    canceled_at = CASE WHEN $5 THEN coalesce(canceled_at, now()) END,
		    provider_subscription_id = $2, provider_updated_at = $6, checkout_url = NULL, updated_at = now()
		WHERE id = $1
		  AND (status IN ('pending', 'active') OR (status = 'expired' AND provider_subscription_id = $2))
		  AND (provider_updated_at IS NULL OR provider_updated_at <= $6)
		  AND (status, current_period_end, canceled_at IS NOT NULL, provider_subscription_id, provider_updated_at)
		      IS DISTINCT FROM ($3, $4, $5, $2, $6)`,
		id, providerID, status, periodEnd, cancelled, providerUpdatedAt,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return false, apperr.New(apperr.KindConflict, "the user already has another live subscription")
	}
	return affected(res, err)
}

// LinkedSubscriptions returns every subscription a Lemon Squeezy subscription
// was tied to, by that subscription's id.
func (r *BillingRepository) LinkedSubscriptions(ctx context.Context) (map[string]models.Subscription, error) {
	query := fmt.Sprintf(`
		SELECT s.provider_subscription_id, %s FROM subscriptions s JOIN plans p ON p.id = s.plan_id
		WHERE s.provider_subscription_id IS NOT NULL`, subscriptionColumns)
	rows, err := r.queryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]models.Subscription{}
	for rows.Next() {
		var providerID string
		var s models.Subscription
		if err := rows.Scan(append([]any{&providerID}, subscriptionDest(&s)...)...); err != nil {
			return nil, err
		}
		out[providerID] = s
	}
	return out, rows.Err()
}

// ProviderSubscriptionID returns the Lemon Squeezy subscription of the user's
// latest subscription that became one.
func (r *BillingRepository) ProviderSubscriptionID(ctx context.Context, userID uuid.UUID) (string, error) {
	var id string
	err := r.queryRowContext(ctx, `
		SELECT provider_subscription_id FROM subscriptions
		WHERE user_id = $1 AND provider_subscription_id IS NOT NULL
		ORDER BY created_at DESC LIMIT 1`, userID).Scan(&id)
	return id, translateNotFound("subscriptions", err)
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

// InsertPurchase starts a pending purchase of plan at amount, the price its
// checkout asks. A pending or paid purchase of the same plan already there
// is a conflict.
func (r *BillingRepository) InsertPurchase(ctx context.Context, id, userID uuid.UUID, plan models.Plan, amount int64, orderID string) error {
	_, err := r.execContext(ctx, `
		INSERT INTO purchases (id, user_id, plan_id, status, amount, currency, provider_ref)
		VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
		id, userID, plan.ID, amount, plan.Currency, orderID,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return apperr.New(apperr.KindConflict, "you already bought this plan")
	}
	return translateRole(err)
}

// MovePurchase moves a purchase in status from to status to: pending to paid
// or failed, paid to refunded. A non-nil amount is what was charged, as Lemon
// Squeezy settled it, and replaces the price the checkout asked. It reports
// whether it changed anything.
func (r *BillingRepository) MovePurchase(ctx context.Context, id uuid.UUID, from, to string, amount *int64) (bool, error) {
	res, err := r.execContext(ctx, `
		UPDATE purchases
		SET status = $3, checkout_url = NULL, updated_at = now(), amount = coalesce($4, amount),
		    paid_at = CASE WHEN $3 = 'paid' THEN now() ELSE paid_at END
		WHERE id = $1 AND status = $2`,
		id, from, to, amount,
	)
	return affected(res, err)
}

// SetAmount records another price for a subscription or purchase (table as
// for SetCheckout): what Lemon Squeezy settled a subscription's first payment
// at, or the full price of a checkout opened again without its discount. It
// reports whether it changed anything.
func (r *BillingRepository) SetAmount(ctx context.Context, table string, id uuid.UUID, amount int64) (bool, error) {
	res, err := r.execContext(ctx, fmt.Sprintf(`UPDATE %s SET amount = $2, updated_at = now() WHERE id = $1 AND amount <> $2`, table), id, amount)
	return affected(res, err)
}

// CustomerID returns the Lemon Squeezy customer a user is saved as.
func (r *BillingRepository) CustomerID(ctx context.Context, userID uuid.UUID) (string, error) {
	var id *string
	err := r.queryRowContext(ctx, `SELECT provider_customer_id FROM users WHERE id = $1`, userID).Scan(&id)
	if err == nil && id == nil {
		err = sql.ErrNoRows
	}
	if err != nil {
		return "", translateNotFound("customers", err)
	}
	return *id, nil
}

// SetCustomerID records the Lemon Squeezy customer a user is saved as, unless
// one already is.
func (r *BillingRepository) SetCustomerID(ctx context.Context, userID uuid.UUID, customerID string) error {
	_, err := r.execContext(ctx, `
		UPDATE users SET provider_customer_id = $2
		WHERE id = $1 AND provider_customer_id IS NULL`, userID, customerID)
	return err
}

// SetCheckout stores where the user pays for a pending subscription or
// purchase. table is "subscriptions" or "purchases", a caller-supplied
// literal, never request input.
func (r *BillingRepository) SetCheckout(ctx context.Context, table string, id uuid.UUID, url string) error {
	_, err := r.execContext(ctx, fmt.Sprintf(`UPDATE %s SET checkout_url = $2, updated_at = now() WHERE id = $1`, table), id, url)
	return err
}

// DeletePending removes a pending subscription or purchase (table as for
// SetCheckout) whose checkout could not be created, so the user is free to
// try again.
func (r *BillingRepository) DeletePending(ctx context.Context, table string, id uuid.UUID) error {
	_, err := r.execContext(ctx, fmt.Sprintf(`DELETE FROM %s WHERE id = $1 AND status = 'pending'`, table), id)
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
	// (ApplySubscription): unpaid ones keep the start they were created
	// with. Of those, active and expired ones were kept; a canceled one was
	// refunded.
	// ponytail: one period per subscription; renewals Lemon Squeezy charges
	// are not counted here. Record subscription_payment_success if the
	// overview must match its dashboard.
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
