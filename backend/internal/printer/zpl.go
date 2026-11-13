package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 48x23mm at 203 dpi (8 dpmm) = 384x184 dots.
	// Standard barcode label layout:
	//   - Model number printed above the barcode (bold, readable text)
	//   - Barcode encodes the serial number (thicker bars, reduced height)
	//   - Serial number printed below the barcode as the human-readable line
	zpl := `^XA
^PW384
^LL184
^FO10,8^A0N,30,30^FD%s^FS
^FO10,44^BY3,3,80^BCN,80,N,N,N^FD%s^FS
^FO10,136^A0N,30,30^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, model, serial, serial)
}
