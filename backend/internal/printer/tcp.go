package printer

import (
	"fmt"
	"net"
	"time"
)

func SendZPLToPrinter(ip string, payload string) error {
	address := fmt.Sprintf("%s:9100", ip)
	conn, err := net.DialTimeout("tcp", address, 5*time.Second)
	if err != nil {
		return fmt.Errorf("failed to connect to printer at %s: %w", address, err)
	}
	defer conn.Close()

	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))

	_, err = conn.Write([]byte(payload))
	if err != nil {
		return fmt.Errorf("failed to write payload to printer: %w", err)
	}
	return nil
}
