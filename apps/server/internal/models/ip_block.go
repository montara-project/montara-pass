package models

import (
	"time"
)

// IP blocks (see migrations/000008): which client IPs are shut out of the
// API, automatically after repeated failures or by a super user's hand. The
// check itself reads the key-value store; a row here is the record, and what
// a boot restores the store from.

// Where a block came from, as stored in ip_blocks.source.
const (
	IPBlockAuto   = "auto"
	IPBlockManual = "manual"
)

// The life of a block, as stored in ip_blocks.status.
const (
	IPBlockActive  = "active"
	IPBlockLifted  = "lifted"
	IPBlockExpired = "expired"
)

type IPBlock struct {
	Base
	IP     string  `db:"ip" json:"ip"`
	Source string  `db:"source" json:"source"`
	Reason *string `db:"reason" json:"reason"`
	Status string  `db:"status" json:"status"`
	// When the block ends; NULL for a manual block that never ends.
	BlockedUntil *time.Time `db:"blocked_until" json:"blocked_until"`
	LiftedAt     *time.Time `db:"lifted_at" json:"lifted_at"`
}
