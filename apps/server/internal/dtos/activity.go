package dtos

import (
	"montara-pass/server/internal/lib/validator"
)

// ActivityListQuery pages the signed-in user's activity log, newest first.
type ActivityListQuery struct {
	Offset int `query:"offset"`
	Limit  int `query:"limit"`
}

func (dto ActivityListQuery) Validate(v *validator.MapValidator) {
	listRules(v)
}

// Clamp applies the shared pagination bounds.
func (dto *ActivityListQuery) Clamp() {
	dto.Offset, dto.Limit = clampPage(dto.Offset, dto.Limit)
}
