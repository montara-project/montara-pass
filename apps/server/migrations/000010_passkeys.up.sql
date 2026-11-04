-- Passkeys for the account itself: signing in without the account password,
-- and, where the authenticator has the PRF extension, unlocking the vault
-- without the master password. Not the passkeys a user keeps in their vault
-- for other sites: those are items.

CREATE TABLE IF NOT EXISTS passkeys (
  "id"            uuid PRIMARY KEY NOT NULL DEFAULT uuidv7(),
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "user_id"       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  "name"          text NOT NULL,
  -- The authenticator's id for the credential, which a sign-in names it by.
  "credential_id" bytea NOT NULL UNIQUE,
  -- go-webauthn's Credential: the public key, the sign count and the flags.
  "credential"    jsonb NOT NULL,
  -- The vault key, sealed on the client with a key derived from the
  -- passkey's PRF output, which never reaches the server. NULL for a
  -- passkey that signs in only.
  "encrypted_vault_key" text,
  "last_used_at"  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys ("user_id");
