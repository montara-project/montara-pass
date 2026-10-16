package dtos

import "montara-pass/server/internal/lib/validator"

// listRules declares the rules of a paged list's query over the raw query
// map: offset and limit, a search term, and a "column:asc|desc" sort, which
// repositories resolve against a whitelist. Every parameter is optional, but
// when present it must be well formed.
func listRules(v *validator.MapValidator) {
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

// clampPage is the shared pagination bounds: a missing or zero limit falls
// back to 10, the limit never exceeds 100 and the offset is never negative.
func clampPage(offset, limit int) (int, int) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	return max(offset, 0), min(limit, maxListLimit)
}
