package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// The 25mm-height layout is the base and is kept unchanged. For the 50x50mm
// label the barcode uses the proven scannable parameters (module width 2,
// height 180, interpretation line Y) so it covers the full sticker and scans.
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
	interpretationLine := "N"

	if scale > 1 {
		// 50x50mm layout aligned with the working/scannable example:
		// module width 2, barcode height 180, interpretation line Y.
		topFont = 40
		bottomFont = 40
		barWidth = 2
		barcodeHeight = 180
		topY = 40
		barcodeY = 80
		bottomY = 280
		interpretationLine = "Y"
	}

	// Standard barcode label layout:
	//   - Model number (top-left) and price (top-right)
	//   - Barcode encodes the serial number (scannable, fills the sticker)
	//   - Serial number printed below the barcode (interpretation line on 50x50)
	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO0,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO10,%d^BY%d,3,%d^BCN,%d,%s,N,N^FD%s^FS
^FO10,%d^A0N,%d,%d^FD%s^FS
^XZ`,
		width, height,
		topY, topFont, topFont, model,
		topY, topFont, topFont, width, "Rs. "+price,
		barcodeY, barWidth, barcodeHeight, barcodeHeight, interpretationLine, serial,
		bottomY, bottomFont, bottomFont, serial,
	)
	return zpl
}
