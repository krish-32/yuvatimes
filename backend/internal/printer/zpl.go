package printer

import "fmt"

func GenerateWatchTagZPL(brand, model, price, serial string) string {
	// 48x23mm at 203 dpi (8 dpmm) = 384x184 dots.
	// ^FB304,1,0,C auto-centers text within a 304-dot block starting at x=40.
	zpl := `^XA
^PW384
^LL184
^FO40,20^A0N,20,20^FB304,1,0,C^FD%s - %s^FS
^FO40,44^A0N,20,20^FB304,1,0,C^FD%s^FS
^FO70,70^BCN,56,Y,N,N^FD%s^FS
^XZ`
	return fmt.Sprintf(zpl, brand, model, price, serial)
}
