package models

type Product struct {
	ID            string  `json:"id"`
	ProductType   string  `json:"productType"`
	Brand         string  `json:"brand"`
	Model         string  `json:"model"`
	PurchasePrice float64 `json:"purchasePrice"`
	SellingPrice  float64 `json:"sellingPrice"`
}

type Barcode struct {
	Serial    string `json:"serial"`
	BatchID   string `json:"batchId"`
	ProductID string `json:"productId"`
	Status    string `json:"status"`
}

type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}
