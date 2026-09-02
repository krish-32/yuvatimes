package models

import "time"

type Product struct {
	ID                  string `json:"id"`
	ProductType         string `json:"productType"`
	Brand               string `json:"brand"`
	Model               string `json:"model"`
}



type BarcodeGenerationBatch struct {
	ID                string    `json:"batchId"`
	RequestedQuantity int       `json:"requestedQuantity"`
	Status            string    `json:"status"`
	ExpiresAt         time.Time `json:"expiresAt"`
	CreatedBy         string    `json:"createdBy"`
	IdempotencyKey    string    `json:"idempotencyKey"`
}

type GenerateBarcodesRequest struct {
	ProductType string `json:"productType"`
	Brand       string `json:"brand"`
	Model       string `json:"model"`
	Quantity    int    `json:"quantity"`
}

type BarcodeResponse struct {
	Serial        string `json:"serial"`
	BarcodeFormat string `json:"barcodeFormat"`
	BarcodeValue  string `json:"barcodeValue"`
}

type ProductDraft struct {
	ProductType string `json:"productType"`
	Brand       string `json:"brand"`
	Model       string `json:"model"`
}

type GenerateBarcodesResponse struct {
	BatchID      string            `json:"batchId"`
	ProductDraft ProductDraft      `json:"productDraft"`
	Barcodes     []BarcodeResponse `json:"barcodes"`
	ExpiresAt    time.Time         `json:"expiresAt"`
}

type CommitBatchRequest struct {
	Print     bool   `json:"print"`
	PrinterID string `json:"printerId"`
}

type CommitBatchResponse struct {
	BatchID            string `json:"batchId"`
	Status             string `json:"status"`
	ProductID          string `json:"productId"`
	InventoryItemCount int    `json:"inventoryItemCount"`
	PrintJobID         string `json:"printJobId"`
}

type ProductSummary struct {
	ProductType    string `json:"productType"`
	Brand          string `json:"brand"`
	Model          string `json:"model"`
	TotalUnits     int    `json:"totalUnits"`
	AvailableUnits int    `json:"availableUnits"`
	SoldUnits      int    `json:"soldUnits"`
}

type SearchBarcodeResponse struct {
	InventoryItemID string `json:"inventoryItemId"`
	ProductType     string `json:"productType"`
	Brand           string `json:"brand"`
	Model           string `json:"model"`
	BarcodeValue    string `json:"barcodeValue"`
	Status          string `json:"status"`
}

type StageItemRequest struct {
	Barcode string `json:"barcode"`
}

type StageItemResponse struct {
	CartItemID      string  `json:"cartItemId"`
	InventoryItemID string  `json:"inventoryItemId"`
	Barcode         string  `json:"barcode"`
	Product         Product `json:"product"`
	UnitPrice       float64 `json:"unitPrice"`
	Status          string  `json:"status"`
}

type PaymentInfo struct {
	Method        string  `json:"method"`
	Amount        float64 `json:"amount"`
	ProviderToken string  `json:"providerToken"`
}

type CompleteCheckoutRequest struct {
	Payment PaymentInfo `json:"payment"`
}

type CompleteCheckoutResponse struct {
	OrderID            string  `json:"orderId"`
	InvoiceNumber      string  `json:"invoiceNumber"`
	Status             string  `json:"status"`
	Total              float64 `json:"total"`
	InventoryItemsSold int     `json:"inventoryItemsSold"`
	ReceiptPrintJobID  string  `json:"receiptPrintJobId"`
}

type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

type GenerateZPLRequest struct {
	Brand  string `json:"brand"`
	Model  string `json:"model"`
	Price  string `json:"price"`
	Serial string `json:"serial"`
}

type PrintZPLRequest struct {
	PrinterIP string `json:"printerIp"`
	Brand     string `json:"brand"`
	Model     string `json:"model"`
	Price     string `json:"price"`
	Serial    string `json:"serial"`
}

type GenerateZPLResponse struct {
	Serial string `json:"serial"`
	ZPL    string `json:"zpl"`
}
