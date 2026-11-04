package models

import (
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// Passkey is a passkey for the account itself (see migrations/000010).
type Passkey struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uuid.UUID `json:"-"`
	Name      string    `json:"name"`
	// The credential id, base64url without padding, as the browser names it.
	CredentialID string `json:"credential_id"`
	// The vault key sealed under the passkey's PRF output; null for a passkey
	// that signs in only. Only its owner is ever sent it.
	EncryptedVaultKey *string    `json:"encrypted_vault_key"`
	LastUsedAt        *time.Time `json:"last_used_at"`

	Credential webauthn.Credential `json:"-"`
}
