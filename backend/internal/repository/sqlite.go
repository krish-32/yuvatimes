package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"backend/internal/models"

	"github.com/google/uuid"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

type Repository struct {
	DB *sql.DB
}

// NewRepository creates a new repository. If tursoURL is provided, it connects to
// Turso Cloud DB. Otherwise it falls back to a local SQLite file (for local dev).
func NewRepository(dbPath, tursoURL, tursoAuthToken string) (*Repository, error) {
	var db *sql.DB
	var err error

	if tursoURL != "" {
		// Production: Connect to Turso Cloud DB via libsql HTTP driver
		// libsql-client-go accepts the token as a query param on the URL
		connStr := tursoURL
		if tursoAuthToken != "" {
			connStr = fmt.Sprintf("%s?authToken=%s", tursoURL, tursoAuthToken)
		}
		db, err = sql.Open("libsql", connStr)
		if err != nil {
			return nil, err
		}
		// For remote Turso, allow a small connection pool
		db.SetMaxOpenConns(5)
		db.SetMaxIdleConns(3)
		db.SetConnMaxLifetime(5 * time.Minute)
	} else {
		// Local dev: Use a local SQLite file via the libsql driver (file: scheme)
		db, err = sql.Open("libsql", "file:"+dbPath)
		if err != nil {
			return nil, err
		}
		// Single connection is safest for local SQLite file access
		db.SetMaxOpenConns(1)
	}

	// Enable foreign key enforcement (required for SQLite ON DELETE CASCADE)
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	repo := &Repository{DB: db}
	if err := repo.initSchema(); err != nil {
		return nil, err
	}
	return repo, nil
}

