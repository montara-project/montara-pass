-- The IANA zone the user picked for the clock, the same in the web app and
-- the extension. Authula knows nothing about it, so the mirror upsert never
-- touches this column.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "time_zone" VARCHAR NOT NULL DEFAULT 'UTC';
