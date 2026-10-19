-- The contacts go with their type.
DELETE FROM items WHERE type = 'contact';
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check
  CHECK (type IN ('login', 'secure_note', 'card', 'identity'));
