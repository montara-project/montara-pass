package lib

import "time"

// IPKV is the small key-value contract an IP block lives in: a get, a set
// with a lifetime, a delete. IPBlock counts and blocks under it, a super
// user's manual block writes it, and a boot restores it from the database.
// The application holds one so every writer reaches the same keys; passkey
// ceremonies are held in it too.
type IPKV interface {
	Get(key string) ([]byte, error)
	Set(key string, val []byte, exp time.Duration) error
	Delete(key string) error
	// Take reads a key and deletes it in one step, so of two callers racing
	// for it only one gets the value. nil when there is none.
	Take(key string) ([]byte, error)
}
