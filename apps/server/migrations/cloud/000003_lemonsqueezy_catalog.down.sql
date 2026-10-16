ALTER TABLE users DROP COLUMN IF EXISTS provider_customer_id;
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_variant_id_key;
