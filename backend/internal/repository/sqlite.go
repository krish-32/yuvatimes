package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"backend/internal/models"
)

type Repository struct {
	DB *sql.DB
}

func NewRepository(dbPath string) (*Repository, error) {
	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)

	repo := &Repository{DB: db}
	if err := repo.initSchema(); err != nil {
		return nil, err
	}
	return repo, nil
}

func (r *Repository) initSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS products (
			id TEXT PRIMARY KEY, product_type TEXT, brand TEXT, model TEXT, normalized_lookup_key TEXT UNIQUE
		);`,
		`CREATE TABLE IF NOT EXISTS serial_barcodes (
			id TEXT PRIMARY KEY, inventory_item_id TEXT, barcode_value TEXT UNIQUE
		);`,
		`CREATE TABLE IF NOT EXISTS inventory_items (
			id TEXT PRIMARY KEY, product_id TEXT, barcode_id TEXT, status TEXT, cost REAL, received_at DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS barcode_generation_batches (
			id TEXT PRIMARY KEY, requested_quantity INTEGER, status TEXT, expires_at DATETIME, created_by TEXT, idempotency_key TEXT UNIQUE
		);`,
		`CREATE TABLE IF NOT EXISTS temp_barcodes (
			batch_id TEXT, barcode_value TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS print_jobs (
			id TEXT PRIMARY KEY, batch_id TEXT, sales_order_id TEXT, status TEXT, attempt_count INTEGER, last_error TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS checkout_sessions (
			id TEXT PRIMARY KEY, status TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS checkout_cart_items (
			id TEXT PRIMARY KEY, checkout_session_id TEXT, inventory_item_id TEXT, barcode_value TEXT, status TEXT,
			UNIQUE(checkout_session_id, inventory_item_id)
		);`,
		`CREATE TABLE IF NOT EXISTS sales_orders (
			id TEXT PRIMARY KEY, invoice_number TEXT, checkout_session_id TEXT, status TEXT, subtotal REAL, tax REAL, discount REAL, total REAL, created_by TEXT, created_at DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS sales_order_lines (
			id TEXT PRIMARY KEY, sales_order_id TEXT, product_id TEXT, inventory_item_id TEXT, barcode_id TEXT, unit_price REAL
		);`,
		`CREATE TABLE IF NOT EXISTS payments (
			id TEXT PRIMARY KEY, sales_order_id TEXT, method TEXT, amount REAL, provider_reference TEXT, status TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS inventory_status_history (
			id TEXT PRIMARY KEY, inventory_item_id TEXT, previous_status TEXT, new_status TEXT, actor TEXT, timestamp DATETIME, reference TEXT
		);`,
	}
	for _, q := range queries {
		if _, err := r.DB.Exec(q); err != nil { return err }
	}
	return nil
}

func (r *Repository) CreateBarcodeBatch(ctx context.Context, batch *models.BarcodeGenerationBatch, barcodes []string) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return err }
	defer tx.Rollback()

	for _, b := range barcodes {
		var exists int
		err := tx.QueryRowContext(ctx, "SELECT 1 FROM serial_barcodes WHERE barcode_value = ?", b).Scan(&exists)
		if err != nil && err != sql.ErrNoRows { return err }
		if exists == 1 { return fmt.Errorf("duplicate serial value %s", b) }
	}

	_, err = tx.ExecContext(ctx, "INSERT INTO barcode_generation_batches (id, requested_quantity, status, expires_at, created_by, idempotency_key) VALUES (?, ?, ?, ?, ?, ?)",
		batch.ID, batch.RequestedQuantity, batch.Status, batch.ExpiresAt, batch.CreatedBy, batch.IdempotencyKey)
	if err != nil { return err }

	for _, b := range barcodes {
		_, err = tx.ExecContext(ctx, "INSERT INTO temp_barcodes (batch_id, barcode_value) VALUES (?, ?)", batch.ID, b)
		if err != nil { return err }
	}
	return tx.Commit()
}

func (r *Repository) CommitBatch(ctx context.Context, batchID string, p models.Product) (*models.CommitBatchResponse, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var status string
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, "SELECT status, expires_at FROM barcode_generation_batches WHERE id = ?", batchID).Scan(&status, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("batch not found") }
		return nil, err
	}
	if status == "COMMITTED" {
		var count int
		tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM print_jobs WHERE batch_id = ?", batchID).Scan(&count)
		return &models.CommitBatchResponse{BatchID: batchID, Status: "COMMITTED", ProductID: p.ID, InventoryItemCount: count}, nil
	}
	if time.Now().After(expiresAt) { return nil, fmt.Errorf("batch expired") }

	var productID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM products WHERE normalized_lookup_key = ?", p.NormalizedLookupKey).Scan(&productID)
	if err != nil {
		if err == sql.ErrNoRows {
			productID = p.ID
			_, err = tx.ExecContext(ctx, "INSERT INTO products (id, product_type, brand, model, normalized_lookup_key) VALUES (?, ?, ?, ?, ?)",
				productID, p.ProductType, p.Brand, p.Model, p.NormalizedLookupKey)
			if err != nil { return nil, err }
		} else { return nil, err }
	}

	rows, err := tx.QueryContext(ctx, "SELECT barcode_value FROM temp_barcodes WHERE batch_id = ?", batchID)
	if err != nil { return nil, err }
	defer rows.Close()
	var barcodes []string
	for rows.Next() {
		var b string
		if err := rows.Scan(&b); err != nil { return nil, err }
		barcodes = append(barcodes, b)
	}

	for _, b := range barcodes {
		invID := uuid.New().String()
		barID := uuid.New().String()
		_, err = tx.ExecContext(ctx, "INSERT INTO inventory_items (id, product_id, barcode_id, status, cost, received_at) VALUES (?, ?, ?, ?, ?, ?)",
			invID, productID, barID, "AVAILABLE", 0.0, time.Now())
		if err != nil { return nil, err }
		_, err = tx.ExecContext(ctx, "INSERT INTO serial_barcodes (id, inventory_item_id, barcode_value) VALUES (?, ?, ?)", barID, invID, b)
		if err != nil { return nil, err }
	}

	_, err = tx.ExecContext(ctx, "UPDATE barcode_generation_batches SET status = 'COMMITTED' WHERE id = ?", batchID)
	if err != nil { return nil, err }

	printJobID := uuid.New().String()
	_, err = tx.ExecContext(ctx, "INSERT INTO print_jobs (id, batch_id, status, attempt_count) VALUES (?, ?, 'PENDING', 0)", printJobID, batchID)
	if err != nil { return nil, err }

	if err := tx.Commit(); err != nil { return nil, err }

	return &models.CommitBatchResponse{BatchID: batchID, Status: "COMMITTED", ProductID: productID, InventoryItemCount: len(barcodes), PrintJobID: printJobID}, nil
}

func (r *Repository) GetProductsSummary(ctx context.Context, page, limit int) ([]models.ProductSummary, error) {
	query := `
		SELECT p.product_type, p.brand, p.model,
			COUNT(i.id) as total_units,
			SUM(CASE WHEN i.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_units,
			SUM(CASE WHEN i.status = 'SOLD' THEN 1 ELSE 0 END) as sold_units
		FROM products p
		LEFT JOIN inventory_items i ON p.id = i.product_id
		GROUP BY p.id LIMIT ? OFFSET ?
	`
	rows, err := r.DB.QueryContext(ctx, query, limit, (page-1)*limit)
	if err != nil { return nil, err }
	defer rows.Close()

	var results []models.ProductSummary
	for rows.Next() {
		var ps models.ProductSummary
		var total, avail, sold sql.NullInt64
		if err := rows.Scan(&ps.ProductType, &ps.Brand, &ps.Model, &total, &avail, &sold); err != nil { return nil, err }
		ps.TotalUnits = int(total.Int64)
		ps.AvailableUnits = int(avail.Int64)
		ps.SoldUnits = int(sold.Int64)
		results = append(results, ps)
	}
	return results, nil
}

func (r *Repository) SearchBarcode(ctx context.Context, barcode string) (*models.SearchBarcodeResponse, error) {
	query := `
		SELECT i.id, p.product_type, p.brand, p.model, sb.barcode_value, i.status
		FROM serial_barcodes sb
		JOIN inventory_items i ON sb.inventory_item_id = i.id
		JOIN products p ON i.product_id = p.id
		WHERE sb.barcode_value = ?
	`
	var res models.SearchBarcodeResponse
	err := r.DB.QueryRowContext(ctx, query, barcode).Scan(&res.InventoryItemID, &res.ProductType, &res.Brand, &res.Model, &res.BarcodeValue, &res.Status)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("not found") }
		return nil, err
	}
	return &res, nil
}

func (r *Repository) StageItem(ctx context.Context, sessionID, barcode string) (*models.StageItemResponse, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var invID, pType, pBrand, pModel, status string
	query := `
		SELECT i.id, i.status, p.product_type, p.brand, p.model
		FROM serial_barcodes sb
		JOIN inventory_items i ON sb.inventory_item_id = i.id
		JOIN products p ON i.product_id = p.id
		WHERE sb.barcode_value = ?
	`
	err = tx.QueryRowContext(ctx, query, barcode).Scan(&invID, &status, &pType, &pBrand, &pModel)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("barcode not found") }
		return nil, err
	}

	if status == "SOLD" { return nil, fmt.Errorf("item already sold") }
	if status == "STAGED" {
		var existingSession string
		err = tx.QueryRowContext(ctx, "SELECT checkout_session_id FROM checkout_cart_items WHERE inventory_item_id = ?", invID).Scan(&existingSession)
		if err == nil && existingSession == sessionID {
			return &models.StageItemResponse{CartItemID: "existing", InventoryItemID: invID, Barcode: barcode, Status: "STAGED", Product: models.Product{ProductType: pType, Brand: pBrand, Model: pModel}}, nil
		}
		return nil, fmt.Errorf("item staged elsewhere")
	}
	if status != "AVAILABLE" { return nil, fmt.Errorf("item not available") }

	res, err := tx.ExecContext(ctx, "UPDATE inventory_items SET status = 'STAGED' WHERE id = ? AND status = 'AVAILABLE'", invID)
	if err != nil { return nil, err }
	affected, _ := res.RowsAffected()
	if affected == 0 { return nil, fmt.Errorf("concurrency conflict") }

	tx.ExecContext(ctx, "INSERT OR IGNORE INTO checkout_sessions (id, status) VALUES (?, 'ACTIVE')", sessionID)
	cartItemID := uuid.New().String()
	_, err = tx.ExecContext(ctx, "INSERT INTO checkout_cart_items (id, checkout_session_id, inventory_item_id, barcode_value, status) VALUES (?, ?, ?, ?, 'STAGED')", cartItemID, sessionID, invID, barcode)
	if err != nil { return nil, err }

	if err := tx.Commit(); err != nil { return nil, err }
	return &models.StageItemResponse{CartItemID: cartItemID, InventoryItemID: invID, Barcode: barcode, Status: "STAGED", Product: models.Product{ProductType: pType, Brand: pBrand, Model: pModel}}, nil
}

func (r *Repository) CompleteCheckout(ctx context.Context, sessionID string, req models.CompleteCheckoutRequest) (*models.CompleteCheckoutResponse, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var existingOrderID, invoiceNum string
	err = tx.QueryRowContext(ctx, "SELECT id, invoice_number FROM sales_orders WHERE checkout_session_id = ?", sessionID).Scan(&existingOrderID, &invoiceNum)
	if err == nil { return &models.CompleteCheckoutResponse{OrderID: existingOrderID, InvoiceNumber: invoiceNum, Status: "COMPLETED"}, nil }

	rows, err := tx.QueryContext(ctx, "SELECT inventory_item_id FROM checkout_cart_items WHERE checkout_session_id = ?", sessionID)
	if err != nil { return nil, err }
	var itemIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil { return nil, err }
		itemIDs = append(itemIDs, id)
	}
	rows.Close()
	if len(itemIDs) == 0 { return nil, fmt.Errorf("cart is empty") }

	for _, invID := range itemIDs {
		res, err := tx.ExecContext(ctx, "UPDATE inventory_items SET status = 'SOLD' WHERE id = ? AND status = 'STAGED'", invID)
		if err != nil { return nil, err }
		affected, _ := res.RowsAffected()
		if affected == 0 { return nil, fmt.Errorf("item %s no longer STAGED", invID) }
		_, err = tx.ExecContext(ctx, "INSERT INTO inventory_status_history (id, inventory_item_id, previous_status, new_status, actor, timestamp, reference) VALUES (?, ?, 'STAGED', 'SOLD', 'SYSTEM', ?, ?)", uuid.New().String(), invID, time.Now(), sessionID)
		if err != nil { return nil, err }
	}

	orderID := uuid.New().String()
	invoice := fmt.Sprintf("INV-%s-%s", time.Now().Format("20060102"), strings.ToUpper(uuid.New().String()[:4]))
	_, err = tx.ExecContext(ctx, "INSERT INTO sales_orders (id, invoice_number, checkout_session_id, status, total, created_by, created_at) VALUES (?, ?, ?, 'COMPLETED', ?, 'SYSTEM', ?)", orderID, invoice, sessionID, req.Payment.Amount, time.Now())
	if err != nil { return nil, err }

	_, err = tx.ExecContext(ctx, "INSERT INTO payments (id, sales_order_id, method, amount, provider_reference, status) VALUES (?, ?, ?, ?, ?, 'COMPLETED')", uuid.New().String(), orderID, req.Payment.Method, req.Payment.Amount, req.Payment.ProviderToken)
	if err != nil { return nil, err }

	_, err = tx.ExecContext(ctx, "UPDATE checkout_sessions SET status = 'COMPLETED' WHERE id = ?", sessionID)
	if err != nil { return nil, err }

	printJobID := uuid.New().String()
	_, err = tx.ExecContext(ctx, "INSERT INTO print_jobs (id, sales_order_id, status, attempt_count) VALUES (?, ?, 'PENDING', 0)", printJobID, orderID)
	if err != nil { return nil, err }

	if err := tx.Commit(); err != nil { return nil, err }

	return &models.CompleteCheckoutResponse{OrderID: orderID, InvoiceNumber: invoice, Status: "COMPLETED", Total: req.Payment.Amount, InventoryItemsSold: len(itemIDs), ReceiptPrintJobID: printJobID}, nil
}
