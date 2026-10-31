-- BorderPay takes the IDR plans (see AGENTS: borderpay.id/docs). Plans gain
-- which provider sells them, and the IDR ones are seeded: BorderPay has no
-- catalog to sync, so their prices live here, in the currency's minor unit
-- (rupiah for IDR, whose minor unit is the rupiah itself).

-- Each plan is sold through one provider: the Lemon Squeezy catalog sync
-- only touches its own, and a checkout is opened at the plan's provider.
ALTER TABLE plans
  ADD COLUMN provider text NOT NULL DEFAULT 'lemonsqueezy'
    CHECK (provider IN ('lemonsqueezy', 'borderpay'));

-- The IDR prices, mirroring the USD ones: 25rb a month, 250rb a year (two
-- months free, which the pages read off the monthly plan), 5jt once. The
-- names match the store's so the pages read the tiers alike.
INSERT INTO plans (code, name, description, billing, billing_interval, amount, currency, active, provider)
VALUES
  ('pro-monthly-idr',  'Montara Pass Pro Monthly',   'Paid through BorderPay (QRIS).', 'recurring', 'month', 25000,   'IDR', true, 'borderpay'),
  ('pro-yearly-idr',   'Montara Pass Pro Yearly',    'Paid through BorderPay (QRIS).', 'recurring', 'year',  250000,  'IDR', true, 'borderpay'),
  ('pro-lifetime-idr', 'Montara Pass Pro Lifetime',  'Paid through BorderPay (QRIS).', 'one_time',  NULL,    5000000, 'IDR', true, 'borderpay')
ON CONFLICT (code) DO NOTHING;
