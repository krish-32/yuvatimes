package printer

import "fmt"

// watchLayout holds the layout values for a single sticker.
type watchLayout struct {
	topFont, bottomFont, barWidth, barcodeHeight, topY, barcodeY, bottomY int
}

// layoutFor returns the layout for a given label height (mm).
// 48x24mm uses the small layout; 48x48mm uses the large layout.
func layoutFor(heightMM int) watchLayout {
	if heightMM > 24 {
		return watchLayout{50, 50, 3, 200, 40, 110, 330}
	}
	return watchLayout{30, 30, 3, 70, 32, 68, 148}
}

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8
	l := layoutFor(heightMM)

	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO0,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO10,%d^BY%d,3,%d^BCN,%d,N,N,N^FD%s^FS
^FO10,%d^A0N,%d,%d^FD%s^FS
^XZ`,
		width, height,
		l.topY, l.topFont, l.topFont, model,
		l.topY, l.topFont, l.topFont, width, "Rs. "+price,
		l.barcodeY, l.barWidth, l.barcodeHeight, l.barcodeHeight, serial,
		l.bottomY, l.bottomFont, l.bottomFont, serial,
	)
	return zpl
}

// GenerateWatchTagZPLPair builds a ZPL label with two stickers side by side on
// a single (2x width) x height label. Each sticker keeps the standard layout
// and barcode size/quality for the given height.
func GenerateWatchTagZPLPair(brand, model, price, serial1, serial2 string, widthMM, heightMM int) string {
	stickerWidth := widthMM * 8
	totalWidth := widthMM * 2 * 8
	height := heightMM * 8
	l := layoutFor(heightMM)

	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO0,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO10,%d^BY%d,3,%d^BCN,%d,N,N,N^FD%s^FS
^FO10,%d^A0N,%d,%d^FD%s^FS
^FO%d,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO%d,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO%d,%d^BY%d,3,%d^BCN,%d,N,N,N^FD%s^FS
^FO%d,%d^A0N,%d,%d^FD%s^FS
^XZ`,
		totalWidth, height,
		l.topY, l.topFont, l.topFont, model,
		l.topY, l.topFont, l.topFont, stickerWidth, "Rs. "+price,
		l.barcodeY, l.barWidth, l.barcodeHeight, l.barcodeHeight, serial1,
		l.bottomY, l.bottomFont, l.bottomFont, serial1,
		stickerWidth+10, l.topY, l.topFont, l.topFont, model,
		stickerWidth, l.topY, l.topFont, l.topFont, stickerWidth, "Rs. "+price,
		stickerWidth+10, l.barcodeY, l.barWidth, l.barcodeHeight, l.barcodeHeight, serial2,
		stickerWidth+10, l.bottomY, l.bottomFont, l.bottomFont, serial2,
	)
	return zpl
}

// GenerateWatchTagZPLSingleWide builds a (2x width) x height label with a
// single sticker on the left half. Used for an odd number of serials so every
// page stays the same size and the remaining sticker aligns on the next page.
func GenerateWatchTagZPLSingleWide(brand, model, price, serial string, widthMM, heightMM int) string {
	stickerWidth := widthMM * 8
	totalWidth := widthMM * 2 * 8
	height := heightMM * 8
	l := layoutFor(heightMM)

	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,%d^A0N,%d,%d^FB250,1,0,L^FD%s^FS
^FO0,%d^A0N,%d,%d^FB%d,1,0,R^FD%s^FS
^FO10,%d^BY%d,3,%d^BCN,%d,N,N,N^FD%s^FS
^FO10,%d^A0N,%d,%d^FD%s^FS
^XZ`,
		totalWidth, height,
		l.topY, l.topFont, l.topFont, model,
		l.topY, l.topFont, l.topFont, stickerWidth, "Rs. "+price,
		l.barcodeY, l.barWidth, l.barcodeHeight, l.barcodeHeight, serial,
		l.bottomY, l.bottomFont, l.bottomFont, serial,
	)
	return zpl
}
