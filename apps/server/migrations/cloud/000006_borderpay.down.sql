-- Plans with orders are kept, off sale: deleting them would break or take
-- the orders' history with them.
UPDATE plans SET active = false WHERE provider = 'borderpay';
DELETE FROM plans p
WHERE p.provider = 'borderpay'
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.plan_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM purchases b WHERE b.plan_id = p.id);

ALTER TABLE plans DROP COLUMN provider;
