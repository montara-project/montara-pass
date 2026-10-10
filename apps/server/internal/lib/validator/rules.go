package validator

import (
	"encoding/base64"
	"fmt"
	"math"
	"regexp"
	"unicode/utf8"

	"github.com/google/uuid"
)

// rule reports a failure message; ok=false means validation failed. data
// always comes from JSON decoding, so it is never a pointer.
type rule func(key string, data interface{}) (string, bool)

func (v *FieldValidator) Required() *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if data == nil || data == "" {
			return fmt.Sprintf("%s is required", key), false
		}
		return "", true
	})
	return v
}

func (v *FieldValidator) String() *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if _, ok := data.(string); data != nil && !ok {
			return fmt.Sprintf("%s must be a string", key), false
		}
		return "", true
	})
	return v
}

// MaxLen reports a failure when the value is a string longer than n
// characters.
func (v *FieldValidator) MaxLen(n int) *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if s, ok := data.(string); ok && utf8.RuneCountInString(s) > n {
			return fmt.Sprintf("%s must be at most %d characters", key, n), false
		}
		return "", true
	})
	return v
}

func (v *FieldValidator) Regex(pattern string) *FieldValidator {
	re := regexp.MustCompile(pattern)
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if data == nil {
			return "", true
		}
		if s, ok := data.(string); !ok || !re.MatchString(s) {
			return fmt.Sprintf("%s must match the pattern %s", key, re), false
		}
		return "", true
	})
	return v
}

// Int reports a failure unless the value is a whole number between min and
// max. JSON numbers decode as float64.
func (v *FieldValidator) Int(min, max int) *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if data == nil {
			return "", true
		}
		n, ok := data.(float64)
		if !ok || n != math.Trunc(n) || n < float64(min) || n > float64(max) {
			return fmt.Sprintf("%s must be an integer between %d and %d", key, min, max), false
		}
		return "", true
	})
	return v
}

func (v *FieldValidator) Bool() *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if _, ok := data.(bool); data != nil && !ok {
			return fmt.Sprintf("%s must be a boolean", key), false
		}
		return "", true
	})
	return v
}

func (v *FieldValidator) UUID() *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if data == nil {
			return "", true
		}
		s, ok := data.(string)
		if !ok || uuid.Validate(s) != nil {
			return fmt.Sprintf("%s must be a UUID", key), false
		}
		return "", true
	})
	return v
}

// Base64 reports a failure unless the value is standard base64 that decodes
// to between 1 and maxBytes bytes, the encoding a []byte field binds from.
func (v *FieldValidator) Base64(maxBytes int) *FieldValidator {
	v.registerRule(func(key string, data interface{}) (string, bool) {
		if data == nil {
			return "", true
		}
		s, ok := data.(string)
		if !ok {
			return fmt.Sprintf("%s must be base64", key), false
		}
		raw, err := base64.StdEncoding.DecodeString(s)
		if err != nil || len(raw) == 0 {
			return fmt.Sprintf("%s must be base64", key), false
		}
		if len(raw) > maxBytes {
			return fmt.Sprintf("%s must be at most %d bytes", key, maxBytes), false
		}
		return "", true
	})
	return v
}
