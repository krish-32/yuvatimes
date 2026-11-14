package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// Both 50x25mm and 50x50mm labels use the same layout:
// model, price, barcode and serial.
// The vertical layout and barcode height scale with label height.
// Text size and barcode width remain unchanged.
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8

	// Scale vertical positions according to label height.
	// The original 50x25mm layout is the reference.
	verticalScale := float64(heightMM) / 25.0

	scaleY := func(value int) int {
		return int(float64(value)*verticalScale + 0.5)
	}

	// Standard layout values.
	topFont := 30
	bottomFont := 30
	barWidth := 3

	barcodeHeight := scaleY(70)
	topY := scaleY(32)
	barcodeY := scaleY(68)
	bottomY := scaleY(148)

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

	zpl += "^XZ"

	return zpl
}
