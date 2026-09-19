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

      // 2. Create a hidden iframe to hold the PDF
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = pdfUrl;
      
      // 3. Wait for the PDF to load into the iframe, then trigger print dialog
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
        }, 500); // Small delay to ensure PDF plugin is fully initialized
      };
      
      document.body.appendChild(iframe);

      // 4. Cleanup the iframe after printing dialog closes (approximate wait)
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      }, 15000); 
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
