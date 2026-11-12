package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 48x23mm at 203 dpi (8 dpmm) = 384x184 dots.
	// Label contains only a large barcode; the serial number is printed as the
	// human-readable interpretation line directly beneath the barcode (^BC ... Y).
	zpl := `^XA
^PW384
^LL184
^FO70,15^BCN,120,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, serial)
}
