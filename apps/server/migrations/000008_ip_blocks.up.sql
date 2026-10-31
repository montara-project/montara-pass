-- IP blocks: which client IPs are shut out of the API. The auto-block
-- (internal/middlewares/ip_block.go) records what it blocks here; a super
-- user adds and lifts blocks by hand. Enforcement itself reads the fast
-- key-value store ("ipblock:<ip>"), so a row here is the record and the
-- source to restore from at boot, not the check.

CREATE TABLE IF NOT EXISTS ip_blocks (
  "id"           uuid PRIMARY KEY NOT NULL DEFAULT uuidv7(),
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now(),
  -- What the client connected from, as the proxy stack reported it.
  "ip"           text NOT NULL,
  -- auto: the middleware blocked it after repeated failures; manual: a super
  -- user blocked it by hand.
  "source"       text NOT NULL CHECK ("source" IN ('auto', 'manual')),
  "reason"       text CHECK (length("reason") <= 500),
  -- active while it shuts the IP out; lifted when a super user removed it
  -- early; expired once blocked_until passed and it was swept.
  "status"       text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'lifted', 'expired')),
  -- When the block ends; NULL for a manual block that never ends.
  "blocked_until" timestamptz,
  "lifted_at"    timestamptz,
  CHECK (("status" = 'lifted') = ("lifted_at" IS NOT NULL))
);

-- One live block per IP: blocking it again extends the one there is.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_blocks_one_active ON ip_blocks ("ip") WHERE "status" = 'active';
CREATE INDEX IF NOT EXISTS idx_ip_blocks_created_at ON ip_blocks ("created_at");
