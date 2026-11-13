package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 48x23mm at 203 dpi (8 dpmm) = 384x184 dots.
	// Standard barcode label layout (block shifted 3mm / 24 dots down):
	//   - Model number (top-left) and price (top-right)
	//   - Barcode encodes the serial number (thicker bars, reduced height)
	//   - Serial number printed below the barcode as the human-readable line
	zpl := `^XA
^PW384
^LL184
^FO10,32^A0N,30,30^FB250,1,0,L^FD%s^FS
^FO0,32^A0N,30,30^FB384,1,0,R^FD%s^FS
^FO10,68^BY3,3,70^BCN,70,N,N,N^FD%s^FS
^FO10,148^A0N,30,30^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, model, "Rs. "+price, serial, serial)
}
