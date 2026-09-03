package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 400x120 dots, 203 DPI approx 50x15mm
	zpl := `^XA
^PW400
^LL120
^FO10,10^A0N,20,20^FD%s^FS
^FO10,35^A0N,20,20^FD%s^FS
^FO10,60^A0N,20,20^FD%s^FS
^BY1
^FO160,15^BCN,60,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, brand, model, price, serial)
}
