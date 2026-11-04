-- The activity log: who signed in, and who created, changed, shared or
-- removed an item. The server cannot read an item, so a row names it by id
-- and type only; the clients put a name to it from the vault they decrypt.
-- Rows older than 90 days are pruned when a log is read.

CREATE TABLE IF NOT EXISTS activity_logs (
  "id"         uuid PRIMARY KEY NOT NULL DEFAULT uuidv7(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  -- Who did it. Deleting the account deletes what it did.
  "actor_id"   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  "action"     text NOT NULL CHECK ("action" IN (
    'sign_in',
    'item_created', 'item_updated', 'item_trashed', 'item_restored', 'item_deleted',
    'item_shared', 'item_role_changed', 'item_member_removed'
  )),
  -- The item it was done to. No foreign key: an item deleted for good keeps
  -- its history for whoever did it.
  "item_id"    uuid,
  "item_type"  text,
  -- The member a share, a role change or a removal was about, and the role
  -- a share or a role change gave them.
  "subject_id" uuid REFERENCES users (id) ON DELETE CASCADE,
  "role"       text CHECK ("role" IN ('editor', 'viewer')),
  -- Where a sign-in came from. Item rows keep none: other members see them.
  "ip"         text,
  "user_agent" text
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs ("actor_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_item ON activity_logs ("item_id", "created_at" DESC) WHERE "item_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_subject ON activity_logs ("subject_id") WHERE "subject_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs ("created_at");
