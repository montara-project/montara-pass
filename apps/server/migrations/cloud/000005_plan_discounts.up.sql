-- What a plan is marked down from, set by hand: Lemon Squeezy has no
-- compare-at price, so the catalog sync keeps it, and clears it once the
-- plan costs as much or more.
ALTER TABLE plans
  ADD COLUMN compare_at_amount bigint CHECK (compare_at_amount > amount);

-- The public Lemon Squeezy discount code a plan is offered with, filled in
-- at checkout, as of the last catalog sync: the cents it takes off amount,
-- how many of a recurring plan's payments it takes them off (NULL: all of
-- them), and when the code expires (NULL: never).
ALTER TABLE plans
  ADD COLUMN discount_code     text,
  ADD COLUMN discount_amount   bigint CHECK (discount_amount > 0 AND discount_amount <= amount),
  ADD COLUMN discount_payments integer CHECK (discount_payments > 0),
  ADD COLUMN discount_ends_at  timestamptz,
  ADD CHECK ((discount_code IS NULL) = (discount_amount IS NULL));
