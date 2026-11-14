package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
//
// Both 50x25mm and 50x50mm labels use the same content (model, price, barcode,
// serial). For the larger 50x50mm label the font and barcode are scaled up so
// the barcode fills the full sticker, while keeping the barcode scannable
// (module width stays 3).
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

// GenerateWatchTagZPLPair builds a ZPL label with two 50x25mm stickers side by
// side on a single 100x25mm label. Each sticker keeps the standard layout and
// barcode size/quality (module width 3, height 70, font 30).
func GenerateWatchTagZPLPair(brand, model, price, serial1, serial2 string) string {
	zpl := fmt.Sprintf(`^XA
^PW800
^LL200
^FO10,32^A0N,30,30^FB250,1,0,L^FD%s^FS
^FO0,32^A0N,30,30^FB400,1,0,R^FD%s^FS
^FO10,68^BY3,3,70^BCN,70,N,N,N^FD%s^FS
^FO10,148^A0N,30,30^FD%s^FS
^FO410,32^A0N,30,30^FB250,1,0,L^FD%s^FS
^FO400,32^A0N,30,30^FB400,1,0,R^FD%s^FS
^FO410,68^BY3,3,70^BCN,70,N,N,N^FD%s^FS
^FO410,148^A0N,30,30^FD%s^FS
^XZ`,
		model, "Rs. "+price, serial1, serial1,
		model, "Rs. "+price, serial2, serial2,
	)
	return zpl
}

// GenerateWatchTagZPLSingleWide builds a 100x25mm label with a single sticker
// on the left half. Used for an odd number of serials so every page stays the
// same size (100x25mm) and the remaining sticker aligns on the next page.
func GenerateWatchTagZPLSingleWide(brand, model, price, serial string) string {
	zpl := fmt.Sprintf(`^XA
^PW800
^LL200
^FO10,32^A0N,30,30^FB250,1,0,L^FD%s^FS
^FO0,32^A0N,30,30^FB400,1,0,R^FD%s^FS
^FO10,68^BY3,3,70^BCN,70,N,N,N^FD%s^FS
^FO10,148^A0N,30,30^FD%s^FS
^XZ`,
		model, "Rs. "+price, serial, serial,
	)
	return zpl
}
