package repository

import (
	"context"
	"database/sql"
	"fmt"
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
		`PRAGMA journal_mode=WAL;`,
		`PRAGMA foreign_keys=ON;`,
		`CREATE TABLE IF NOT EXISTS products (
			id TEXT PRIMARY KEY,
			product_type TEXT NOT NULL,
			brand TEXT NOT NULL,
			model TEXT NOT NULL,
			purchase_price REAL DEFAULT 0.0,
			selling_price REAL DEFAULT 0.0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(product_type, brand, model)
		);`,
		`CREATE TABLE IF NOT EXISTS barcode_batches (
			id TEXT PRIMARY KEY,
			product_id TEXT NOT NULL,
			quantity INTEGER NOT NULL CHECK(quantity > 0),
			status TEXT NOT NULL DEFAULT 'DRAFT',
			idempotency_key TEXT UNIQUE NOT NULL,
			created_by TEXT NOT NULL DEFAULT 'ADMIN',
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS barcodes (
			serial TEXT PRIMARY KEY,
			batch_id TEXT NOT NULL,
			product_id TEXT NOT NULL,
			barcode_format TEXT NOT NULL DEFAULT 'CODE128',
			status TEXT NOT NULL DEFAULT 'DRAFT',
			checkout_session_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(batch_id) REFERENCES barcode_batches(id) ON DELETE CASCADE,
			FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_barcodes_batch ON barcodes(batch_id);`,
		`CREATE INDEX IF NOT EXISTS idx_barcodes_product ON barcodes(product_id);`,
		`CREATE INDEX IF NOT EXISTS idx_barcodes_status ON barcodes(status);`,
	}
	for _, q := range queries {
		if _, err := r.DB.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) CreateBarcodeBatch(ctx context.Context, batch *models.BarcodeGenerationBatch, p models.ProductDraft, barcodes []string) (*models.Product, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var productID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM products WHERE product_type = ? AND brand = ? AND model = ?", p.ProductType, p.Brand, p.Model).Scan(&productID)
	if err != nil {
		if err == sql.ErrNoRows {
			productID = uuid.New().String()
			_, err = tx.ExecContext(ctx, "INSERT INTO products (id, product_type, brand, model) VALUES (?, ?, ?, ?)",
				productID, p.ProductType, p.Brand, p.Model)
			if err != nil { return nil, err }
		} else {
			return nil, err
		}
	}

	prod := &models.Product{ID: productID, ProductType: p.ProductType, Brand: p.Brand, Model: p.Model}

	_, err = tx.ExecContext(ctx, "INSERT INTO barcode_batches (id, product_id, quantity, status, idempotency_key, expires_at) VALUES (?, ?, ?, 'DRAFT', ?, ?)",
		batch.ID, productID, batch.RequestedQuantity, batch.IdempotencyKey, batch.ExpiresAt)
	if err != nil { return nil, err }

	for _, b := range barcodes {
		_, err = tx.ExecContext(ctx, "INSERT INTO barcodes (serial, batch_id, product_id, status) VALUES (?, ?, ?, 'DRAFT')",
			b, batch.ID, productID)
		if err != nil { return nil, err }
	}

	if err := tx.Commit(); err != nil { return nil, err }
	return prod, nil
}

func (r *Repository) CommitBatch(ctx context.Context, batchID string) (*models.CommitBatchResponse, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var status, productID string
	var expiresAt time.Time
	err = tx.QueryRowContext(ctx, "SELECT status, expires_at, product_id FROM barcode_batches WHERE id = ?", batchID).Scan(&status, &expiresAt, &productID)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("batch not found") }
		return nil, err
	}
	if status == "COMMITTED" {
		var count int
		tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM barcodes WHERE batch_id = ?", batchID).Scan(&count)
		return &models.CommitBatchResponse{BatchID: batchID, Status: "COMMITTED", ProductID: productID, InventoryItemCount: count}, nil
	}
	if time.Now().After(expiresAt) { return nil, fmt.Errorf("batch expired") }

	_, err = tx.ExecContext(ctx, "UPDATE barcode_batches SET status = 'COMMITTED' WHERE id = ?", batchID)
	if err != nil { return nil, err }

	res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'IN_STOCK' WHERE batch_id = ?", batchID)
	if err != nil { return nil, err }
	affected, _ := res.RowsAffected()

	if err := tx.Commit(); err != nil { return nil, err }

	return &models.CommitBatchResponse{BatchID: batchID, Status: "COMMITTED", ProductID: productID, InventoryItemCount: int(affected)}, nil
}

