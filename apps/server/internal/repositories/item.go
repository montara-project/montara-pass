package repositories

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"

	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/models"
)

// ItemRepository manages vault items and who they are shared with. Reads go
// through item_members, so a user only ever sees items they are a member of;
// handlers check the member's role before calling a write.
type ItemRepository struct {
	BaseRepository
}

// itemSource joins an item to one member's row. A trashed item stays visible
// to its owner only.
const itemSource = `item_members m JOIN items i ON i.id = m.item_id`

const itemColumns = `
	i.id, i.created_at, i.updated_at, i.deleted_at, i.owner_id, i.type, i.cipher_version,
	i.encrypted_data, i.revision, m.role, m.encrypted_item_key, m.folder_id, m.favorite,
	m.last_used_at`

var (
	errFolderNotFound = apperr.New(apperr.KindNotFound, "folder not found")
	// errStaleItem answers a write that named an old revision, or an item
	// that was trashed or taken away in the meantime.
	errStaleItem = apperr.New(apperr.KindConflict, "item has changed, reload it and try again")
)

func scanItem(row rowScanner) (models.Item, error) {
	var it models.Item
	err := row.Scan(&it.ID, &it.CreatedAt, &it.UpdatedAt, &it.DeletedAt, &it.OwnerID, &it.Type, &it.CipherVersion,
		&it.EncryptedData, &it.Revision, &it.Role, &it.EncryptedItemKey, &it.FolderID, &it.Favorite,
		&it.LastUsedAt)
	return it, translateNotFound("items", err)
}

// ItemListParams filters one user's vault.
type ItemListParams struct {
	UserID   uuid.UUID
	Offset   int
	Limit    int
	FolderID *uuid.UUID
	Type     string
	// Trashed lists the user's own trash instead of the live items.
	Trashed bool
}

func itemFilters(p ItemListParams) *whereBuilder {
	base := `i.deleted_at IS NULL`
	if p.Trashed {
		base = `i.deleted_at IS NOT NULL AND i.owner_id = m.user_id`
	}
	w := newWhere(base)
	w.add("m.user_id = $%d", p.UserID)
	if p.FolderID != nil {
		w.add("m.folder_id = $%d", *p.FolderID)
	}
	if p.Type != "" {
		w.add("i.type = $%d", p.Type)
	}
	return w
}

// List returns one page of a user's items, newest first.
func (r *ItemRepository) List(ctx context.Context, p ItemListParams) ([]models.Item, error) {
	where, args, limit, offset := itemFilters(p).page(ListParams{Limit: p.Limit, Offset: p.Offset})

	query := fmt.Sprintf(`
		SELECT %s FROM %s
		WHERE %s
		ORDER BY i.id DESC
		LIMIT $%d OFFSET $%d`,
		itemColumns, itemSource, where, limit, offset)

	rows, err := r.queryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, scanItem)
}

// Count returns how many items match the List filters.
func (r *ItemRepository) Count(ctx context.Context, p ItemListParams) (int64, error) {
	return r.countRows(ctx, itemSource, itemFilters(p))
}

