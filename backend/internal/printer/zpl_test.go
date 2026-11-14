package printer

import (
	"fmt"
	"strings"
	"testing"
)

func TestGenerateWatchTagZPL_LabelDimensions(t *testing.T) {
	tests := []struct {
		name       string
		widthMM    int
		heightMM   int
		wantWidth  int
		wantHeight int
		wantBarH   int
	}{
		{
			name:       "50x25mm",
			widthMM:    50,
			heightMM:   25,
			wantWidth:  400,
			wantHeight: 200,
			wantBarH:   70,
		},
		{
			name:       "50x50mm",
			widthMM:    50,
			heightMM:   50,
			wantWidth:  400,
			wantHeight: 400,
			wantBarH:   140,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			zpl := GenerateWatchTagZPL(
				"TestBrand",
				"TestModel",
				"1500",
				"SN123456",
				tt.widthMM,
				tt.heightMM,
			)

			expectedWidth := fmt.Sprintf("^PW%d", tt.wantWidth)
			expectedHeight := fmt.Sprintf("^LL%d", tt.wantHeight)
			expectedBarcodeHeight := fmt.Sprintf(
				"^BCN,%d,N,N,N",
				tt.wantBarH,
			)

			if !strings.Contains(zpl, expectedWidth) {
				t.Errorf("expected print width %s", expectedWidth)
			}

			if !strings.Contains(zpl, expectedHeight) {
				t.Errorf("expected label length %s", expectedHeight)
			}

			if !strings.Contains(zpl, expectedBarcodeHeight) {
				t.Errorf("expected barcode height %s", expectedBarcodeHeight)
			}
		})
	}
}

func TestGenerateWatchTagZPL_SameContentForBothSizes(t *testing.T) {
	small := GenerateWatchTagZPL(
		"TestBrand",
		"TestModel",
		"1500",
		"SN123456",
		50,
		25,
	)

	large := GenerateWatchTagZPL(
		"TestBrand",
		"TestModel",
		"1500",
		"SN123456",
		50,
		50,
	)

	expectedFields := []string{
		"TestModel",
		"Rs. 1500",
		"SN123456",
	}

	for _, field := range expectedFields {
		if !strings.Contains(small, field) {
			t.Errorf("50x25 label missing field: %s", field)
		}

		if !strings.Contains(large, field) {
			t.Errorf("50x50 label missing field: %s", field)
		}
	}

	if strings.Count(small, "^BCN,") != 1 {
		t.Errorf("50x25 label should contain exactly one barcode")
	}

	if strings.Count(large, "^BCN,") != 1 {
		t.Errorf("50x50 label should contain exactly one barcode")
	}

	unwantedFields := []string{
		"Brand:",
		"Model:",
		"Price:",
		"Serial:",
	}

	for _, field := range unwantedFields {
		if strings.Contains(large, field) {
			t.Errorf("unexpected additional detail field: %s", field)
		}
	}
}
