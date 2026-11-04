package dtos

import (
	"encoding/json"

	"montara-pass/server/internal/lib/validator"
)

// PasskeyRegisterBeginBody asks to register a passkey; the account password
// guards it as it guards turning TOTP on.
type PasskeyRegisterBeginBody struct {
	Password string `json:"password"`
}

func (dto PasskeyRegisterBeginBody) Validate(v *validator.MapValidator) {
	v.Field("password").Required().String().MaxLen(128)
}

// PasskeyRegisterFinishBody is the browser's answer to a registration, and
// what to keep with the passkey.
type PasskeyRegisterFinishBody struct {
	Ceremony string `json:"ceremony"`
	Name     string `json:"name"`
	// The vault key sealed under the passkey's PRF output; absent for an
	// authenticator without PRF, whose passkey then signs in only.
	EncryptedVaultKey *string `json:"encrypted_vault_key"`
	// The PublicKeyCredential, as JSON (base64url fields).
	Credential json.RawMessage `json:"credential"`
}

func (dto PasskeyRegisterFinishBody) Validate(v *validator.MapValidator) {
	v.Field("ceremony").Required().String().MaxLen(64)
	v.Field("name").Required().String().MaxLen(100)
	v.Field("encrypted_vault_key").Base64(256)
	v.Field("credential").Required()
}

// PasskeySignInBody is the browser's answer to a passkey sign-in.
type PasskeySignInBody struct {
	Ceremony   string          `json:"ceremony"`
	Credential json.RawMessage `json:"credential"`
}
