package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 48x23mm at 203 dpi (8 dpmm) = 384x184 dots.
	// Label contains only a large barcode; the serial number is printed as the
	// human-readable interpretation line directly beneath the barcode (^BC ... Y).
	// Position: shifted 0.4cm down (y=15+32=47) and left to the 1mm quiet zone
	// (x=8) since a full 1cm left shift from x=70 would run off the label edge.
	zpl := `^XA
^PW384
^LL184
^FO8,47^BCN,120,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, serial)
}
