package dtos

import "montara-pass/server/internal/lib/validator"

// ListQuery is the shared pagination binding for list endpoints.
// Offset starts at 0; limit is clamped to 100. Sorted is a
// "column:asc|desc" pair (e.g. "name:asc"); repositories resolve the column
// against a whitelist.
type ListQuery struct {
	Offset int    `query:"offset"`
	Limit  int    `query:"limit"`
	Search string `query:"search"`
	Sorted string `query:"sorted"`
}

// Validate declares rules over the raw query map: every parameter is a
// string and optional, but when present it must be well formed.
func (dto ListQuery) Validate(v *validator.MapValidator) {
	dto.base(v)
}

// base declares the shared pagination/search rules. Query DTOs that embed
// ListQuery call it so their own fields extend the same validator.
func (dto ListQuery) base(v *validator.MapValidator) {
	v.Field("offset").Regex(`^\d+$`)
	v.Field("limit").Regex(`^\d+$`)
	v.Field("search").String().MaxLen(maxSearchLen)
	v.Field("sorted").Regex(`^[a-z_]+:(asc|desc)$`)
}

const (
	defaultListLimit = 10
	maxListLimit     = 100
	// maxSearchLen bounds the ILIKE term a public list endpoint will run.
	maxSearchLen = 100
)

// Clamp normalizes pagination values (see clampPage).
func (dto *ListQuery) Clamp() {
	dto.Offset, dto.Limit = clampPage(dto.Offset, dto.Limit)
}

// clampPage is the shared pagination bounds: a missing or zero limit falls
// back to 10, the limit never exceeds 100 and the offset is never negative.
func clampPage(offset, limit int) (int, int) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	return max(offset, 0), min(limit, maxListLimit)
}
