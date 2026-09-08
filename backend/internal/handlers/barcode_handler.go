package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/internal/models"
	"backend/internal/printer"
)

func (h *Handler) GenerateZPL(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Brand  string `json:"brand"`
		Model  string `json:"model"`
		Price  string `json:"price"`
		Serial string `json:"serial"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if req.Brand == "" || req.Model == "" || req.Serial == "" {
		respondError(w, http.StatusBadRequest, "missing required fields (brand, model, serial)")
		return
	}

	zpl := printer.GenerateWatchTagZPL(req.Brand, req.Model, req.Price, req.Serial)

	res := map[string]interface{}{
		"serial": req.Serial,
		"zpl":    zpl,
	}

	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) PrintZPL(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Brand     string   `json:"brand"`
		Model     string   `json:"model"`
		Price     string   `json:"price"`
		Serials   []string `json:"serials"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if len(req.Serials) == 0 || req.Brand == "" {
		respondError(w, http.StatusBadRequest, "missing required fields (brand, serials)")
		return
	}

	var fullZPL string
	for _, serial := range req.Serials {
		fullZPL += printer.GenerateWatchTagZPL(req.Brand, req.Model, req.Price, serial)
	}

	res := map[string]interface{}{
		"zpl": fullZPL,
	}

	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Message: fmt.Sprintf("Generated ZPL for %d labels", len(req.Serials)), Data: res})
}
