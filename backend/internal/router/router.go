package router

import (
	"time"

	"backend/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func New(h *handlers.Handler) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Route("/api", func(r chi.Router) {
		r.Route("/inventory", func(r chi.Router) {
			r.Post("/barcode-batches", h.GenerateBarcodes)
			r.Post("/barcode-batches/{batchId}/commit", h.CommitBatch)
			r.Get("/products", h.GetProducts)
			r.Get("/barcodes/{barcodeValue}", h.SearchBarcode)
		})

		r.Route("/checkout/sessions/{sessionId}", func(r chi.Router) {
			r.Post("/items", h.StageCartItem)
			r.Post("/complete", h.CompleteCheckout)
		})

		r.Route("/v1/barcodes", func(r chi.Router) {
			r.Post("/generate-zpl", h.GenerateZPL)
			r.Post("/print-zpl", h.PrintZPL)
		})
	})

	return r
}
