package repositories

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/models"
)

// ErrPasskeyLimit is Create refusing a passkey over the account's limit.
var ErrPasskeyLimit = errors.New("the account has as many passkeys as it may keep")

// PasskeyRepository keeps the passkeys users sign in with (see
// migrations/000010).
type PasskeyRepository struct {
	BaseRepository
}

const passkeyColumns = `id, created_at, user_id, name, credential, encrypted_vault_key, last_used_at`

// Create stores a passkey just registered, unless the account has max of
// them already (ErrPasskeyLimit). The count and the insert run under a lock
// per account, so registrations finished at once cannot both slip under it.
func (r *PasskeyRepository) Create(ctx context.Context, userID uuid.UUID, name string, cred webauthn.Credential, encryptedVaultKey *string, max int) (models.Passkey, error) {
	raw, err := json.Marshal(cred)
	if err != nil {
		return models.Passkey{}, err
	}
	var p models.Passkey
	err = lib.WithTransaction(ctx, r.DB, func(tx *sql.Tx) error {
		// Held until the transaction ends.
		if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('passkeys:' || $1::text, 0))`, userID); err != nil {
			return err
		}
		var count int
		if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM passkeys WHERE user_id = $1`, userID).Scan(&count); err != nil {
			return err
		}
		if count >= max {
			return ErrPasskeyLimit
		}
		p, err = scanPasskey(tx.QueryRowContext(ctx, `
			INSERT INTO passkeys (user_id, name, credential_id, credential, encrypted_vault_key)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING `+passkeyColumns, userID, name, cred.ID, raw, encryptedVaultKey))
		return err
	})
	return p, err
}

// ListByUser returns userID's passkeys, the oldest first.
func (r *PasskeyRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]models.Passkey, error) {
	rows, err := r.queryContext(ctx, `SELECT `+passkeyColumns+` FROM passkeys WHERE user_id = $1 ORDER BY created_at, id`, userID)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanPasskey)
}

// ByCredentialID finds the passkey an authenticator named; apperr.ErrNotFound
// when there is none.
func (r *PasskeyRepository) ByCredentialID(ctx context.Context, credentialID []byte) (models.Passkey, error) {
	p, err := scanPasskey(r.queryRowContext(ctx, `SELECT `+passkeyColumns+` FROM passkeys WHERE credential_id = $1`, credentialID))
	return p, translateNotFound("passkeys", err)
}

// Used records a sign-in with the passkey: the credential as the ceremony
// left it (its sign count and flags), and when.
func (r *PasskeyRepository) Used(ctx context.Context, id uuid.UUID, cred webauthn.Credential) error {
	raw, err := json.Marshal(cred)
	if err != nil {
		return err
	}
	_, err = r.execContext(ctx, `UPDATE passkeys SET credential = $2, last_used_at = now() WHERE id = $1`, id, raw)
	return err
}

// Delete removes one of userID's passkeys; apperr.ErrNotFound when they have
// no such passkey.
func (r *PasskeyRepository) Delete(ctx context.Context, userID, id uuid.UUID) error {
	res, err := r.execContext(ctx, `DELETE FROM passkeys WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	return requireAffected(res, "passkey")
}

func scanPasskey(row rowScanner) (models.Passkey, error) {
	var p models.Passkey
	var raw []byte
	if err := row.Scan(&p.ID, &p.CreatedAt, &p.UserID, &p.Name, &raw, &p.EncryptedVaultKey, &p.LastUsedAt); err != nil {
		return p, err
	}
	if err := json.Unmarshal(raw, &p.Credential); err != nil {
		return p, err
	}
	p.CredentialID = base64.RawURLEncoding.EncodeToString(p.Credential.ID)
	return p, nil
}
