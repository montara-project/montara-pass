package handlers

import (
	"net"
	"slices"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"montara-pass/server/internal/app"
	"montara-pass/server/internal/dtos"
	"montara-pass/server/internal/lib"
	"montara-pass/server/internal/lib/apperr"
	"montara-pass/server/internal/middlewares"
	"montara-pass/server/internal/models"
	"montara-pass/server/internal/repositories"
)

// ipBlockHandler is the super user's view of the API's blocked IPs: what the
// auto-block did, and what was blocked by hand. Blocking is enforced by the
// IPBlock middleware on the key-value store; these handlers keep the record
// in step with it, and the boot restores the store from it.
type ipBlockHandler struct {
	app *app.Application
}

func (h *ipBlockHandler) repo() *repositories.IPBlockRepository {
	return &h.app.Repositories.IPBlock
}

// List answers one page of the blocks, oldest failures first no longer: the
// newest first, searchable, of one status or every one. Blocks whose time is
// over are marked expired before the list is read.
func (h *ipBlockHandler) List(c fiber.Ctx) error {
	var q dtos.IPBlockListQuery
	if err := lib.ValidateRequestQuery(c, &q); err != nil {
		return err
	}
	q.Clamp()

	if err := h.repo().ExpireStale(c.Context()); err != nil {
		return err
	}
	blocks, err := h.repo().List(c.Context(), repositories.ListParams{Offset: q.Offset, Limit: q.Limit, Search: q.Search, Sorted: q.Sorted}, q.Status)
	if err != nil {
		return err
	}
	total, err := h.repo().Count(c.Context(), repositories.ListParams{Search: q.Search}, q.Status)
	if err != nil {
		return err
	}
	return dtos.List(c, blocks, dtos.ListMeta(int(total), q.Offset, q.Limit))
}

// The durations a manual block may be asked for, in the order the UI offers
// them. never is the empty end: a block that does not run out.
var ipBlockDurations = map[string]time.Duration{
	"1h":    time.Hour,
	"24h":   24 * time.Hour,
	"7d":    7 * 24 * time.Hour,
	"never": 0, // no end
}

// Create blocks an IP by hand, for the duration its body names, and writes
// the key the IPBlock middleware answers 429 on, so it takes hold at once —
// not just after the next boot restores the store from the database. A block
// the store refuses is still recorded: the next boot enforces it.
func (h *ipBlockHandler) Create(c fiber.Ctx) error {
	var body dtos.IPBlockCreateBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}
	parsed := net.ParseIP(body.IP)
	if parsed == nil {
		return apperr.New(apperr.KindBadRequest, "ip must be a valid IP address")
	}
	// Spelled as the middleware sees a client's address (c.IP()), so one
	// IPv6 address written two ways is one block.
	ip := parsed.String()
	// The middleware never blocks an exempt address: a block recorded for one
	// would be listed as active and do nothing.
	exempt := strings.Split(h.app.Config.App.RateLimitExemptIPs, ",")
	if slices.ContainsFunc(exempt, func(e string) bool { return strings.TrimSpace(e) == ip }) {
		return apperr.New(apperr.KindBadRequest, "%s is exempt from blocking (RATE_LIMIT_EXEMPT_IPS)", ip)
	}

	var until *time.Time
	if d := ipBlockDurations[body.Duration]; d > 0 {
		t := time.Now().Add(d)
		until = &t
	}

	b, err := h.repo().Create(c.Context(), ip, models.IPBlockManual, body.Reason, until)
	if err != nil {
		return err
	}
	if err := middlewares.BlockIP(h.app.IPKV, b.IP, orZero(b.BlockedUntil)); err != nil {
		h.app.Logger.Warn("store ip block: enforced from the next boot", "ip", b.IP, "error", err)
	}
	h.app.Logger.Info("ip blocked by hand", "ip", b.IP, "until", b.BlockedUntil, "by", currentUserID(c))
	return dtos.Created(c, b, "ip blocked")
}

// Destroy lifts a block early: its key is deleted, so the IP is let through
// at once, then the record is marked. A key the store would not delete leaves
// the record active, as the block still is.
func (h *ipBlockHandler) Destroy(c fiber.Ctx) error {
	id, err := pathID(c, "ip block")
	if err != nil {
		return err
	}
	b, err := h.repo().Get(c.Context(), id)
	if err != nil {
		return err
	}
	if b.Status == models.IPBlockActive {
		if err := middlewares.UnblockIP(h.app.IPKV, b.IP); err != nil {
			return err
		}
	}
	b, changed, err := h.repo().Lift(c.Context(), id)
	if err != nil {
		return err
	}
	if changed {
		h.app.Logger.Info("ip block lifted by hand", "ip", b.IP, "by", currentUserID(c))
	}
	return dtos.OK(c, b)
}

// orZero reads a block's end as the zero time it is stored as: no end.
func orZero(t *time.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return *t
}

// currentUserID is currentUser for a log line, where the error is not worth
// reporting: the Authorization middleware has already refused an unsigned
// request.
func currentUserID(c fiber.Ctx) uuid.UUID {
	uid, _ := currentUser(c)
	return uid
}

// meHandler answers the little things about the signed-in user that only our
// mirror knows, which Authula's own /me does not serve.
type meHandler struct {
	app *app.Application
}

// Role answers the signed-in user's role, so the web app can keep its
// super-user pages to them and hide their nav.
func (h *meHandler) Role(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	role, err := h.app.Repositories.User.Role(c.Context(), uid)
	if err != nil {
		return err
	}
	return dtos.OK(c, fiber.Map{"role": role})
}

// SetTimeZone saves the IANA zone the signed-in user picked for the clock,
// which GET /me answers as time_zone so the web app and the extension agree.
func (h *meHandler) SetTimeZone(c fiber.Ctx) error {
	uid, err := currentUser(c)
	if err != nil {
		return err
	}
	var body dtos.TimeZoneBody
	if err := lib.ValidateRequestBody(c, &body); err != nil {
		return err
	}
	// LoadLocation also takes "" and "Local", which name no zone a browser knows.
	if _, err := time.LoadLocation(body.TimeZone); err != nil || body.TimeZone == "Local" {
		return apperr.New(apperr.KindBadRequest, "unknown time zone %q", body.TimeZone)
	}
	if err := h.app.Repositories.User.SetTimeZone(c.Context(), uid, body.TimeZone); err != nil {
		return err
	}
	return dtos.OK(c, fiber.Map{"time_zone": body.TimeZone})
}
