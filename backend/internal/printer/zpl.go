package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 400x120 dots, 203 DPI approx 50x15mm
	zpl := `^XA
^PW400
^LL120
^FO10,5^A0N,20,20^FD%s - %s^FS
^FO10,30^A0N,20,20^FD%s^FS
^FO10,55^BCN,45,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, brand, model, price, serial)
}
