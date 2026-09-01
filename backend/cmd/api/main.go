package main

import (
	"log"
	"net/http"

	"backend/internal/config"
	"backend/internal/handlers"
	"backend/internal/repository"
	"backend/internal/router"
)

func main() {
	cfg := config.Load()

	repo, err := repository.NewRepository(cfg.DBPath)
	if err != nil {
		log.Fatalf("failed to initialize repository: %v", err)
	}

	h := handlers.NewHandler(repo)
	r := router.New(h)

	log.Printf("backend listening on port %s", cfg.Port)
	if err := http.ListenAndServe(cfg.Port, r); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