func (r *Repository) GetProductsSummary(ctx context.Context, page, limit int) ([]models.ProductSummary, error) {
	query := `
		SELECT p.product_type, p.brand, p.model,
			COUNT(b.serial) as total_units,
			SUM(CASE WHEN b.status = 'IN_STOCK' THEN 1 ELSE 0 END) as available_units,
			SUM(CASE WHEN b.status = 'SOLD' THEN 1 ELSE 0 END) as sold_units
		FROM products p
		LEFT JOIN barcodes b ON p.id = b.product_id
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
		SELECT p.product_type, p.brand, p.model, b.serial, b.status
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.serial = ?
	`
	var res models.SearchBarcodeResponse
	err := r.DB.QueryRowContext(ctx, query, barcode).Scan(&res.ProductType, &res.Brand, &res.Model, &res.BarcodeValue, &res.Status)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("not found") }
		return nil, err
	}
	res.InventoryItemID = res.BarcodeValue 
	return &res, nil
}

func (r *Repository) StageItem(ctx context.Context, sessionID, barcode string) (*models.StageItemResponse, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var pType, pBrand, pModel, status, existingSession sql.NullString
	query := `
		SELECT b.status, b.checkout_session_id, p.product_type, p.brand, p.model
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.serial = ?
	`
	err = tx.QueryRowContext(ctx, query, barcode).Scan(&status, &existingSession, &pType, &pBrand, &pModel)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("barcode not found") }
		return nil, err
	}

	if status.String == "SOLD" { return nil, fmt.Errorf("item already sold") }
	if status.String == "STAGED" {
		if existingSession.String == sessionID {
			return &models.StageItemResponse{CartItemID: barcode, InventoryItemID: barcode, Barcode: barcode, Status: "STAGED", Product: models.Product{ProductType: pType.String, Brand: pBrand.String, Model: pModel.String}}, nil
		}
		return nil, fmt.Errorf("item staged elsewhere")
	}
	if status.String != "IN_STOCK" { return nil, fmt.Errorf("item not available") }

	res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'STAGED', checkout_session_id = ? WHERE serial = ? AND status = 'IN_STOCK'", sessionID, barcode)
	if err != nil { return nil, err }
	affected, _ := res.RowsAffected()
	if affected == 0 { return nil, fmt.Errorf("concurrency conflict") }

	if err := tx.Commit(); err != nil { return nil, err }
	return &models.StageItemResponse{CartItemID: barcode, InventoryItemID: barcode, Barcode: barcode, Status: "STAGED", Product: models.Product{ProductType: pType.String, Brand: pBrand.String, Model: pModel.String}}, nil
}

func (r *Repository) CompleteCheckout(ctx context.Context, sessionID string, req models.CompleteCheckoutRequest) (*models.CompleteCheckoutResponse, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, "SELECT serial FROM barcodes WHERE checkout_session_id = ? AND status = 'STAGED'", sessionID)
	if err != nil { return nil, err }
	var itemIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil { return nil, err }
		itemIDs = append(itemIDs, id)
	}
	rows.Close()
	if len(itemIDs) == 0 {
		var soldCount int
		tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM barcodes WHERE checkout_session_id = ? AND status = 'SOLD'", sessionID).Scan(&soldCount)
		if soldCount > 0 {
			return &models.CompleteCheckoutResponse{OrderID: sessionID, InvoiceNumber: sessionID, Status: "COMPLETED"}, nil
		}
		return nil, fmt.Errorf("cart is empty")
	}

	for _, serial := range itemIDs {
		res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'SOLD' WHERE serial = ? AND status = 'STAGED'", serial)
		if err != nil { return nil, err }
		affected, _ := res.RowsAffected()
		if affected == 0 { return nil, fmt.Errorf("item %s no longer STAGED", serial) }
	}

	if err := tx.Commit(); err != nil { return nil, err }

	return &models.CompleteCheckoutResponse{OrderID: sessionID, InvoiceNumber: sessionID, Status: "COMPLETED", Total: req.Payment.Amount, InventoryItemsSold: len(itemIDs), ReceiptPrintJobID: "receipt-print-job-id"}, nil
}
