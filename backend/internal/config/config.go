package config

import (
	"os"
)

type Config struct {
	DBPath         string
	TursoURL       string
	TursoAuthToken string
	Port           string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = ":8080"
	} else if port[0] != ':' {
		port = ":" + port
	}

	tursoURL := os.Getenv("TURSO_DATABASE_URL")
	tursoToken := os.Getenv("TURSO_AUTH_TOKEN")
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "backend.db"
	}

	return &Config{
		DBPath:         dbPath,
		TursoURL:       tursoURL,
		TursoAuthToken: tursoToken,
		Port:           port,
	}
}
