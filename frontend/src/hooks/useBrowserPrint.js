import { useState } from "react";

/**
 * Custom hook for printing ZPL using standard browser print dialog via Labelary
 */
export function useBrowserPrint() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerError, setPrinterError] = useState(null);

  const printZpl = async (zplString) => {
    setIsPrinting(true);
    setPrinterError(null);

    try {
      // 1. Request a multi-page PDF from Labelary
      const response = await fetch(
        "http://api.labelary.com/v1/printers/8dpmm/labels/2x1/",
        {
          method: "POST",
          headers: {
            Accept: "application/pdf",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: zplString,
        },
      );

      if (!response.ok) {
        throw new Error(`Labelary API failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);

      // 2. Open the PDF in a new tab so the user can use the native PDF print dialog
      // (Using a hidden iframe for PDFs often gets blocked or fails to print properly across different browsers)
      const printWindow = window.open(pdfUrl, "_blank");

      if (!printWindow) {
        // Fallback if popup blocker blocked it
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = "barcodes.pdf";
        a.click();
      }

      // Cleanup
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 10000);
    } catch (err) {
      console.error(err);
      setPrinterError(err.message);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  };

  return {
    isPrinting,
    printerError,
    printZpl,
  };
}
