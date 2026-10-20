ALTER TABLE plans
  DROP COLUMN IF EXISTS discount_ends_at,
  DROP COLUMN IF EXISTS discount_payments,
  DROP COLUMN IF EXISTS discount_amount,
  DROP COLUMN IF EXISTS discount_code,
  DROP COLUMN IF EXISTS compare_at_amount;
