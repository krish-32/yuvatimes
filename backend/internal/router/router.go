package router

import (
	"time"

	"backend/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func New(h *handlers.Handler) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, 
	}))

	r.Route("/api", func(r chi.Router) {
		r.Route("/inventory", func(r chi.Router) {
			r.Post("/barcode-batches", h.GenerateBarcodes)
			r.Get("/barcode-batches/drafts", h.GetDraftBatches)
			r.Post("/barcode-batches/{batchId}/commit", h.CommitBatch)
			r.Post("/barcode-batches/{batchId}/revert", h.RevertBatch)
			r.Get("/products", h.GetProducts)
			r.Get("/barcodes/{barcodeValue}", h.SearchBarcode)
		})

		r.Route("/checkout/sessions/{sessionId}", func(r chi.Router) {
			r.Get("/items", h.GetCartItems)
			r.Post("/items", h.StageCartItem)
			r.Delete("/items/{serial}", h.UnstageCartItem)
			r.Post("/complete", h.CompleteCheckout)
		})

		r.Route("/v1/barcodes", func(r chi.Router) {
			r.Post("/generate-zpl", h.GenerateZPL)
			r.Post("/print-zpl", h.PrintZPL)
		})
	})

	return r
}
