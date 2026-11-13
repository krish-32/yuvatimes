package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// The 25mm-height layout is the base and is kept unchanged. For larger labels
// (e.g. 50x50mm) the text, barcode height/bar width, and spacing scale up so
// the barcode fills the full sticker instead of leaving empty space.
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8

	// Scale factor relative to the 25mm base height.
	scale := float64(heightMM) / 25.0
	if scale < 1 {
		scale = 1
	}

	// Base 25mm layout values (kept identical for 50x25mm).
	topFont := 30
	bottomFont := 30
	barWidth := 3
	barcodeHeight := 70
	topY := 32
	barcodeY := 68
	bottomY := 148

	if scale > 1 {
		// Scale up content for larger labels so the barcode fills the sticker.
		fontScale := 1 + (scale-1)*0.6
		topFont = int(30 * fontScale)
		bottomFont = topFont
		barWidth = 3 + int(scale-1)
		barcodeHeight = int(70 * scale * 1.4)
		topY = int(32 * scale)
		barcodeY = int(68 * scale)
		bottomY = barcodeY + barcodeHeight + 20

		// Ensure the content fits within the label height.
		if bottomY+bottomFont > height {
			barcodeHeight = height - barcodeY - bottomFont - 20
			if barcodeHeight < 10 {
				barcodeHeight = 10
			}
			bottomY = barcodeY + barcodeHeight + 20
		}
	}

	// Standard barcode label layout:
	//   - Model number (top-left) and price (top-right)
	//   - Barcode encodes the serial number (thicker bars, scaled height)
	//   - Serial number printed below the barcode as the human-readable line
	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO0,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO10,%d^BY%d,3,%d^BCN,%d,N,N,N^FD%s^FS
^FO10,%d^A0N,%d,%d^FD%s^FS
^XZ`,
		width, height,
		topY, topFont, topFont, model,
		topY, topFont, topFont, width, "Rs. "+price,
		barcodeY, barWidth, barcodeHeight, barcodeHeight, serial,
		bottomY, bottomFont, bottomFont, serial,
	)
	return zpl
}
