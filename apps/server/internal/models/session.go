package models

import (
	"time"

	"github.com/google/uuid"
)

// Session is a device signed in to the account: one of the user's live
// Authula sessions. The token is never read out.
type Session struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	// When the session was last renewed: roughly, last active.
	UpdatedAt time.Time `json:"updated_at"`
	ExpiresAt time.Time `json:"expires_at"`
	IP        *string   `json:"ip"`
	UserAgent *string   `json:"user_agent"`
	// Whether it is the session the request was made with.
	Current bool `json:"current"`
}
