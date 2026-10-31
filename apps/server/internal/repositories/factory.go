package repositories

import "database/sql"

type Repositories struct {
	Billing BillingRepository
	Folder  FolderRepository
	IPBlock IPBlockRepository
	Item    ItemRepository
	User    UserRepository
	UserKey UserKeyRepository
}

// New builds every repository over db.
func New(db *sql.DB) Repositories {
	base := BaseRepository{DB: db}

	return Repositories{
		Billing: BillingRepository{base},
		Folder:  FolderRepository{base},
		IPBlock: IPBlockRepository{base},
		Item:    ItemRepository{base},
		User:    UserRepository{base},
		UserKey: UserKeyRepository{base},
	}
}
