package handlers

import (
	"encoding/json"
	"net/http"

	"backend/internal/models"
	"backend/internal/printer"
)

func (h *Handler) GenerateZPL(w http.ResponseWriter, r *http.Request) {
	var req models.GenerateZPLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request payload")
		return
	}
	
	if req.Brand == "" || req.Model == "" || req.Serial == "" {
		respondError(w, http.StatusBadRequest, "missing required fields (brand, model, serial)")
		return
	}

	zpl := printer.GenerateWatchTagZPL(req.Brand, req.Model, req.Price, req.Serial)

	res := models.GenerateZPLResponse{
		Serial: req.Serial,
		ZPL:    zpl,
	}
	
	respondJSON(w, http.StatusOK, models.APIResponse{Status: "success", Data: res})
}

func (h *Handler) PrintZPL(w http.ResponseWriter, r *http.Request) {
	var req models.PrintZPLRequest
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
