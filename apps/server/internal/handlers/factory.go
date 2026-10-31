package handlers

import "montara-pass/server/internal/app"

type Handlers struct {
	Billing *billingHandler
	Health  *healthHandler
	Folder  *folderHandler
	IPBlock *ipBlockHandler
	Item    *itemHandler
	Key     *keyHandler
	Me      *meHandler
}

func New(app *app.Application) *Handlers {
	return &Handlers{
		Billing: &billingHandler{app: app},
		Health:  &healthHandler{app: app},
		Folder:  &folderHandler{app: app},
		IPBlock: &ipBlockHandler{app: app},
		Item:    &itemHandler{app: app},
		Key:     &keyHandler{app: app},
		Me:      &meHandler{app: app},
	}
}
