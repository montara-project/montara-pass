package repositories

import (
	"context"

	"github.com/google/uuid"

	"montara-pass/server/internal/models"
)

// FolderRepository manages a user's folders. Every method is scoped to the
// owner, so one user cannot reach another's folder by its id.
type FolderRepository struct {
	BaseRepository
}

// maxFolders bounds the unpaginated folder list.
const maxFolders = 1000

func scanFolder(row rowScanner) (models.Folder, error) {
	var f models.Folder
	err := row.Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt, &f.UserID, &f.EncryptedName)
	return f, translateNotFound("folders", err)
}

// List returns all of a user's folders, oldest first. Names are encrypted, so
// the client orders them once decrypted.
func (r *FolderRepository) List(ctx context.Context, userID uuid.UUID) ([]models.Folder, error) {
	rows, err := r.queryContext(ctx, `
		SELECT id, created_at, updated_at, user_id, encrypted_name
		FROM folders WHERE user_id = $1
		ORDER BY id
		LIMIT $2`, userID, maxFolders)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanFolder)
}

// Insert creates a folder and returns it.
func (r *FolderRepository) Insert(ctx context.Context, userID uuid.UUID, encryptedName []byte) (models.Folder, error) {
	return scanFolder(r.queryRowContext(ctx, `
		INSERT INTO folders (user_id, encrypted_name)
		VALUES ($1, $2)
		RETURNING id, created_at, updated_at, user_id, encrypted_name`,
		userID, encryptedName))
}

// Update renames a folder and returns it.
func (r *FolderRepository) Update(ctx context.Context, id, userID uuid.UUID, encryptedName []byte) (models.Folder, error) {
	return scanFolder(r.queryRowContext(ctx, `
		UPDATE folders
		SET encrypted_name = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, created_at, updated_at, user_id, encrypted_name`,
		id, userID, encryptedName))
}

// Delete removes a folder; the items filed in it are unfiled, not deleted.
func (r *FolderRepository) Delete(ctx context.Context, id, userID uuid.UUID) error {
	res, err := r.execContext(ctx, `DELETE FROM folders WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	return requireAffected(res, "folder")
}
