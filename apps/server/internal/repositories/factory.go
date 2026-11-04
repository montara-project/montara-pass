package repositories

import "database/sql"

type Repositories struct {
	Activity ActivityRepository
	Billing  BillingRepository
	Folder   FolderRepository
	IPBlock  IPBlockRepository
	Item     ItemRepository
	Passkey  PasskeyRepository
	Session  SessionRepository
	User     UserRepository
	UserKey  UserKeyRepository
}

// New builds every repository over db.
func New(db *sql.DB) Repositories {
	base := BaseRepository{DB: db}

	return Repositories{
		Activity: ActivityRepository{base},
		Billing:  BillingRepository{base},
		Folder:   FolderRepository{base},
		IPBlock:  IPBlockRepository{base},
		Item:     ItemRepository{base},
		Passkey:  PasskeyRepository{base},
		Session:  SessionRepository{base},
		User:     UserRepository{base},
		UserKey:  UserKeyRepository{base},
	}
}
