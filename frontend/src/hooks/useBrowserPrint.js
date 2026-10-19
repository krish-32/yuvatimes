import { useState, useRef, useEffect } from "react";

/**
 * Custom hook for printing ZPL using standard browser print dialog via Labelary
 */
export function useBrowserPrint() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerError, setPrinterError] = useState(null);
  const iframeRef = useRef(null);
  const cleanupTimerRef = useRef(null);

  // Cleanup iframe and timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
      if (iframeRef.current) {
        const src = iframeRef.current.src;
        iframeRef.current.remove();
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
        iframeRef.current = null;
      }
    };
  }, []);

  const printZpl = async (zplString, size = "2x1") => {
    setIsPrinting(true);
    setPrinterError(null);

    try {
      // Clean up any previous iframe before creating a new one
      if (iframeRef.current) {
        const prevSrc = iframeRef.current.src;
        iframeRef.current.remove();
        if (prevSrc.startsWith("blob:")) URL.revokeObjectURL(prevSrc);
        iframeRef.current = null;
      }
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);

      // 1. Request a multi-page PDF from Labelary
      const response = await fetch(
        `https://api.labelary.com/v1/printers/8dpmm/labels/${size}/`,
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
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = pdfUrl;
      iframeRef.current = iframe;

      // 3. Wait for the PDF to load into the iframe, then trigger print dialog
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch {
            // Cross-origin or blocked print dialog — silently ignore
          }
        }, 500);
      };

      document.body.appendChild(iframe);

      // 4. Cleanup the iframe after printing dialog closes
      cleanupTimerRef.current = setTimeout(() => {
        if (iframeRef.current === iframe) {
          iframe.remove();
          URL.revokeObjectURL(pdfUrl);
          iframeRef.current = null;
        }
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
