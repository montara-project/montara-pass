-- When the member last filled the item into a page. Like folder and favorite
-- it belongs to the member, not to the item: a shared login keeps one per user.
ALTER TABLE item_members ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
