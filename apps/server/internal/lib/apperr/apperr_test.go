package apperr

import (
	"errors"
	"fmt"
	"testing"
)

func TestIsMatchesKind(t *testing.T) {
	notFound := New(KindNotFound, "record not found in users")
	if !errors.Is(notFound, ErrNotFound) || !errors.Is(fmt.Errorf("wrapped: %w", notFound), ErrNotFound) {
		t.Fatal("a not-found error does not match ErrNotFound")
	}
	if errors.Is(notFound, ErrForbidden) {
		t.Fatal("a not-found error matches ErrForbidden")
	}
}
