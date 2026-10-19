-- When Lemon Squeezy last changed the subscription a row follows, as its
-- updated_at says: a webhook or sync older than this is stale and ignored.
ALTER TABLE subscriptions ADD COLUMN provider_updated_at timestamptz;
