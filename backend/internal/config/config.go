package config

import "os"

type Config struct {
	DBPath string
	Port   string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = ":8080"
	}
	return &Config{
		DBPath: "backend.db",
		Port:   port,
	}
}
