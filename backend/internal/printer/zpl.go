package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 400x200 dots (50x25mm), Printable area: 40,40 to 360,160 (40x15mm)
	// ^FB320,1,0,C auto-centers the text within the 320 dot printable width
	zpl := `^XA
^PW400
^LL200
^FO40,40^A0N,20,20^FB320,1,0,C^FD%s - %s^FS
^FO40,65^A0N,20,20^FB320,1,0,C^FD%s^FS
^FO80,95^BCN,50,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, brand, model, price, serial)
}
