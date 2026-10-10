package app

import (
	"database/sql"
	"log/slog"

	authula "github.com/Authula/authula"

	"montara-pass/server/internal/config"
	"montara-pass/server/internal/repositories"
)

type Application struct {
	Config       config.Config
	Logger       *slog.Logger
	DB           *sql.DB
	Repositories repositories.Repositories
	Auth         *authula.Auth
}
