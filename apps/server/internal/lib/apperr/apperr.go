package apperr

import (
	"errors"
	"fmt"
	"net/http"
)

// Kind is the class of an application error: the HTTP status it answers with.
type Kind int

const (
	KindBadRequest      Kind = http.StatusBadRequest
	KindUnauthorized    Kind = http.StatusUnauthorized
	KindForbidden       Kind = http.StatusForbidden
	KindNotFound        Kind = http.StatusNotFound
	KindConflict        Kind = http.StatusConflict
	KindTooManyRequests Kind = http.StatusTooManyRequests
	KindInternal        Kind = http.StatusInternalServerError
	// An upstream service, such as the payment provider, failed or is not
	// configured.
	KindBadGateway         Kind = http.StatusBadGateway
	KindServiceUnavailable Kind = http.StatusServiceUnavailable
)

// Error is a typed application error. Wrap sentinel errors (ErrNotFound, …)
// with fmt.Errorf("%w: detail", ErrNotFound) and use From to recover the kind.
type Error struct {
	Kind    Kind
	Message string
}

func (e *Error) Error() string { return e.Message }

// Is matches any error of the same kind, so errors.Is(err, ErrNotFound)
// holds for New(KindNotFound, "…") too, not only for the sentinel itself.
func (e *Error) Is(target error) bool {
	t, ok := target.(*Error)
	return ok && t.Kind == e.Kind
}

// Sentinels cover the common cases so services can return them directly.
var (
	ErrUnauthorized    = &Error{Kind: KindUnauthorized, Message: "unauthorized"}
	ErrForbidden       = &Error{Kind: KindForbidden, Message: "forbidden"}
	ErrNotFound        = &Error{Kind: KindNotFound, Message: "resource not found"}
	ErrTooManyRequests = &Error{Kind: KindTooManyRequests, Message: "too many requests"}
	ErrInternal        = &Error{Kind: KindInternal, Message: "internal server error"}
)

// New builds a typed error with a custom message.
func New(kind Kind, format string, args ...any) *Error {
	return &Error{Kind: kind, Message: fmt.Sprintf(format, args...)}
}

// Status returns the HTTP status code for the error.
func (e *Error) Status() int { return int(e.Kind) }

// From resolves an arbitrary error into (status, message). A wrapped *Error
// keeps its kind and message; anything else degrades to 500 with a generic
// message so internals never leak to clients.
func From(err error) (int, string) {
	if err == nil {
		return http.StatusOK, ""
	}

	var ae *Error
	if errors.As(err, &ae) {
		return ae.Status(), ae.Message
	}

	return ErrInternal.Status(), ErrInternal.Message
}
