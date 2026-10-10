package handlers

import (
	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/repositories"
)

// folderHandler serves the caller's own folders.
type folderHandler struct {
	app *app.Application
}

func (h *folderHandler) repo() *repositories.FolderRepository {
	return &h.app.Repositories.Folder
}

func (h *folderHandler) List(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	folders, err := h.repo().List(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.List(c, folders, dtos.Metadata{"total": len(folders)})
}

func (h *folderHandler) Create(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}

	var body dtos.FolderBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	folder, err := h.repo().Insert(c.Context(), uid, body.EncryptedName)
	if err != nil {
		return err
	}
	return dtos.Created(c, folder, "folder created")
}

func (h *folderHandler) Update(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	id, err := pathID(c, "folder")
	if err != nil {
		return err
	}

	var body dtos.FolderBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}

	folder, err := h.repo().Update(c.Context(), id, uid, body.EncryptedName)
	if err != nil {
		return err
	}
	return dtos.OK(c, folder)
}

// Delete removes a folder; its items stay in the vault, unfiled.
func (h *folderHandler) Delete(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	id, err := pathID(c, "folder")
	if err != nil {
		return err
	}

	if err := h.repo().Delete(c.Context(), id, uid); err != nil {
		return err
	}
	return dtos.Message(c, fiber.StatusOK, "folder deleted")
}
