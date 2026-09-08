package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 400x200 dots (50x25mm), Printable area: 40,40 to 360,160 (40x15mm)
	zpl := `^XA
^PW400
^LL200
^FO40,40^A0N,25,25^FD%s - %s^FS
^FO40,75^A0N,25,25^FD%s^FS
^FO40,110^BCN,50,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, brand, model, price, serial)
}
