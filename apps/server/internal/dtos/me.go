package dtos

import "montara-pass/server/internal/lib/validator"

// TimeZoneBody picks the IANA zone the clock shows, in the web app and the
// extension alike. The handler checks the name against the zone database.
type TimeZoneBody struct {
	TimeZone string `json:"time_zone"`
}

func (dto TimeZoneBody) Validate(v *validator.MapValidator) {
	v.Field("time_zone").Required().String().MaxLen(64)
}
