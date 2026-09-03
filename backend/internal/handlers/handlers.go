package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/models"
	"backend/internal/repository"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	Repo *repository.Repository
}

func NewHandler(repo *repository.Repository) *Handler {
	return &Handler{Repo: repo}
}

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, models.APIResponse{Status: "error", Message: message})
}

func (h *Handler) GenerateBarcodes(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProductType   string  `json:"productType"`
		Brand         string  `json:"brand"`
		Model         string  `json:"model"`
		Quantity      int     `json:"quantity"`
		PurchasePrice float64 `json:"purchasePrice"`
		SellingPrice  float64 `json:"sellingPrice"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}
	if req.Quantity <= 0 || req.ProductType == "" || req.Brand == "" || req.Model == "" {
		respondError(w, http.StatusBadRequest, "invalid metadata or quantity")
		return
	}

	batchID := uuid.New().String()
	var barcodes []string
	var resBarcodes []map[string]interface{}

	for i := 0; i < req.Quantity; i++ {
		uid := strings.Split(uuid.New().String(), "-")[0]
		prefix := req.ProductType
		if len(prefix) > 3 {
			prefix = prefix[:3]
		}
		serial := fmt.Sprintf("%s-%s-%s", strings.ToUpper(prefix), time.Now().Format("20060102"), strings.ToUpper(uid))
		barcodes = append(barcodes, serial)
		resBarcodes = append(resBarcodes, map[string]interface{}{
			"serial": serial, "barcodeFormat": "CODE128", "barcodeValue": serial,
		})
	}

	prod, err := h.Repo.CreateBarcodeBatch(r.Context(), batchID, req.ProductType, req.Brand, req.Model, req.PurchasePrice, req.SellingPrice, barcodes)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	res := map[string]interface{}{
		"batchId":      batchID,
		"productDraft": map[string]interface{}{"productType": prod.ProductType, "brand": prod.Brand, "model": prod.Model, "purchasePrice": prod.PurchasePrice, "sellingPrice": prod.SellingPrice},
		"barcodes":     resBarcodes,
		"expiresAt":    time.Now().Add(30 * time.Minute),
	}
	respondJSON(w, http.StatusCreated, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) CommitBatch(w http.ResponseWriter, r *http.Request) {
	batchID := chi.URLParam(r, "batchId")
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		respondError(w, http.StatusBadRequest, "Idempotency-Key required")
		return
	}

	res, err := h.Repo.CommitBatch(r.Context(), batchID)
	if err != nil {
		if strings.Contains(err.Error(), "expired") || strings.Contains(err.Error(), "not found") {
			respondError(w, http.StatusUnprocessableEntity, err.Error())
		} else {
			respondError(w, http.StatusConflict, err.Error())
		}
		return
	}
	respondJSON(w, http.StatusCreated, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) GetProducts(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	res, err := h.Repo.GetProductsSummary(r.Context(), page, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) SearchBarcode(w http.ResponseWriter, r *http.Request) {
	barcodeValue := chi.URLParam(r, "barcodeValue")
	if barcodeValue == "" {
		respondError(w, http.StatusBadRequest, "missing barcode value")
		return
	}
	res, err := h.Repo.SearchBarcode(r.Context(), barcodeValue)
	if err != nil {
		if err.Error() == "not found" {
			respondError(w, http.StatusNotFound, "No matching inventory item found")
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) StageCartItem(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "sessionId")
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		respondError(w, http.StatusBadRequest, "Idempotency-Key required")
		return
	}

	var req struct {
		Barcode string `json:"barcode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Barcode == "" {
		respondError(w, http.StatusUnprocessableEntity, "invalid scan payload")
		return
	}

	res, err := h.Repo.StageItem(r.Context(), sessionID, req.Barcode)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			respondError(w, http.StatusNotFound, err.Error())
		} else {
			respondError(w, http.StatusConflict, err.Error())
		}
		return
	}
	respondJSON(w, http.StatusCreated, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) CompleteCheckout(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "sessionId")
	idemKey := r.Header.Get("Idempotency-Key")
	if idemKey == "" {
		respondError(w, http.StatusBadRequest, "Idempotency-Key required")
		return
	}

	res, err := h.Repo.CompleteCheckout(r.Context(), sessionID)
	if err != nil {
		if strings.Contains(err.Error(), "empty") || strings.Contains(err.Error(), "no longer STAGED") {
			respondError(w, http.StatusConflict, err.Error())
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	respondJSON(w, http.StatusCreated, models.APIResponse{Status: "success", Data: res})
}
