package handlers

import "github.com/montara-projects/montara-pass/apps/server/internal/app"

type Handlers struct {
	Health   *healthHandler
	Category *categoryHandler
}

func New(app *app.Application) *Handlers {
	return &Handlers{
		Health:   &healthHandler{app: app},
		Category: &categoryHandler{app: app},
	}
}
