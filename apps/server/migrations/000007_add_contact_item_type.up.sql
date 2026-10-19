-- A contact: a name, a way to reach them and an address, encrypted like the rest.
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check
  CHECK (type IN ('login', 'secure_note', 'card', 'identity', 'contact'));
