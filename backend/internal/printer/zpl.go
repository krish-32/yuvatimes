package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// The 50x25mm label keeps the standard layout (model/price, barcode, serial).
// The 50x50mm label uses the same barcode but adds extra detail text below it
// (brand, model, price, serial) to make use of the larger sticker space.
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8

	// Standard layout values (identical for both sizes).
	topFont := 30
	bottomFont := 30
	barWidth := 3
	barcodeHeight := 70
	topY := 32
	barcodeY := 68
	bottomY := 148

	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO0,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO10,%d^BY%d,3,%d^BCN,%d,N,N,N^FD%s^FS
^FO10,%d^A0N,%d,%d^FD%s^FS
`,
		width, height,
		topY, topFont, topFont, model,
		topY, topFont, topFont, width, "Rs. "+price,
		barcodeY, barWidth, barcodeHeight, barcodeHeight, serial,
		bottomY, bottomFont, bottomFont, serial)

	// For larger labels (50x50mm), add more detail text below the barcode.
	if heightMM > 25 {
		detailY := bottomY + 50
		zpl += fmt.Sprintf(`^FO10,%d^A0N,28,28^FDBrand: %s^FS
^FO10,%d^A0N,28,28^FDModel: %s^FS
^FO10,%d^A0N,28,28^FDPrice: Rs. %s^FS
^FO10,%d^A0N,28,28^FDSerial: %s^FS
`,
			detailY, brand,
			detailY+40, model,
			detailY+80, price,
			detailY+120, serial)
	}

	zpl += "^XZ"
	return zpl
}
