package handlers

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/lib/constant"
	"montara-pass/server/internal/models"
	"montara-pass/server/internal/repositories"
)

// itemHandler serves vault items and their sharing. An item the caller is
// not a member of answers 404, as if it did not exist.
type itemHandler struct {
	app *app.Application
}

func (h *itemHandler) repo() *repositories.ItemRepository {
	return &h.app.Repositories.Item
}

// member loads the :id item as the caller sees it, which proves membership.
func (h *itemHandler) member(c fiber.Ctx) (models.Item, uuid.UUID, error) {
	uid, err := currentUser(c)
	if err != nil {
		return models.Item{}, uuid.Nil, err
	}
	id, err := pathID(c, "item")
	if err != nil {
		return models.Item{}, uuid.Nil, err
	}

	item, err := h.repo().Get(c.Context(), id, uid)
	return item, uid, err
}

// owner is member for the routes only the item's owner may call.
func (h *itemHandler) owner(c fiber.Ctx) (models.Item, uuid.UUID, error) {
	item, uid, err := h.member(c)
	if err != nil {
		return item, uid, err
	}
	if item.Role != constant.ItemRoleOwner {
		return item, uid, apperr.New(apperr.KindForbidden, "only the owner of the item can do this")
	}
	return item, uid, nil
}

func (h *itemHandler) List(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	var q dtos.ItemListQuery
	if err := lib.ValidateRequestQuery(c, &q); err != nil {
		return err
	}
	q.Clamp()

	params := repositories.ItemListParams{UserID: uid, Offset: q.Offset, Limit: q.Limit, Type: q.Type, Trashed: q.Trashed}
	if q.FolderID != "" {
		// Validated as a UUID above.
		folderID := uuid.MustParse(q.FolderID)
		params.FolderID = &folderID
	}

	items, err := h.repo().List(c.Context(), params)
	if err != nil {
		return err
	}
	total, err := h.repo().Count(c.Context(), params)
	if err != nil {
		return err
	}
	return dtos.List(c, items, dtos.ListMeta(int(total), q.Offset, q.Limit))
}

func (h *itemHandler) Get(c fiber.Ctx) error {
	item, _, err := h.member(c)
	if err != nil {
		return err
	}
	return dtos.OK(c, item)
}

func (h *itemHandler) Create(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	var body dtos.ItemCreateBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	item := models.Item{
		OwnerID:          uid,
		Type:             body.Type,
		CipherVersion:    dtos.CipherVersionOrDefault(body.CipherVersion),
		EncryptedData:    body.EncryptedData,
		EncryptedItemKey: body.EncryptedItemKey,
		FolderID:         body.FolderID,
		Favorite:         body.Favorite,
	}
	if item.ID, err = uuid.NewV7(); err != nil {
		return err
	}

	if err := h.repo().Insert(c.Context(), item); err != nil {
		return err
	}

	// Re-read so the response carries the DB-set timestamps.
	item, err = h.repo().Get(c.Context(), item.ID, uid)
	if err != nil {
		return err
	}
	return dtos.Created(c, item, "item created")
}

// Update rewrites the content of an item; the owner and editors may.
func (h *itemHandler) Update(c fiber.Ctx) error {
	item, uid, err := h.member(c)
	if err != nil {
		return err
	}
	if item.Role == constant.ItemRoleViewer {
		return apperr.New(apperr.KindForbidden, "viewers cannot change the item")
	}

	var body dtos.ItemUpdateBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	update := models.Item{
		Type:          body.Type,
		CipherVersion: body.CipherVersion,
		EncryptedData: body.EncryptedData,
		Revision:      body.Revision,
	}
	update.ID = item.ID
	if err := h.repo().Update(c.Context(), update, uid); err != nil {
		return err
	}

	item, err = h.repo().Get(c.Context(), item.ID, uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, item)
}

// RotateKey re-encrypts the item under a new key for the members that are
// left. Clients call it after removing a member.
func (h *itemHandler) RotateKey(c fiber.Ctx) error {
	item, uid, err := h.owner(c)
	if err != nil {
		return err
	}

	var body dtos.ItemRotateKeyBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}
	if err := body.CheckMemberKeys(); err != nil {
		return err
	}

	keys := make(map[uuid.UUID][]byte, len(body.MemberKeys))
	for _, k := range body.MemberKeys {
		keys[k.UserID] = k.EncryptedItemKey
	}

	update := models.Item{
		OwnerID:       uid,
		CipherVersion: body.CipherVersion,
		EncryptedData: body.EncryptedData,
		Revision:      body.Revision,
	}
	update.ID = item.ID
	if err := h.repo().RotateKey(c.Context(), update, keys); err != nil {
		return err
	}

	item, err = h.repo().Get(c.Context(), item.ID, uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, item)
}

// SetPlacement files the item in one of the caller's folders and sets their
// favorite flag; other members' views are not affected.
func (h *itemHandler) SetPlacement(c fiber.Ctx) error {
	item, uid, err := h.member(c)
	if err != nil {
		return err
	}

	var body dtos.ItemPlacementBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	if err := h.repo().SetPlacement(c.Context(), item.ID, uid, body.FolderID, body.Favorite); err != nil {
		return err
	}

	item, err = h.repo().Get(c.Context(), item.ID, uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, item)
}

