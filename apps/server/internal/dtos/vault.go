package dtos

import (
	"math"

	"github.com/google/uuid"

	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/validator"
)

// Size limits in bytes, matching the CHECK constraints of migration 000004.
const (
	maxKDFSaltLen    = 64
	maxVaultKeyLen   = 512
	maxWrappedKeyLen = 1024
	maxPrivateKeyLen = 8192
	maxFolderNameLen = 1024
	maxItemDataLen   = 65536
)

// Bounds of the Argon2id parameters a client may store. The lower ones match
// the CHECK constraints; the upper ones only keep the values sane.
const (
	minKDFMemoryKiB   = 19456
	maxKDFMemoryKiB   = 4 * 1024 * 1024
	minKDFIterations  = 2
	maxKDFIterations  = 100
	minKDFParallelism = 1
	maxKDFParallelism = 64
)

const (
	itemTypePattern  = `^(login|secure_note|card|identity|contact)$`
	shareRolePattern = `^(editor|viewer)$`

	maxEmailLen = 254
	// maxItemMembers bounds the member list of one key rotation.
	maxItemMembers = 100

	defaultCipherVersion = 1
	maxCipherVersion     = math.MaxInt16
	maxRevision          = math.MaxInt32
	// The account password's limit (see authula.go).
	maxAccountPasswordLen = 128
)

// kdfRules declares the fields that describe how the master key is derived
// and the vault key it wraps; they always change together.
func kdfRules(v *validator.MapValidator) {
	v.Field("kdf_salt").Required().Base64(maxKDFSaltLen)
	v.Field("kdf_memory_kib").Required().Int(minKDFMemoryKiB, maxKDFMemoryKiB)
	v.Field("kdf_iterations").Required().Int(minKDFIterations, maxKDFIterations)
	v.Field("kdf_parallelism").Required().Int(minKDFParallelism, maxKDFParallelism)
	v.Field("encrypted_vault_key").Required().Base64(maxVaultKeyLen)
}

// KDFBody is the part of a key set that changes with the master password.
type KDFBody struct {
	KDFSalt           []byte `json:"kdf_salt"`
	KDFMemoryKiB      int    `json:"kdf_memory_kib"`
	KDFIterations     int    `json:"kdf_iterations"`
	KDFParallelism    int    `json:"kdf_parallelism"`
	EncryptedVaultKey []byte `json:"encrypted_vault_key"`
}

func (dto KDFBody) Validate(v *validator.MapValidator) {
	kdfRules(v)
}

// KDFUpdateBody changes the master password: the new KDF parameters and the
// vault key wrapped under them, with the account password. The server keeps
// one copy of the wrapped vault key, so an access token alone must not be
// enough to replace it and lose the vault for good.
type KDFUpdateBody struct {
	KDFBody
	Password string `json:"password"`
}

func (dto KDFUpdateBody) Validate(v *validator.MapValidator) {
	kdfRules(v)
	v.Field("password").Required().String().MaxLen(maxAccountPasswordLen)
}

// UserKeysBody creates a user's key set, once.
type UserKeysBody struct {
	KDFBody
	PublicKey           []byte `json:"public_key"`
	EncryptedPrivateKey []byte `json:"encrypted_private_key"`
}

func (dto UserKeysBody) Validate(v *validator.MapValidator) {
	kdfRules(v)
	v.Field("public_key").Required().Base64(maxWrappedKeyLen)
	v.Field("encrypted_private_key").Required().Base64(maxPrivateKeyLen)
}

// PublicKeyQuery looks up the user to share with.
type PublicKeyQuery struct {
	Email string `query:"email"`
}

func (dto PublicKeyQuery) Validate(v *validator.MapValidator) {
	v.Field("email").Required().String().MaxLen(maxEmailLen)
}

type FolderBody struct {
	EncryptedName []byte `json:"encrypted_name"`
}

func (dto FolderBody) Validate(v *validator.MapValidator) {
	v.Field("encrypted_name").Required().Base64(maxFolderNameLen)
}

// ItemListQuery filters a user's vault. Search and sort are not offered: the
// server cannot read what it stores.
type ItemListQuery struct {
	Offset   int    `query:"offset"`
	Limit    int    `query:"limit"`
	FolderID string `query:"folder_id"`
	Type     string `query:"type"`
	Trashed  bool   `query:"trashed"`
}

func (dto ItemListQuery) Validate(v *validator.MapValidator) {
	v.Field("offset").Regex(`^\d+$`)
	v.Field("limit").Regex(`^\d+$`)
	v.Field("folder_id").UUID()
	v.Field("type").Regex(itemTypePattern)
	v.Field("trashed").Regex(`^(true|false)$`)
}

// Clamp applies the shared pagination bounds.
func (dto *ItemListQuery) Clamp() {
	dto.Offset, dto.Limit = clampPage(dto.Offset, dto.Limit)
}

