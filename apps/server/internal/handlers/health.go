package handlers

import (
	"github.com/gofiber/fiber/v3"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
)

type healthHandler struct {
	app *app.Application
}

// Check pings the database, so the probe fails when the API cannot serve.
// The endpoint is public, so it reports only the status and the version.
func (h *healthHandler) Check(c fiber.Ctx) error {
	if err := h.app.DB.PingContext(c.Context()); err != nil {
		h.app.Logger.Error("health check: database unreachable", "error", err)
		return dtos.Response(c, fiber.StatusServiceUnavailable, fiber.Map{"status": "unavailable"}, nil, "")
	}
	return dtos.OK(c, fiber.Map{"status": "ok", "version": app.Version})
}
