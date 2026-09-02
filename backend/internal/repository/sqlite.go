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
		`CREATE TABLE IF NOT EXISTS barcodes (
			serial TEXT PRIMARY KEY,
			batch_id TEXT NOT NULL,
			product_id TEXT NOT NULL,
			barcode_format TEXT NOT NULL DEFAULT 'CODE128',
			status TEXT NOT NULL DEFAULT 'DRAFT',
			checkout_session_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

func (r *Repository) CreateBarcodeBatch(ctx context.Context, batchID string, pType, brand, model string, barcodes []string) (*models.Product, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var productID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM products WHERE product_type = ? AND brand = ? AND model = ?", pType, brand, model).Scan(&productID)
	if err != nil {
		if err == sql.ErrNoRows {
			productID = uuid.New().String()
			_, err = tx.ExecContext(ctx, "INSERT INTO products (id, product_type, brand, model) VALUES (?, ?, ?, ?)",
				productID, pType, brand, model)
			if err != nil { return nil, err }
		} else {
			return nil, err
		}
	}

	prod := &models.Product{ID: productID, ProductType: pType, Brand: brand, Model: model}

	for _, b := range barcodes {
		_, err = tx.ExecContext(ctx, "INSERT INTO barcodes (serial, batch_id, product_id, status) VALUES (?, ?, ?, 'DRAFT')",
			b, batchID, productID)
		if err != nil { return nil, err }
	}

	if err := tx.Commit(); err != nil { return nil, err }
	return prod, nil
}

func (r *Repository) CommitBatch(ctx context.Context, batchID string) (map[string]interface{}, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil { return nil, err }
	defer tx.Rollback()

	var productID string
	var createdAt time.Time
	err = tx.QueryRowContext(ctx, "SELECT product_id, created_at FROM barcodes WHERE batch_id = ? LIMIT 1", batchID).Scan(&productID, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("batch not found") }
		return nil, err
	}

	if time.Now().UTC().After(createdAt.Add(30 * time.Minute)) {
		return nil, fmt.Errorf("batch expired")
	}

	res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'IN_STOCK' WHERE batch_id = ? AND status = 'DRAFT'", batchID)
	if err != nil { return nil, err }
	affected, _ := res.RowsAffected()

	if affected == 0 {
		var count int
		tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM barcodes WHERE batch_id = ? AND status = 'IN_STOCK'", batchID).Scan(&count)
		if count > 0 {
			return map[string]interface{}{"batchId": batchID, "status": "COMMITTED", "productId": productID, "inventoryItemCount": count}, nil
		}
		return nil, fmt.Errorf("batch not found or already processed")
	}

	if err := tx.Commit(); err != nil { return nil, err }

	return map[string]interface{}{"batchId": batchID, "status": "COMMITTED", "productId": productID, "inventoryItemCount": int(affected)}, nil
}

func (r *Repository) GetProductsSummary(ctx context.Context, page, limit int) ([]map[string]interface{}, error) {
	query := `
		SELECT p.product_type, p.brand, p.model,
			COUNT(b.serial) as total_units,
			SUM(CASE WHEN b.status = 'IN_STOCK' THEN 1 ELSE 0 END) as available_units
		FROM products p
		LEFT JOIN barcodes b ON p.id = b.product_id
		GROUP BY p.id LIMIT ? OFFSET ?
	`
	rows, err := r.DB.QueryContext(ctx, query, limit, (page-1)*limit)
	if err != nil { return nil, err }
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var pType, brand, model string
		var total, avail sql.NullInt64
		if err := rows.Scan(&pType, &brand, &model, &total, &avail); err != nil { return nil, err }
		results = append(results, map[string]interface{}{
			"productType": pType, "brand": brand, "model": model,
			"totalUnits": int(total.Int64), "availableUnits": int(avail.Int64),
		})
	}
	return results, nil
}

func (r *Repository) SearchBarcode(ctx context.Context, barcode string) (map[string]interface{}, error) {
	query := `
		SELECT p.product_type, p.brand, p.model, b.serial, b.status
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.serial = ?
	`
	var pType, brand, model, serial, status string
	err := r.DB.QueryRowContext(ctx, query, barcode).Scan(&pType, &brand, &model, &serial, &status)
	if err != nil {
		if err == sql.ErrNoRows { return nil, fmt.Errorf("not found") }
		return nil, err
	}
	return map[string]interface{}{
		"inventoryItemId": serial, "productType": pType, "brand": brand,
		"model": model, "barcodeValue": serial, "status": status,
	}, nil
}

func (r *Repository) StageItem(ctx context.Context, sessionID, barcode string) (map[string]interface{}, error) {
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
			return map[string]interface{}{"cartItemId": barcode, "inventoryItemId": barcode, "barcode": barcode, "status": "STAGED", "product": map[string]interface{}{"productType": pType.String, "brand": pBrand.String, "model": pModel.String}}, nil
		}
		return nil, fmt.Errorf("item staged elsewhere")
	}
	if status.String != "IN_STOCK" { return nil, fmt.Errorf("item not available") }

	res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'STAGED', checkout_session_id = ? WHERE serial = ? AND status = 'IN_STOCK'", sessionID, barcode)
	if err != nil { return nil, err }
	affected, _ := res.RowsAffected()
	if affected == 0 { return nil, fmt.Errorf("concurrency conflict") }

	if err := tx.Commit(); err != nil { return nil, err }
	return map[string]interface{}{"cartItemId": barcode, "inventoryItemId": barcode, "barcode": barcode, "status": "STAGED", "product": map[string]interface{}{"productType": pType.String, "brand": pBrand.String, "model": pModel.String}}, nil
}

func (r *Repository) CompleteCheckout(ctx context.Context, sessionID string) (map[string]interface{}, error) {
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
		return nil, fmt.Errorf("cart is empty")
	}

	for _, serial := range itemIDs {
		res, err := tx.ExecContext(ctx, "DELETE FROM barcodes WHERE serial = ? AND status = 'STAGED'", serial)
		if err != nil { return nil, err }
		affected, _ := res.RowsAffected()
		if affected == 0 { return nil, fmt.Errorf("item %s no longer STAGED", serial) }
	}

	if err := tx.Commit(); err != nil { return nil, err }

	return map[string]interface{}{"orderId": sessionID, "invoiceNumber": sessionID, "status": "COMPLETED", "inventoryItemsSold": len(itemIDs), "receiptPrintJobId": "receipt-print-job-id"}, nil
}
