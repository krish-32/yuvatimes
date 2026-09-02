package handlers

import (
	"encoding/json"
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
		PrinterIP string `json:"printerIp"`
		Brand     string `json:"brand"`
		Model     string `json:"model"`
		Price     string `json:"price"`
		Serial    string `json:"serial"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}

	if req.PrinterIP == "" || req.Serial == "" || req.Brand == "" {
		respondError(w, http.StatusBadRequest, "missing required fields (printerIp, brand, serial)")
		return
	}

	zpl := printer.GenerateWatchTagZPL(req.Brand, req.Model, req.Price, req.Serial)

	if err := printer.SendZPLToPrinter(req.PrinterIP, zpl); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Message: "Print job sent to printer"})
}