// Get returns an item as userID sees it, or not found when they are not a
// member of it.
func (r *ItemRepository) Get(ctx context.Context, id, userID uuid.UUID) (models.Item, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM %s
		WHERE m.item_id = $1 AND m.user_id = $2
			AND (i.deleted_at IS NULL OR i.owner_id = m.user_id)`,
		itemColumns, itemSource)
	return scanItem(r.queryRowContext(ctx, query, id, userID))
}

// Insert creates an item together with its owner's membership, which carries
// the item key wrapped for the owner. it.ID is set by the caller.
func (r *ItemRepository) Insert(ctx context.Context, it models.Item) error {
	return lib.WithTransaction(ctx, r.DB, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO items (id, owner_id, type, cipher_version, encrypted_data)
			VALUES ($1, $2, $3, $4, $5)`,
			it.ID, it.OwnerID, it.Type, it.CipherVersion, it.EncryptedData,
		); err != nil {
			return err
		}

		_, err := tx.ExecContext(ctx, `
			INSERT INTO item_members (item_id, user_id, role, encrypted_item_key, folder_id, favorite)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			it.ID, it.OwnerID, constant.ItemRoleOwner, it.EncryptedItemKey, it.FolderID, it.Favorite,
		)
		// The composite foreign key refuses a folder that is not the owner's.
		if hasPgCode(err, pgForeignKeyViolation) {
			return errFolderNotFound
		}
		return err
	})
}

// Update rewrites an item's content on behalf of userID, who must still be
// its owner or an editor. revision is the one the client read; an empty type
// or a zero cipher version keeps the stored value.
func (r *ItemRepository) Update(ctx context.Context, it models.Item, userID uuid.UUID) error {
	res, err := r.execContext(ctx, `
		UPDATE items
		SET type = COALESCE(NULLIF($3, ''), type),
			cipher_version = COALESCE(NULLIF($4, 0), cipher_version),
			encrypted_data = $5, revision = revision + 1, updated_at = now()
		WHERE id = $1 AND revision = $2 AND deleted_at IS NULL
			AND EXISTS (
				SELECT 1 FROM item_members
				WHERE item_id = $1 AND user_id = $6 AND role IN ('owner', 'editor'))`,
		it.ID, it.Revision, it.Type, it.CipherVersion, it.EncryptedData, userID,
	)
	if err != nil {
		return err
	}
	return requireChanged(res)
}

// RotateKey re-encrypts an item under a new item key: the new content, and
// the new key wrapped for every current member. keys must name exactly the
// current members, so nobody is left holding a key that no longer opens it.
func (r *ItemRepository) RotateKey(ctx context.Context, it models.Item, keys map[uuid.UUID][]byte) error {
	return lib.WithTransaction(ctx, r.DB, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `
			UPDATE items
			SET cipher_version = COALESCE(NULLIF($4, 0), cipher_version),
				encrypted_data = $5, revision = revision + 1, updated_at = now()
			WHERE id = $1 AND owner_id = $2 AND revision = $3 AND deleted_at IS NULL`,
			it.ID, it.OwnerID, it.Revision, it.CipherVersion, it.EncryptedData,
		)
		if err != nil {
			return err
		}
		if err := requireChanged(res); err != nil {
			return err
		}

		// Locks the member rows until the new keys are written.
		rows, err := tx.QueryContext(ctx, `SELECT user_id FROM item_members WHERE item_id = $1 FOR UPDATE`, it.ID)
		if err != nil {
			return err
		}
		members, err := collectRows(rows, func(row rowScanner) (uuid.UUID, error) {
			var id uuid.UUID
			return id, row.Scan(&id)
		})
		if err != nil {
			return err
		}

		if len(members) != len(keys) {
			return errMemberKeys
		}
		for _, member := range members {
			key, ok := keys[member]
			if !ok {
				return errMemberKeys
			}
			if _, err := tx.ExecContext(ctx, `
				UPDATE item_members SET encrypted_item_key = $3, updated_at = now()
				WHERE item_id = $1 AND user_id = $2`,
				it.ID, member, key,
			); err != nil {
				return err
			}
		}
		return nil
	})
}

var errMemberKeys = apperr.New(apperr.KindConflict, "member_keys must name every current member of the item, and nobody else")

// requireChanged turns a revision-checked write that touched no row into the
// stale-item conflict.
func requireChanged(res sql.Result) error {
	if ok, err := affected(res, nil); err != nil || ok {
		return err
	}
	return errStaleItem
}

// Trash soft-deletes an item for every member. Owner only.
func (r *ItemRepository) Trash(ctx context.Context, id, ownerID uuid.UUID) error {
	return r.ownerWrite(ctx, `
		UPDATE items SET deleted_at = now(), updated_at = now()
		WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`, id, ownerID)
}

// Restore brings an item back from the trash. Owner only.
func (r *ItemRepository) Restore(ctx context.Context, id, ownerID uuid.UUID) error {
	return r.ownerWrite(ctx, `
		UPDATE items SET deleted_at = NULL, updated_at = now()
		WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL`, id, ownerID)
}

// ForceDelete permanently removes an item and its memberships. Owner only.
func (r *ItemRepository) ForceDelete(ctx context.Context, id, ownerID uuid.UUID) error {
	return r.ownerWrite(ctx, `DELETE FROM items WHERE id = $1 AND owner_id = $2`, id, ownerID)
}

func (r *ItemRepository) ownerWrite(ctx context.Context, query string, id, ownerID uuid.UUID) error {
	res, err := r.execContext(ctx, query, id, ownerID)
	if err != nil {
		return err
	}
	return requireAffected(res, "item")
}

// MarkUsed records that the member filled the item into a page just now. It
// touches nobody else's view, and not the item's revision or updated_at.
func (r *ItemRepository) MarkUsed(ctx context.Context, id, userID uuid.UUID) error {
	res, err := r.execContext(ctx, `
		UPDATE item_members SET last_used_at = now()
		WHERE item_id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil {
		return err
	}
	return requireAffected(res, "item")
}

