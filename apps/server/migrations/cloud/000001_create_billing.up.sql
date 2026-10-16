-- Billing, Cloud Edition only (see migrations.Cloud). Amounts are integers in
-- the currency's minor unit (cents for USD, rupiah for IDR), never floats.
--
-- Payments go through Midtrans Snap: every subscription period and every
-- purchase is one Snap transaction, whose order_id is the row's provider_ref.

-- Target of the composite foreign keys below, which keep a subscription or a
-- purchase on an account whose role is 'user'. Because they cascade on
-- update, giving such an account another role fails while it holds one.
ALTER TABLE users ADD CONSTRAINT users_id_role_key UNIQUE (id, role);

-- What can be bought: a recurring plan is subscribed to for one
-- billing_interval at a time; a one_time plan is bought once and kept.
CREATE TABLE plans (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Stable identifier for code and the payment provider, e.g. 'pro-monthly'.
  code             text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  name             text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  description      text CHECK (length(description) <= 2000),
  billing          text NOT NULL CHECK (billing IN ('recurring', 'one_time')),
  billing_interval text CHECK (billing_interval IN ('month', 'year')),
  amount           bigint NOT NULL CHECK (amount >= 0),
  currency         text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  -- Retired plans stay for the subscriptions and purchases that name them;
  -- only active ones are offered.
  active           boolean NOT NULL DEFAULT true,
  CHECK ((billing = 'recurring') = (billing_interval IS NOT NULL)),
  -- Target of the composite foreign keys that tie each table below to its
  -- kind of plan.
  UNIQUE (id, billing)
);

-- One paid period of a recurring plan. Snap charges once, so a period does not
-- renew by itself: the user subscribes again once it has ended. pending until
-- paid, then active to current_period_end, after which it reads as expired;
-- canceled when the payment fails or is refunded.
CREATE TABLE subscriptions (
  id                   uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  user_id              uuid NOT NULL,
  -- Fixed: only an account with the 'user' role subscribes.
  user_role            text NOT NULL DEFAULT 'user' CHECK (user_role = 'user'),
  plan_id              uuid NOT NULL,
  plan_billing         text NOT NULL DEFAULT 'recurring' CHECK (plan_billing = 'recurring'),
  status               text NOT NULL CHECK (status IN ('pending', 'active', 'canceled', 'expired')),
  -- Set from the payment: the period starts when it is paid.
  current_period_start timestamptz NOT NULL,
  current_period_end   timestamptz NOT NULL,
  canceled_at          timestamptz,
  -- What this period costs, kept apart from the plan, whose price may change.
  amount               bigint NOT NULL CHECK (amount >= 0),
  currency             text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  -- The payment provider's order id, for its notifications.
  provider_ref         text UNIQUE CHECK (length(provider_ref) <= 255),
  -- Where the user pays; kept so a pending payment can be resumed.
  checkout_url         text CHECK (length(checkout_url) <= 2048),
  CHECK (current_period_end > current_period_start),
  -- Billing history outlives the account: deleting a user who has any is refused.
  FOREIGN KEY (user_id, user_role) REFERENCES users (id, role) ON UPDATE CASCADE,
  FOREIGN KEY (plan_id, plan_billing) REFERENCES plans (id, billing)
);

-- Lists a user's subscriptions and serves the foreign key from users.
CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions (plan_id);
-- One live subscription per user; ended ones are kept as history.
CREATE UNIQUE INDEX idx_subscriptions_one_live ON subscriptions (user_id)
  WHERE status IN ('pending', 'active');

-- A one_time plan bought once. amount and currency are what was charged, kept
-- apart from the plan, whose price may change later.
CREATE TABLE purchases (
  id           uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  user_id      uuid NOT NULL,
  -- Fixed: only an account with the 'user' role buys.
  user_role    text NOT NULL DEFAULT 'user' CHECK (user_role = 'user'),
  plan_id      uuid NOT NULL,
  plan_billing text NOT NULL DEFAULT 'one_time' CHECK (plan_billing = 'one_time'),
  status       text NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  amount       bigint NOT NULL CHECK (amount >= 0),
  currency     text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  -- When the payment went through; a refunded purchase was paid first.
  paid_at      timestamptz,
  -- The payment provider's order id, for its notifications.
  provider_ref text UNIQUE CHECK (length(provider_ref) <= 255),
  -- Where the user pays; kept so a pending payment can be resumed.
  checkout_url text CHECK (length(checkout_url) <= 2048),
  CHECK ((status IN ('paid', 'refunded')) = (paid_at IS NOT NULL)),
  FOREIGN KEY (user_id, user_role) REFERENCES users (id, role) ON UPDATE CASCADE,
  FOREIGN KEY (plan_id, plan_billing) REFERENCES plans (id, billing)
);

CREATE INDEX idx_purchases_user_id ON purchases (user_id);
CREATE INDEX idx_purchases_plan_id ON purchases (plan_id);
-- A plan is bought once: a failed or refunded attempt may be retried.
CREATE UNIQUE INDEX idx_purchases_one_per_plan ON purchases (user_id, plan_id)
  WHERE status IN ('pending', 'paid');
