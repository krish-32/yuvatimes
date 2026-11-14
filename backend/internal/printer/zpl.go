package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// The content is the same for both sticker sizes (model/price, barcode, serial).
// For the larger 50x50mm label the font and barcode are scaled up to fill the
// full sticker, while keeping the barcode scannable (module width stays 3).
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8

	// Standard layout values (50x25mm).
	topFont := 30
	bottomFont := 30
	barWidth := 3
	barcodeHeight := 70
	topY := 32
	barcodeY := 68
	bottomY := 148

	// For 50x50mm, scale up the font and barcode to fill the sticker.
	if heightMM > 25 {
		topFont = 50
		bottomFont = 50
		barWidth = 3
		barcodeHeight = 200
		topY = 40
		barcodeY = 110
		bottomY = 330
	}

	// Standard barcode label layout:
	//   - Model number (top-left) and price (top-right)
	//   - Barcode encodes the serial number (scannable, scaled for 50x50)
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