// SetPlacement files an item in one of the member's own folders (nil for
// none) and sets their favorite flag. It touches nobody else's view.
func (r *ItemRepository) SetPlacement(ctx context.Context, id, userID uuid.UUID, folderID *uuid.UUID, favorite bool) error {
	res, err := r.execContext(ctx, `
		UPDATE item_members SET folder_id = $3, favorite = $4, updated_at = now()
		WHERE item_id = $1 AND user_id = $2`,
		id, userID, folderID, favorite,
	)
	if hasPgCode(err, pgForeignKeyViolation) {
		return errFolderNotFound
	}
	if err != nil {
		return err
	}
	return requireAffected(res, "item")
}

// ListMembers returns everyone an item is shared with, the owner first.
func (r *ItemRepository) ListMembers(ctx context.Context, id uuid.UUID) ([]models.ItemMember, error) {
	rows, err := r.queryContext(ctx, `
		SELECT m.user_id, u.name, u.email, m.role, m.created_at
		FROM item_members m JOIN users u ON u.id = m.user_id
		WHERE m.item_id = $1
		ORDER BY (m.role = 'owner') DESC, m.created_at`, id)
	if err != nil {
		return nil, err
	}
	return collectRows(rows, func(row rowScanner) (models.ItemMember, error) {
		var m models.ItemMember
		return m, row.Scan(&m.UserID, &m.Name, &m.Email, &m.Role, &m.CreatedAt)
	})
}

// AddMember shares an item with userID: encryptedItemKey is the item key
// wrapped with their public key, so they must have set up a vault.
func (r *ItemRepository) AddMember(ctx context.Context, id, userID, sharedBy uuid.UUID, role string, encryptedItemKey []byte) error {
	res, err := r.execContext(ctx, `
		INSERT INTO item_members (item_id, user_id, role, encrypted_item_key, shared_by)
		SELECT $1::uuid, $2::uuid, $3::text, $4::bytea, $5::uuid
		WHERE EXISTS (SELECT 1 FROM user_keys WHERE user_id = $2)`,
		id, userID, role, encryptedItemKey, sharedBy,
	)
	if hasPgCode(err, pgUniqueViolation) {
		return apperr.New(apperr.KindConflict, "item is already shared with this user")
	}
	ok, err := affected(res, err)
	if err != nil {
		return err
	}
	if !ok {
		return apperr.New(apperr.KindNotFound, "user not found or has not set up a vault")
	}
	return nil
}

// SetMemberRole changes what a member the item was shared with may do. The
// owner's own row is never touched.
func (r *ItemRepository) SetMemberRole(ctx context.Context, id, userID uuid.UUID, role string) error {
	res, err := r.execContext(ctx, `
		UPDATE item_members SET role = $3, updated_at = now()
		WHERE item_id = $1 AND user_id = $2 AND role <> 'owner'`,
		id, userID, role,
	)
	if err != nil {
		return err
	}
	return requireAffected(res, "member")
}

// RemoveMember stops sharing an item with userID. The owner cannot be removed.
func (r *ItemRepository) RemoveMember(ctx context.Context, id, userID uuid.UUID) error {
	res, err := r.execContext(ctx, `
		DELETE FROM item_members
		WHERE item_id = $1 AND user_id = $2 AND role <> 'owner'`,
		id, userID,
	)
	if err != nil {
		return err
	}
	return requireAffected(res, "member")
}
