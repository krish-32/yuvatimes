package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// Content (text size, barcode height/bar width, and spacing) scales with the
// label height so that larger labels (e.g. 50x50mm) get bigger barcode and
// text instead of just empty space. The base layout is designed for 25mm height.
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8

	// Scale factor relative to the 25mm base height.
	scale := float64(heightMM) / 25.0
	if scale < 1 {
		scale = 1
	}
	// Fonts grow more gently than the label (1.5x at 50mm).
	fontScale := 1 + (scale-1)*0.5

	topFont := int(30 * fontScale)
	bottomFont := topFont
	if topFont > 60 {
		topFont = 60
		bottomFont = 60
	}

	// Barcode: thicker bars and taller height on larger labels.
	barWidth := 3 + int(scale-1)
	barcodeHeight := int(70 * scale)
	if barcodeHeight > 140 {
		barcodeHeight = 140
	}

	// Vertical positions scale with the label height.
	topY := int(32 * scale)
	barcodeY := int(68 * scale)
	bottomY := int(148 * scale)

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
