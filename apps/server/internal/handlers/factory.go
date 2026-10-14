package handlers

import "montara-pass/server/internal/app"

type Handlers struct {
	Billing  *billingHandler
	Health   *healthHandler
	Category *categoryHandler
	Folder   *folderHandler
	Item     *itemHandler
	Key      *keyHandler
}

func New(app *app.Application) *Handlers {
	return &Handlers{
		Billing:  &billingHandler{app: app},
		Health:   &healthHandler{app: app},
		Category: &categoryHandler{app: app},
		Folder:   &folderHandler{app: app},
		Item:     &itemHandler{app: app},
		Key:      &keyHandler{app: app},
	}
}
