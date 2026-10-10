package middlewares

import "github.com/montara-projects/montara-pass/apps/server/internal/app"

type Middlewares struct {
	app *app.Application
}

func New(app *app.Application) *Middlewares {
	return &Middlewares{app: app}
}
