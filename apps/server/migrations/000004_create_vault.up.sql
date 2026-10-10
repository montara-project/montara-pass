-- Password vault with end-to-end encryption. The server stores ciphertext and
-- wrapped keys only: every bytea column below is encrypted or wrapped on the
-- client, so nothing here can be searched or sorted by its content.

-- One key set per user. The master password never leaves the client: it is
-- stretched with the KDF parameters below into a master key, which unwraps
-- the vault key, which in turn unwraps the private key. Changing the master
-- password rewrites this row only.
CREATE TABLE user_keys (
  user_id               uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  kdf                   text NOT NULL DEFAULT 'argon2id' CHECK (kdf IN ('argon2id')),
  kdf_salt              bytea NOT NULL CHECK (octet_length(kdf_salt) BETWEEN 16 AND 64),
  kdf_memory_kib        integer NOT NULL CHECK (kdf_memory_kib >= 19456),
  kdf_iterations        integer NOT NULL CHECK (kdf_iterations >= 2),
  kdf_parallelism       integer NOT NULL CHECK (kdf_parallelism >= 1),
  -- Vault key wrapped by the master key; encrypts folder names and the private key.
  encrypted_vault_key   bytea NOT NULL CHECK (octet_length(encrypted_vault_key) <= 512),
  -- Other users wrap item keys with this to share an item.
  public_key            bytea NOT NULL CHECK (octet_length(public_key) <= 1024),
  encrypted_private_key bytea NOT NULL CHECK (octet_length(encrypted_private_key) <= 8192)
);

-- Folders are personal: each user arranges the items they can see, shared
-- ones included, in their own folders.
CREATE TABLE folders (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Encrypted with the owner's vault key.
  encrypted_name bytea NOT NULL CHECK (octet_length(encrypted_name) <= 1024),
  -- Target of the composite foreign key on item_members, which keeps an item
  -- from being filed in someone else's folder.
  UNIQUE (id, user_id)
);

CREATE INDEX idx_folders_user_id ON folders (user_id);

-- A vault entry. Its content is encrypted with a random item key; that key is
-- stored once per member in item_members, wrapped for that member.
CREATE TABLE items (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Trash: set by the owner, hides the item from every member.
  deleted_at     timestamptz,
  -- Deleting the owner deletes the item for everyone it was shared with.
  owner_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Left in the clear so clients can filter and pick an icon.
  type           text NOT NULL CHECK (type IN ('login', 'secure_note', 'card', 'identity')),
  -- Format of encrypted_data, so the cipher can change later.
  cipher_version smallint NOT NULL DEFAULT 1 CHECK (cipher_version > 0),
  encrypted_data bytea NOT NULL CHECK (octet_length(encrypted_data) <= 65536),
  -- Incremented on every write; an update names the revision it read, so two
  -- members editing at once cannot silently overwrite each other.
  revision       integer NOT NULL DEFAULT 1 CHECK (revision > 0)
);

CREATE INDEX idx_items_owner_id ON items (owner_id);
-- For the job that purges the trash.
CREATE INDEX idx_items_deleted_at ON items (deleted_at) WHERE deleted_at IS NOT NULL;

-- Who can open an item, the owner included. Sharing inserts a row holding the
-- item key wrapped with the recipient's public key; revoking deletes the row,
-- after which the client should rotate the item key for the remaining members.
CREATE TABLE item_members (
  item_id            uuid NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  role               text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  encrypted_item_key bytea NOT NULL CHECK (octet_length(encrypted_item_key) <= 1024),
  -- The member's own filing of the item; NULL means no folder.
  folder_id          uuid,
  favorite           boolean NOT NULL DEFAULT false,
  -- NULL on the owner's own row.
  shared_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  PRIMARY KEY (item_id, user_id),
  -- Deleting a folder unfiles its items instead of removing the membership.
  FOREIGN KEY (folder_id, user_id) REFERENCES folders (id, user_id) ON DELETE SET NULL (folder_id)
);

-- Lists a user's vault, optionally one folder of it; also serves the folder
-- foreign key and the cascade from users.
CREATE INDEX idx_item_members_user_folder ON item_members (user_id, folder_id);
CREATE UNIQUE INDEX idx_item_members_one_owner ON item_members (item_id) WHERE role = 'owner';
CREATE INDEX idx_item_members_shared_by ON item_members (shared_by) WHERE shared_by IS NOT NULL;