func (r *Repository) initSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS products (
			id TEXT PRIMARY KEY,
			product_type TEXT NOT NULL,
			brand TEXT NOT NULL,
			model TEXT NOT NULL,
			purchase_price REAL DEFAULT 0.0,
			selling_price REAL DEFAULT 0.0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(product_type, brand, model, purchase_price, selling_price)
		);`,
		`CREATE TABLE IF NOT EXISTS barcodes (
			serial TEXT PRIMARY KEY,
			batch_id TEXT NOT NULL,
			product_id TEXT NOT NULL,
			barcode_format TEXT NOT NULL DEFAULT 'CODE128',
			status TEXT NOT NULL DEFAULT 'DRAFT',
			checkout_session_id TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			sold_at DATETIME,
			sold_price REAL,
			FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_barcodes_batch ON barcodes(batch_id);`,
		`CREATE INDEX IF NOT EXISTS idx_barcodes_product ON barcodes(product_id);`,
		`CREATE INDEX IF NOT EXISTS idx_barcodes_status ON barcodes(status);`,
		// Composite index for sales queries: WHERE status='SOLD' ORDER BY sold_at DESC
		`CREATE INDEX IF NOT EXISTS idx_barcodes_status_sold_at ON barcodes(status, sold_at);`,
		// Index for cart/staging queries filtering by checkout_session_id
		`CREATE INDEX IF NOT EXISTS idx_barcodes_session ON barcodes(checkout_session_id);`,
		// Indexes for multi-criteria search on products
		`CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);`,
		`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);`,
		`CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);`,
	}
	for _, q := range queries {
		if _, err := r.DB.Exec(q); err != nil {
			return err
		}
	}

	// Idempotent column migrations — ignore errors (column may already exist)
	_, _ = r.DB.Exec(`ALTER TABLE barcodes ADD COLUMN sold_at DATETIME`)
	_, _ = r.DB.Exec(`ALTER TABLE barcodes ADD COLUMN sold_price REAL`)

	return nil
}

func (r *Repository) CreateBarcodeBatch(ctx context.Context, batchID string, pType, brand, model string, pPrice, sPrice float64, barcodes []string) (*models.Product, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var productID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM products WHERE product_type = ? COLLATE NOCASE AND brand = ? COLLATE NOCASE AND model = ? COLLATE NOCASE AND purchase_price = ? AND selling_price = ?", pType, brand, model, pPrice, sPrice).Scan(&productID)
	if err != nil {
		if err == sql.ErrNoRows {
			productID = uuid.New().String()
			_, err = tx.ExecContext(ctx, "INSERT INTO products (id, product_type, brand, model, purchase_price, selling_price) VALUES (?, ?, ?, ?, ?, ?)",
				productID, pType, brand, model, pPrice, sPrice)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	prod := &models.Product{ID: productID, ProductType: pType, Brand: brand, Model: model, PurchasePrice: pPrice, SellingPrice: sPrice}

	for _, b := range barcodes {
		_, err = tx.ExecContext(ctx, "INSERT INTO barcodes (serial, batch_id, product_id, status) VALUES (?, ?, ?, 'DRAFT')",
			b, batchID, productID)
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE constraint failed") {
				return nil, fmt.Errorf("duplicate serial detected (%s), please generate again", b)
			}
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return prod, nil
}

func (r *Repository) CommitBatch(ctx context.Context, batchID string) (map[string]interface{}, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Verify batch existence with minimal column scan
	var dummy int
	err = tx.QueryRowContext(ctx, "SELECT 1 FROM barcodes WHERE batch_id = ? LIMIT 1", batchID).Scan(&dummy)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("batch not found")
		}
		return nil, err
	}

	res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'IN_STOCK' WHERE batch_id = ? AND status = 'DRAFT'", batchID)
	if err != nil {
		return nil, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return nil, fmt.Errorf("batch already committed or no drafts found")
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{"status": "committed", "affected_units": affected}, nil
}

func (r *Repository) GetDraftBatches(ctx context.Context) ([]map[string]interface{}, error) {
	query := `
		SELECT b.batch_id, p.brand, p.model, p.purchase_price, p.selling_price, GROUP_CONCAT(b.serial) as serials
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.status = 'DRAFT'
		GROUP BY b.batch_id
		ORDER BY p.created_at DESC
	`
	rows, err := r.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drafts []map[string]interface{}
	for rows.Next() {
		var batchID, brand, model, serialsStr string
		var pPrice, sPrice float64
		if err := rows.Scan(&batchID, &brand, &model, &pPrice, &sPrice, &serialsStr); err != nil {
			return nil, err
		}

		serials := strings.Split(serialsStr, ",")
		drafts = append(drafts, map[string]interface{}{
			"batchId":       batchID,
			"brand":         brand,
			"model":         model,
			"purchasePrice": pPrice,
			"sellingPrice":  sPrice,
			"serials":       serials,
			"status":        "DRAFT",
		})
	}
	if drafts == nil {
		drafts = []map[string]interface{}{}
	}
	return drafts, nil
}

func (r *Repository) RevertBatch(ctx context.Context, batchID string) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Capture the product_id before deleting, so we can target orphan cleanup
	var productID string
	err = tx.QueryRowContext(ctx, "SELECT product_id FROM barcodes WHERE batch_id = ? AND status = 'DRAFT' LIMIT 1", batchID).Scan(&productID)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("no draft records found for batch or batch already committed")
		}
		return err
	}

	_, err = tx.ExecContext(ctx, "DELETE FROM barcodes WHERE batch_id = ? AND status = 'DRAFT'", batchID)
	if err != nil {
		return err
	}

	// Targeted orphan cleanup: only check the specific product that was affected
	var remaining int
	err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM barcodes WHERE product_id = ?", productID).Scan(&remaining)
	if err != nil {
		return err
	}
	if remaining == 0 {
		_, err = tx.ExecContext(ctx, "DELETE FROM products WHERE id = ?", productID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *Repository) CheckSerialExists(ctx context.Context, serial string) (bool, error) {
	var dummy int
	err := r.DB.QueryRowContext(ctx, "SELECT 1 FROM barcodes WHERE serial = ? LIMIT 1", serial).Scan(&dummy)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// FilterExistingSerials returns the subset of serials that already exist in the database.
// Uses a single batch query instead of N individual checks.
func (r *Repository) FilterExistingSerials(ctx context.Context, serials []string) (map[string]bool, error) {
	if len(serials) == 0 {
		return map[string]bool{}, nil
	}
	placeholders := make([]string, len(serials))
	args := make([]interface{}, len(serials))
	for i, s := range serials {
		placeholders[i] = "?"
		args[i] = s
	}
	query := "SELECT serial FROM barcodes WHERE serial IN (" + strings.Join(placeholders, ",") + ")"
	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	existing := make(map[string]bool)
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		existing[s] = true
	}
	return existing, nil
}

// GetDashboardStats returns aggregate inventory statistics computed entirely in the DB,
// avoiding the need to fetch and iterate all products on the client.
func (r *Repository) GetDashboardStats(ctx context.Context) (map[string]interface{}, error) {
	query := `
		SELECT
			COUNT(DISTINCT p.id)                                          AS total_products,
			COALESCE(COUNT(b.serial), 0)                                  AS total_units,
			COALESCE(SUM(CASE WHEN b.status = 'IN_STOCK' THEN 1 ELSE 0 END), 0) AS available_units,
			COALESCE(SUM(CASE WHEN b.status = 'IN_STOCK' THEN p.selling_price ELSE 0 END), 0) AS total_value
		FROM products p
		LEFT JOIN barcodes b ON p.id = b.product_id
	`
	var totalProducts, totalUnits, availableUnits int64
	var totalValue float64
	err := r.DB.QueryRowContext(ctx, query).Scan(&totalProducts, &totalUnits, &availableUnits, &totalValue)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"totalProducts":  totalProducts,
		"totalUnits":     totalUnits,
		"availableUnits": availableUnits,
		"totalValue":     totalValue,
	}, nil
}

func (r *Repository) GetProductsSummary(ctx context.Context, page, limit int, search string) ([]map[string]interface{}, error) {
	baseQuery := `
		SELECT p.id, p.product_type, p.brand, p.model, p.purchase_price, p.selling_price,
			COUNT(b.serial) as total_units,
			SUM(CASE WHEN b.status = 'IN_STOCK' THEN 1 ELSE 0 END) as available_units
		FROM products p
		LEFT JOIN barcodes b ON p.id = b.product_id
	`

	var args []interface{}

	if search != "" {
		// Escape SQL LIKE wildcard characters in user input to prevent wildcard injection
		escaped := strings.NewReplacer("%", "\\%", "_", "\\_").Replace(search)
		baseQuery += ` WHERE (
			p.product_type LIKE ? ESCAPE '\' COLLATE NOCASE
			OR p.brand LIKE ? ESCAPE '\' COLLATE NOCASE
			OR p.model LIKE ? ESCAPE '\' COLLATE NOCASE
		)`
		wildcard := "%" + escaped + "%"
		args = append(args, wildcard, wildcard, wildcard)
	}

	baseQuery += " GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, (page-1)*limit)

	rows, err := r.DB.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0, 16)
	for rows.Next() {
		var id, pType, brand, model string
		var pPrice, sPrice float64
		var total, avail sql.NullInt64
		if err := rows.Scan(&id, &pType, &brand, &model, &pPrice, &sPrice, &total, &avail); err != nil {
			return nil, err
		}
		results = append(results, map[string]interface{}{
			"id": id, "productType": pType, "brand": brand, "model": model,
			"purchasePrice": pPrice, "sellingPrice": sPrice,
			"totalUnits": int(total.Int64), "availableUnits": int(avail.Int64),
		})
	}
	return results, nil
}

func (r *Repository) UpdateProduct(ctx context.Context, id, pType, brand, model string, purchasePrice, sellingPrice float64) error {
	query := `
		UPDATE products 
		SET product_type = ?, brand = ?, model = ?, purchase_price = ?, selling_price = ?
		WHERE id = ?
	`
	res, err := r.DB.ExecContext(ctx, query, pType, brand, model, purchasePrice, sellingPrice, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("product not found")
	}
	return nil
}

// DeleteProduct removes a product and all its associated barcodes in a single atomic transaction.
// The ON DELETE CASCADE FK constraint handles barcode cleanup, but we wrap in a transaction
// and re-enable foreign_keys to ensure consistency.
func (r *Repository) DeleteProduct(ctx context.Context, id string) (int64, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Count associated barcodes before deletion (for informational response)
	var barcodeCount int64
	err = tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM barcodes WHERE product_id = ?", id).Scan(&barcodeCount)
	if err != nil {
		return 0, err
	}

	// Delete the product — ON DELETE CASCADE will remove all linked barcodes
	res, err := tx.ExecContext(ctx, "DELETE FROM products WHERE id = ?", id)
	if err != nil {
		return 0, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	if affected == 0 {
		return 0, fmt.Errorf("product not found")
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return barcodeCount, nil
}

func (r *Repository) SearchBarcode(ctx context.Context, barcode string) (map[string]interface{}, error) {
	query := `
		SELECT p.product_type, p.brand, p.model, p.purchase_price, p.selling_price, b.serial, b.status
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.serial = ?
	`
	var pType, brand, model, serial, status string
	var pPrice, sPrice float64
	err := r.DB.QueryRowContext(ctx, query, barcode).Scan(&pType, &brand, &model, &pPrice, &sPrice, &serial, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("not found")
		}
		return nil, err
	}
	return map[string]interface{}{
		"inventoryItemId": serial, "productType": pType, "brand": brand,
		"model": model, "purchasePrice": pPrice, "sellingPrice": sPrice,
		"barcodeValue": serial, "status": status,
	}, nil
}

func (r *Repository) StageItem(ctx context.Context, sessionID, barcode string) (map[string]interface{}, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var pType, pBrand, pModel, status, existingSession sql.NullString
	var pPrice, sPrice sql.NullFloat64
	query := `
		SELECT b.status, b.checkout_session_id, p.product_type, p.brand, p.model, p.purchase_price, p.selling_price
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.serial = ?
	`
	err = tx.QueryRowContext(ctx, query, barcode).Scan(&status, &existingSession, &pType, &pBrand, &pModel, &pPrice, &sPrice)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("barcode not found")
		}
		return nil, err
	}

	if status.String == "STAGED" {
		if existingSession.String == sessionID {
			return map[string]interface{}{"sessionId": sessionID, "cartItemId": barcode, "inventoryItemId": barcode, "barcode": barcode, "status": "STAGED", "product": map[string]interface{}{"productType": pType.String, "brand": pBrand.String, "model": pModel.String, "purchasePrice": pPrice.Float64, "sellingPrice": sPrice.Float64}}, nil
		}
		return nil, fmt.Errorf("item staged elsewhere")
	}
	if status.String != "IN_STOCK" {
		return nil, fmt.Errorf("item not available")
	}

	res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'STAGED', checkout_session_id = ? WHERE serial = ? AND status = 'IN_STOCK'", sessionID, barcode)
	if err != nil {
		return nil, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return nil, fmt.Errorf("concurrency conflict")
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return map[string]interface{}{"sessionId": sessionID, "cartItemId": barcode, "inventoryItemId": barcode, "barcode": barcode, "status": "STAGED", "product": map[string]interface{}{"productType": pType.String, "brand": pBrand.String, "model": pModel.String, "purchasePrice": pPrice.Float64, "sellingPrice": sPrice.Float64}}, nil
}

func (r *Repository) GetStagedItems(ctx context.Context, sessionID string) ([]map[string]interface{}, error) {
	query := `
		SELECT b.serial, p.product_type, p.brand, p.model, p.purchase_price, p.selling_price
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.checkout_session_id = ? AND b.status = 'STAGED'
	`
	rows, err := r.DB.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var barcode, pType, pBrand, pModel sql.NullString
		var pPrice, sPrice sql.NullFloat64
		if err := rows.Scan(&barcode, &pType, &pBrand, &pModel, &pPrice, &sPrice); err != nil {
			return nil, err
		}
		items = append(items, map[string]interface{}{
			"sessionId":       sessionID,
			"cartItemId":      barcode.String,
			"inventoryItemId": barcode.String,
			"barcode":         barcode.String,
			"status":          "STAGED",
			"product": map[string]interface{}{
				"productType":   pType.String,
				"brand":         pBrand.String,
				"model":         pModel.String,
				"purchasePrice": pPrice.Float64,
				"sellingPrice":  sPrice.Float64,
			},
		})
	}

	if items == nil {
		items = []map[string]interface{}{}
	}
	return items, nil
}

func (r *Repository) UnstageItem(ctx context.Context, sessionID, barcode string) error {
	res, err := r.DB.ExecContext(ctx, "UPDATE barcodes SET status = 'IN_STOCK', checkout_session_id = NULL WHERE serial = ? AND checkout_session_id = ? AND status = 'STAGED'", barcode, sessionID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("item not found in cart")
	}
	return nil
}

func (r *Repository) CompleteCheckout(ctx context.Context, sessionID string, totalDiscount float64) (map[string]interface{}, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, "SELECT b.serial, p.selling_price FROM barcodes b JOIN products p ON b.product_id = p.id WHERE b.checkout_session_id = ? AND b.status = 'STAGED'", sessionID)
	if err != nil {
		return nil, err
	}

	type cartItem struct {
		serial       string
		sellingPrice float64
	}
	var items []cartItem
	var cartTotal float64

	for rows.Next() {
		var item cartItem
		if err := rows.Scan(&item.serial, &item.sellingPrice); err != nil {
			return nil, err
		}
		items = append(items, item)
		cartTotal += item.sellingPrice
	}
	rows.Close()
	if len(items) == 0 {
		return nil, fmt.Errorf("cart is empty")
	}

	for _, item := range items {
		var itemDiscount float64 = 0
		if cartTotal > 0 {
			itemDiscount = (item.sellingPrice / cartTotal) * totalDiscount
		}
		soldPrice := item.sellingPrice - itemDiscount

		res, err := tx.ExecContext(ctx, "UPDATE barcodes SET status = 'SOLD', sold_at = CURRENT_TIMESTAMP, sold_price = ? WHERE serial = ? AND status = 'STAGED'", soldPrice, item.serial)
		if err != nil {
			return nil, err
		}
		affected, _ := res.RowsAffected()
		if affected == 0 {
			return nil, fmt.Errorf("item %s no longer STAGED", item.serial)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]interface{}{"orderId": sessionID, "invoiceNumber": sessionID, "status": "COMPLETED", "inventoryItemsSold": len(items), "receiptPrintJobId": "receipt-print-job-id"}, nil
}

// GetSalesRecords fetches paginated sold items joining products and barcodes.
func (r *Repository) GetSalesRecords(ctx context.Context, limit, offset int) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			b.serial, b.batch_id, b.status, b.checkout_session_id, COALESCE(b.sold_at, b.created_at) as sold_at, COALESCE(b.sold_price, p.selling_price) as sold_price,
			p.product_type, p.brand, p.model, p.purchase_price, p.selling_price
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.status = 'SOLD'
		ORDER BY b.sold_at DESC, b.created_at DESC
		LIMIT ? OFFSET ?
	`
	rows, err := r.DB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []map[string]interface{}
	for rows.Next() {
		var serial, batchID, status, sessionID, soldAt, productType, brand, model string
		var pPrice, sPrice, soldPrice float64
		var rawSessionID sql.NullString
		if err := rows.Scan(&serial, &batchID, &status, &rawSessionID, &soldAt, &soldPrice, &productType, &brand, &model, &pPrice, &sPrice); err != nil {
			return nil, err
		}
		if rawSessionID.Valid {
			sessionID = rawSessionID.String
		}

		record := map[string]interface{}{
			"serial":       serial,
			"batchId":      batchID,
			"status":       status,
			"sessionId":    sessionID,
			"soldAt":       soldAt,
			"soldPrice":    soldPrice,
			"productType":  productType,
			"brand":        brand,
			"model":        model,
			"purchasePrice": pPrice,
			"sellingPrice": sPrice,
		}
		records = append(records, record)
	}
	if records == nil {
		records = make([]map[string]interface{}, 0)
	}
	return records, nil
}

