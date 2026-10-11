package models

import (
	"time"

	"github.com/google/uuid"
)

// Every []byte below is ciphertext or a wrapped key produced by the client;
// it travels as base64 in JSON and the server never reads it.

// UserKeys is a user's key set: the KDF parameters that turn the master
// password into the master key, and the keys that key unlocks.
type UserKeys struct {
	UserID              uuid.UUID `db:"user_id" json:"user_id"`
	CreatedAt           time.Time `db:"created_at" json:"created_at"`
	UpdatedAt           time.Time `db:"updated_at" json:"updated_at"`
	KDF                 string    `db:"kdf" json:"kdf"`
	KDFSalt             []byte    `db:"kdf_salt" json:"kdf_salt"`
	KDFMemoryKiB        int       `db:"kdf_memory_kib" json:"kdf_memory_kib"`
	KDFIterations       int       `db:"kdf_iterations" json:"kdf_iterations"`
	KDFParallelism      int       `db:"kdf_parallelism" json:"kdf_parallelism"`
	EncryptedVaultKey   []byte    `db:"encrypted_vault_key" json:"encrypted_vault_key"`
	PublicKey           []byte    `db:"public_key" json:"public_key"`
	EncryptedPrivateKey []byte    `db:"encrypted_private_key" json:"encrypted_private_key"`
}

// PublicKey is what one user learns about another in order to share with them.
type PublicKey struct {
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	Name      string    `db:"name" json:"name"`
	Email     string    `db:"email" json:"email"`
	PublicKey []byte    `db:"public_key" json:"public_key"`
}

type Folder struct {
	Base
	UserID        uuid.UUID `db:"user_id" json:"user_id"`
	EncryptedName []byte    `db:"encrypted_name" json:"encrypted_name"`
}

// Item is a vault item as one of its members sees it: the shared content plus
// that member's own role, wrapped item key and filing.
type Item struct {
	Base
	SoftDelete
	OwnerID          uuid.UUID  `db:"owner_id" json:"owner_id"`
	Type             string     `db:"type" json:"type"`
	CipherVersion    int        `db:"cipher_version" json:"cipher_version"`
	EncryptedData    []byte     `db:"encrypted_data" json:"encrypted_data"`
	Revision         int        `db:"revision" json:"revision"`
	Role             string     `db:"role" json:"role"`
	EncryptedItemKey []byte     `db:"encrypted_item_key" json:"encrypted_item_key"`
	FolderID         *uuid.UUID `db:"folder_id" json:"folder_id"`
	Favorite         bool       `db:"favorite" json:"favorite"`
	// When this member last filled the item into a page; nil if never.
	LastUsedAt *time.Time `db:"last_used_at" json:"last_used_at"`
}

// ItemMember is one user an item is shared with, the owner included.
type ItemMember struct {
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	Name      string    `db:"name" json:"name"`
	Email     string    `db:"email" json:"email"`
	Role      string    `db:"role" json:"role"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
