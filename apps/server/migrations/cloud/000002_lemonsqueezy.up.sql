-- Payments move from Midtrans Snap to Lemon Squeezy (see migrations.Cloud). A
-- subscription now renews by itself: its status and current_period_end
-- follow Lemon Squeezy's webhooks instead of ending after one paid period.

-- The Lemon Squeezy variant a plan is sold as, which decides whether its
-- checkout bills once, monthly or yearly. The price still comes from the plan.
-- A plan without one is listed but cannot be bought.
ALTER TABLE plans ADD COLUMN variant_id text CHECK (variant_id ~ '^[0-9]{1,20}$');

-- The Lemon Squeezy subscription a paid one became: its later webhooks name
-- it, and its customer portal is asked for by it.
ALTER TABLE subscriptions
  ADD COLUMN provider_subscription_id text UNIQUE CHECK (provider_subscription_id ~ '^[0-9]{1,20}$');
