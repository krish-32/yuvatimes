package printer

import "fmt"

// GenerateWatchTagZPL builds a ZPL label for a watch/clock barcode sticker.
// widthMM and heightMM define the physical label size in millimetres.
// At 203 dpi (8 dpmm), dots = mm * 8.
func GenerateWatchTagZPL(brand, model, price, serial string, widthMM, heightMM int) string {
	width := widthMM * 8
	height := heightMM * 8
	// Standard barcode label layout (block shifted 3mm / 24 dots down):
	//   - Model number (top-left) and price (top-right)
	//   - Barcode encodes the serial number (thicker bars, reduced height)
	//   - Serial number printed below the barcode as the human-readable line
	zpl := fmt.Sprintf(`^XA
^PW%d
^LL%d
^FO10,32^A0N,30,30^FB250,1,0,L^FD%s^FS
^FO0,32^A0N,30,30^FB%d,1,0,R^FD%s^FS
^FO10,68^BY3,3,70^BCN,70,N,N,N^FD%s^FS
^FO10,148^A0N,30,30^FD%s^FS
^XZ`, width, height, model, width, "Rs. "+price, serial, serial)
	return zpl
}