// MarkUsed records that the caller filled the item into a page just now;
// other members' views are not affected.
func (h *itemHandler) MarkUsed(c fiber.Ctx) error {
	item, uid, err := h.member(c)
	if err != nil {
		return err
	}

	if err := h.repo().MarkUsed(c.Context(), item.ID, uid); err != nil {
		return err
	}

	item, err = h.repo().Get(c.Context(), item.ID, uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, item)
}

// Delete moves the item to the owner's trash, hiding it from every member.
func (h *itemHandler) Delete(c fiber.Ctx) error {
	return h.ownerWrite(c, h.repo().Trash, "item moved to trash")
}

func (h *itemHandler) Restore(c fiber.Ctx) error {
	return h.ownerWrite(c, h.repo().Restore, "item restored")
}

func (h *itemHandler) DeletePermanently(c fiber.Ctx) error {
	return h.ownerWrite(c, h.repo().ForceDelete, "item permanently deleted")
}

func (h *itemHandler) ownerWrite(c fiber.Ctx, fn func(context.Context, uuid.UUID, uuid.UUID) error, message string) error {
	item, uid, err := h.owner(c)
	if err != nil {
		return err
	}
	if err := fn(c.Context(), item.ID, uid); err != nil {
		return err
	}
	return dtos.Message(c, fiber.StatusOK, message)
}

// Members lists who the item is shared with; any member may look.
func (h *itemHandler) Members(c fiber.Ctx) error {
	item, _, err := h.member(c)
	if err != nil {
		return err
	}

	members, err := h.repo().ListMembers(c.Context(), item.ID)
	if err != nil {
		return err
	}
	return dtos.List(c, members, dtos.Metadata{"total": len(members)})
}

// errNoPaidPlan refuses handing an item on, naming the problem and the way
// out.
var errNoPaidPlan = apperr.New(apperr.KindForbidden, "sharing an item needs a paid plan: subscribe in Billing, or run Montara Pass yourself")

// requirePaidPlan refuses a share by a caller who holds no plan.
//
// It only bites where the operator asked for it (REQUIRE_PAID_SHARING), which
// boot allows only alongside Lemon Squeezy, so a missing payment key never
// turns the gate off unnoticed. A super user is skipped too: billing is kept to
// accounts with the 'user' role (see migrations/cloud/000001), so a plan is not
// theirs to hold, and a gate they could not satisfy would leave the operator
// of a deployment unable to share at all.
func (h *itemHandler) requirePaidPlan(c fiber.Ctx, uid uuid.UUID) error {
	if !h.app.Config.Billing.RequirePaidSharing {
		return nil
	}

	role, err := h.app.Repositories.User.Role(c.Context(), uid)
	if err != nil {
		return err
	}
	if role != constant.RoleUser {
		return nil
	}

	paid, err := h.app.Repositories.Billing.HasPaidPlan(c.Context(), uid)
	if err != nil {
		return err
	}
	if !paid {
		return errNoPaidPlan
	}
	return nil
}

// Share gives another user access. The body carries the item key wrapped
// with that user's public key (see keyHandler.PublicKey).
//
// Handing an item on is the one thing a plan pays for. Being a recipient of
// someone else's item is not, so only this route is gated: SetMemberRole and
// RemoveMember keep working for an owner and a member without one, who could
// otherwise not leave an item or tidy it. Nothing is gated unless the
// deployment asks for it (see h.requirePaidPlan).
func (h *itemHandler) Share(c fiber.Ctx) error {
	item, uid, err := h.owner(c)
	if err != nil {
		return err
	}

	var body dtos.ItemShareBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	if err := h.requirePaidPlan(c, uid); err != nil {
		return err
	}

	if err := h.repo().AddMember(c.Context(), item.ID, body.UserID, uid, body.Role, body.EncryptedItemKey); err != nil {
		return err
	}
	return dtos.Message(c, fiber.StatusCreated, "item shared")
}

func (h *itemHandler) SetMemberRole(c fiber.Ctx) error {
	item, _, err := h.owner(c)
	if err != nil {
		return err
	}
	memberID, err := memberParam(c)
	if err != nil {
		return err
	}

	var body dtos.ItemMemberRoleBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	if err := h.repo().SetMemberRole(c.Context(), item.ID, memberID, body.Role); err != nil {
		return err
	}
	return dtos.Message(c, fiber.StatusOK, "member role updated")
}

// RemoveMember stops sharing with a user: the owner may remove anyone but
// themselves, and a member may remove themselves to leave the item. The
// removed user may still hold the old item key, so the owner's client should
// follow up with RotateKey.
func (h *itemHandler) RemoveMember(c fiber.Ctx) error {
	item, uid, err := h.member(c)
	if err != nil {
		return err
	}
	memberID, err := memberParam(c)
	if err != nil {
		return err
	}
	if item.Role != constant.ItemRoleOwner && memberID != uid {
		return apperr.New(apperr.KindForbidden, "only the owner can remove other members")
	}
	if memberID == item.OwnerID {
		return apperr.New(apperr.KindBadRequest, "the owner cannot be removed; delete the item instead")
	}

	if err := h.repo().RemoveMember(c.Context(), item.ID, memberID); err != nil {
		return err
	}
	return dtos.Message(c, fiber.StatusOK, "member removed")
}

func memberParam(c fiber.Ctx) (uuid.UUID, error) {
	id, err := uuid.Parse(c.Params("userId"))
	if err != nil {
		return uuid.Nil, apperr.New(apperr.KindBadRequest, "invalid user id")
	}
	return id, nil
}
