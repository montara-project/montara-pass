package app

import (
	"database/sql"
	"log/slog"

	authula "github.com/Authula/authula"

	"montara-pass/server/internal/config"
	"montara-pass/server/internal/repositories"
)

// Version is the release the binary was built from. The Docker build sets it
// with -ldflags from the git tag; anything else reports "dev".
var Version = "dev"

type Application struct {
	Config       config.Config
	Logger       *slog.Logger
	DB           *sql.DB
	Repositories repositories.Repositories
	Auth         *authula.Auth
}
