-- The catalog comes from Lemon Squeezy: one plan per variant, kept in step
-- by a sync that finds each plan by its variant.
ALTER TABLE plans ADD CONSTRAINT plans_variant_id_key UNIQUE (variant_id);

-- The Lemon Squeezy customer a user account is saved as, on sign-up or at
-- its first checkout.
ALTER TABLE users
  ADD COLUMN provider_customer_id text UNIQUE CHECK (provider_customer_id ~ '^[0-9]{1,20}$');
