package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/models"
	"backend/internal/printer"
)

// parseSize parses a "WxH" size string (in millimetres) into width and height.
// Returns the default 50x25mm when the input is empty or invalid.
func parseSize(size string) (int, int) {
	width, height := 50, 25
	if size == "" {
		return width, height
	}
	parts := strings.Split(size, "x")
	if len(parts) != 2 {
		return width, height
	}
	w, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	h, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil || w <= 0 || h <= 0 {
		return width, height
	}
	return w, h
}

func (h *Handler) GenerateZPL(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Brand  string `json:"brand"`
		Model  string `json:"model"`
		Price  string `json:"price"`
		Serial string `json:"serial"`
		Size   string `json:"size"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if req.Brand == "" || req.Model == "" || req.Serial == "" {
		respondError(w, http.StatusBadRequest, "missing required fields (brand, model, serial)")
		return
	}

	widthMM, heightMM := parseSize(req.Size)
	zpl := printer.GenerateWatchTagZPL(req.Brand, req.Model, req.Price, req.Serial, widthMM, heightMM)

	res := map[string]interface{}{
		"serial": req.Serial,
		"zpl":    zpl,
	}

	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) PrintZPL(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Brand   string   `json:"brand"`
		Model   string   `json:"model"`
		Price   string   `json:"price"`
		Serials []string `json:"serials"`
		Size    string   `json:"size"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if len(req.Serials) == 0 || req.Brand == "" {
		respondError(w, http.StatusBadRequest, "missing required fields (brand, serials)")
		return
	}

	widthMM, heightMM := parseSize(req.Size)
	var fullZPL string
	for _, serial := range req.Serials {
		fullZPL += printer.GenerateWatchTagZPL(req.Brand, req.Model, req.Price, serial, widthMM, heightMM)
	}

	res := map[string]interface{}{
		"zpl": fullZPL,
	}

	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Message: fmt.Sprintf("Generated ZPL for %d labels", len(req.Serials)), Data: res})
}
