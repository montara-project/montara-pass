package repositories

import (
	"context"

	"github.com/google/uuid"

	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/models"
)

// UserKeyRepository manages the key sets of the end-to-end encrypted vault.
type UserKeyRepository struct {
	BaseRepository
}

// Get returns a user's key set.
func (r *UserKeyRepository) Get(ctx context.Context, userID uuid.UUID) (models.UserKeys, error) {
	var k models.UserKeys
	err := r.queryRowContext(ctx, `
		SELECT user_id, created_at, updated_at, kdf, kdf_salt, kdf_memory_kib, kdf_iterations,
			kdf_parallelism, encrypted_vault_key, public_key, encrypted_private_key
		FROM user_keys WHERE user_id = $1`, userID,
	).Scan(&k.UserID, &k.CreatedAt, &k.UpdatedAt, &k.KDF, &k.KDFSalt, &k.KDFMemoryKiB, &k.KDFIterations,
		&k.KDFParallelism, &k.EncryptedVaultKey, &k.PublicKey, &k.EncryptedPrivateKey)
	return k, translateNotFound("user_keys", err)
}

// Insert stores a user's key set. A user has one, for good: replacing the key
// pair would lock them out of everything already shared with them.
func (r *UserKeyRepository) Insert(ctx context.Context, k models.UserKeys) error {
	_, err := r.execContext(ctx, `
		INSERT INTO user_keys (user_id, kdf_salt, kdf_memory_kib, kdf_iterations, kdf_parallelism,
			encrypted_vault_key, public_key, encrypted_private_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		k.UserID, k.KDFSalt, k.KDFMemoryKiB, k.KDFIterations, k.KDFParallelism,
		k.EncryptedVaultKey, k.PublicKey, k.EncryptedPrivateKey,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return apperr.New(apperr.KindConflict, "vault keys are already set up")
	}
	return err
}

// UpdateKDF rewrites the part of a key set that depends on the master
// password: the KDF parameters and the vault key wrapped by the new master key.
func (r *UserKeyRepository) UpdateKDF(ctx context.Context, k models.UserKeys) error {
	res, err := r.execContext(ctx, `
		UPDATE user_keys
		SET kdf_salt = $2, kdf_memory_kib = $3, kdf_iterations = $4, kdf_parallelism = $5,
			encrypted_vault_key = $6, updated_at = now()
		WHERE user_id = $1`,
		k.UserID, k.KDFSalt, k.KDFMemoryKiB, k.KDFIterations, k.KDFParallelism, k.EncryptedVaultKey,
	)
	if err != nil {
		return err
	}
	return requireAffected(res, "vault keys")
}

// PublicKeyByEmail returns the public key of the user with that email, for
// sharing. A user who has not set up a vault is reported as not found.
func (r *UserKeyRepository) PublicKeyByEmail(ctx context.Context, email string) (models.PublicKey, error) {
	var k models.PublicKey
	err := r.queryRowContext(ctx, `
		SELECT u.id, u.name, u.email, k.public_key
		FROM users u JOIN user_keys k ON k.user_id = u.id
		WHERE u.email = $1
		LIMIT 1`, email,
	).Scan(&k.UserID, &k.Name, &k.Email, &k.PublicKey)
	return k, translateNotFound("users", err)
}