// ItemCreateBody creates an item; encrypted_item_key is the item key wrapped
// for the creator, who becomes the owner.
type ItemCreateBody struct {
	Type             string     `json:"type"`
	CipherVersion    int        `json:"cipher_version"`
	EncryptedData    []byte     `json:"encrypted_data"`
	EncryptedItemKey []byte     `json:"encrypted_item_key"`
	FolderID         *uuid.UUID `json:"folder_id"`
	Favorite         bool       `json:"favorite"`
}

func (dto ItemCreateBody) Validate(v *validator.MapValidator) {
	v.Field("type").Required().Regex(itemTypePattern)
	v.Field("cipher_version").Int(1, maxCipherVersion)
	v.Field("encrypted_data").Required().Base64(maxItemDataLen)
	v.Field("encrypted_item_key").Required().Base64(maxWrappedKeyLen)
	v.Field("folder_id").UUID()
	v.Field("favorite").Bool()
}

// ItemUpdateBody rewrites an item's content. Revision is the one the client
// read; a stale one is refused. Type and cipher_version keep their value when
// omitted.
type ItemUpdateBody struct {
	Type          string `json:"type"`
	CipherVersion int    `json:"cipher_version"`
	EncryptedData []byte `json:"encrypted_data"`
	Revision      int    `json:"revision"`
}

func (dto ItemUpdateBody) Validate(v *validator.MapValidator) {
	v.Field("type").Regex(itemTypePattern)
	v.Field("cipher_version").Int(1, maxCipherVersion)
	v.Field("encrypted_data").Required().Base64(maxItemDataLen)
	v.Field("revision").Required().Int(1, maxRevision)
}

// ItemPlacementBody is a member's own filing of an item; a null or absent
// folder_id unfiles it.
type ItemPlacementBody struct {
	FolderID *uuid.UUID `json:"folder_id"`
	Favorite bool       `json:"favorite"`
}

func (dto ItemPlacementBody) Validate(v *validator.MapValidator) {
	v.Field("folder_id").UUID()
	v.Field("favorite").Bool()
}

// ItemShareBody shares an item: the item key wrapped with the recipient's
// public key.
type ItemShareBody struct {
	UserID           uuid.UUID `json:"user_id"`
	Role             string    `json:"role"`
	EncryptedItemKey []byte    `json:"encrypted_item_key"`
}

func (dto ItemShareBody) Validate(v *validator.MapValidator) {
	v.Field("user_id").Required().UUID()
	v.Field("role").Required().Regex(shareRolePattern)
	v.Field("encrypted_item_key").Required().Base64(maxWrappedKeyLen)
}

type ItemMemberRoleBody struct {
	Role string `json:"role"`
}

func (dto ItemMemberRoleBody) Validate(v *validator.MapValidator) {
	v.Field("role").Required().Regex(shareRolePattern)
}

// ItemMemberKey is the new item key wrapped for one member.
type ItemMemberKey struct {
	UserID           uuid.UUID `json:"user_id"`
	EncryptedItemKey []byte    `json:"encrypted_item_key"`
}

// ItemRotateKeyBody re-encrypts an item under a new item key, after a member
// was removed: the new content and the new key wrapped for every member left.
type ItemRotateKeyBody struct {
	CipherVersion int             `json:"cipher_version"`
	EncryptedData []byte          `json:"encrypted_data"`
	Revision      int             `json:"revision"`
	MemberKeys    []ItemMemberKey `json:"member_keys"`
}

func (dto ItemRotateKeyBody) Validate(v *validator.MapValidator) {
	v.Field("cipher_version").Int(1, maxCipherVersion)
	v.Field("encrypted_data").Required().Base64(maxItemDataLen)
	v.Field("revision").Required().Int(1, maxRevision)
	v.Field("member_keys").Required()
}

// CheckMemberKeys validates the list the map validator cannot reach into.
func (dto ItemRotateKeyBody) CheckMemberKeys() error {
	if len(dto.MemberKeys) == 0 || len(dto.MemberKeys) > maxItemMembers {
		return apperr.New(apperr.KindBadRequest, "member_keys must hold 1 to %d entries", maxItemMembers)
	}
	for _, k := range dto.MemberKeys {
		if k.UserID == uuid.Nil || len(k.EncryptedItemKey) == 0 || len(k.EncryptedItemKey) > maxWrappedKeyLen {
			return apperr.New(apperr.KindBadRequest, "member_keys entries need a user_id and an encrypted_item_key of at most %d bytes", maxWrappedKeyLen)
		}
	}
	return nil
}

// CipherVersionOrDefault is the cipher version of a new item.
func CipherVersionOrDefault(version int) int {
	if version == 0 {
		return defaultCipherVersion
	}
	return version
}