// ExportAndPurgeSales fetches all sold records and deletes them permanently in a single transaction.
func (r *Repository) ExportAndPurgeSales(ctx context.Context) ([]map[string]interface{}, error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `
		SELECT 
			b.serial, b.batch_id, b.status, b.checkout_session_id, COALESCE(b.sold_at, b.created_at) as sold_at,
			p.product_type, p.brand, p.model, p.purchase_price, p.selling_price
		FROM barcodes b
		JOIN products p ON b.product_id = p.id
		WHERE b.status = 'SOLD'
		ORDER BY b.sold_at DESC, b.created_at DESC
	`
	rows, err := tx.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	var records []map[string]interface{}
	for rows.Next() {
		var serial, batchID, status, sessionID, soldAt, productType, brand, model string
		var pPrice, sPrice float64
		var rawSessionID sql.NullString
		if err := rows.Scan(&serial, &batchID, &status, &rawSessionID, &soldAt, &productType, &brand, &model, &pPrice, &sPrice); err != nil {
			rows.Close()
			return nil, err
		}
		if rawSessionID.Valid {
			sessionID = rawSessionID.String
		}

		record := map[string]interface{}{
			"serial":        serial,
			"batchId":       batchID,
			"status":        status,
			"sessionId":     sessionID,
			"soldAt":        soldAt,
			"productType":   productType,
			"brand":         brand,
			"model":         model,
			"purchasePrice": pPrice,
			"sellingPrice":  sPrice,
		}
		records = append(records, record)
	}
	rows.Close()

	if len(records) > 0 {
		_, err = tx.ExecContext(ctx, "DELETE FROM barcodes WHERE status = 'SOLD'")
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	if records == nil {
		records = make([]map[string]interface{}, 0)
	}
	return records, nil
}
