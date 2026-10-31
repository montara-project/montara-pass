package dtos

import (
	"montara-pass/server/internal/lib/validator"
)

// IPBlockListQuery pages the super user's list of blocked IPs. Search matches
// the IP and the reason; status is one of a block's, empty for every one.
type IPBlockListQuery struct {
	Offset int    `query:"offset"`
	Limit  int    `query:"limit"`
	Search string `query:"search"`
	Sorted string `query:"sorted"`
	Status string `query:"status"`
}

func (dto IPBlockListQuery) Validate(v *validator.MapValidator) {
	listRules(v)
	v.Field("status").Regex(`^(active|lifted|expired)$`)
}

// Clamp applies the shared pagination bounds.
func (dto *IPBlockListQuery) Clamp() {
	dto.Offset, dto.Limit = clampPage(dto.Offset, dto.Limit)
}

// The durations a manual block may be asked for, as its body names them.
const (
	blockForHour  = "1h"
	blockForDay   = "24h"
	blockForWeek  = "7d"
	blockForNever = "never"
)

// IPBlockCreateBody asks for an IP to be blocked: for an hour, a day, a week,
// or for good. The handler reads the address itself, so the IP's shape is
// checked with net.ParseIP there, not with a regex here.
type IPBlockCreateBody struct {
	IP       string `json:"ip"`
	Reason   string `json:"reason"`
	Duration string `json:"duration"`
}

func (dto IPBlockCreateBody) Validate(v *validator.MapValidator) {
	v.Field("ip").Required().String().MaxLen(45)
	v.Field("reason").String().MaxLen(500)
	v.Field("duration").Regex(`^(1h|24h|7d|never)$`)
}
