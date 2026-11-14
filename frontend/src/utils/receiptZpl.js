/**
 * Generates a ZPL string for an A5 "Yuva Times Service Bill".
 * Layout follows the official bill template:
 *   - Business name / address / authorised brands at top
 *   - Document type: Service Bill
 *   - Invoice No + Date + Customer
 *   - Items table (Description | Qty | Rate | Amount)
 *   - Sub Total / Discount / TOTAL / paid
 *   - Signatory: For YUVA TIMES
 *   - Terms & Notes at bottom
 *
 * @param {Object} data
 * @param {string} data.storeName
 * @param {string} data.sessionId
 * @param {Array} data.items - Array of cart items (brand, model, sellingPrice, serial/barcode)
 * @param {number} data.subtotal
 * @param {number} data.discountAmount
 * @param {number} data.totalDue
 * @returns {{ zpl: string, size: string }}
 */

/** Convert a number to words (Indian numbering system: lakhs/crores). */
function numberToWords(num) {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
    "Eighty", "Ninety",
  ];

  const twoDigits = (n) => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  };

  const threeDigits = (n) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let result = "";
    if (hundred) result += ones[hundred] + " Hundred";
    if (rest) result += (result ? " " : "") + twoDigits(rest);
    return result;
  };

  if (num === 0) return "Zero";

  let result = "";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  if (crore) result += twoDigits(crore) + " Crore ";
  if (lakh) result += twoDigits(lakh) + " Lakh ";
  if (thousand) result += twoDigits(thousand) + " Thousand ";
  if (rest) result += threeDigits(rest);

  return result.trim();
}

export function generateReceiptZpl(data) {
  const { storeName, sessionId, items, subtotal, discountAmount, totalDue } = data;
  const now = new Date();

  // Format dates manually for ZPL
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });
  const dateStr = `${day}/${month}/${year} ${timeStr}`;

  // A5 Dimensions at 8dpmm (203 dpi)
  // Width: 5.83 inches -> ~1184 dots
  // Length: 8.27 inches -> ~1678 dots
  const pageWidth = 1184;
  const pageHeight = 1678;
  const contentWidth = 900;
  const marginX = Math.floor((pageWidth - contentWidth) / 2); // 142

  const rawId = sessionId.replace("pos-", "").replace(/-/g, "");
  const displayInvoiceNo = `INV${year}${month}${day}-${rawId.substring(0, 4).toUpperCase()}`;

  let zpl = `^XA
^LL${pageHeight}
^PW${pageWidth}

^FO0,60^A0N,60,60^FB${pageWidth},1,0,C^FD${storeName || "YUVA TIMES"}^FS
^FO0,135^A0N,30,30^FB${pageWidth},1,0,C^FDOpp. J.P. Hospital, B.H. Road, Nelamangala^FS
^FO0,175^A0N,28,28^FB${pageWidth},1,0,C^FDAuthorised Sales & Service For: TITAN, SONATA (A TATA Product), fastrack^FS

^FO0,235^A0N,40,40^FB${pageWidth},1,0,C^FDService Bill^FS

^FO${marginX},295^A0N,35,35^FDInvoice No: ${displayInvoiceNo}^FS
^FO${marginX},345^A0N,30,30^FDCustomer: WALK-IN CUSTOMER^FS
^FO${marginX + contentWidth - 400},345^A0N,30,30^FDDate: ${dateStr}^FS

^FO${marginX},395^GB${contentWidth},3,3^FS

^FO${marginX},415^A0N,30,30^FDDescription^FS
^FO${marginX + 520},415^A0N,30,30^FDQty^FS
^FO${marginX + 650},415^A0N,30,30^FDRate^FS
^FO${marginX + 800},415^A0N,30,30^FB100,1,0,R^FDAmount^FS
^FO${marginX},455^GB${contentWidth},3,3^FS
`;

  let currentY = 475;

  // Group identical items
  const groupedItems = {};
  items.forEach((item) => {
    const itemName = `${item.brand || "Item"} ${item.model || ""}`;
    const price = Number(item.sellingPrice || item.price || 0);
    const key = `${itemName}_${price}`;

    if (!groupedItems[key]) {
      groupedItems[key] = {
        name: itemName,
        price: price,
        qty: 0,
        barcodes: [],
      };
    }
    groupedItems[key].qty += 1;
    groupedItems[key].barcodes.push(
      (item.serial || item.barcode || "00000000").substring(0, 15),
    );
  });

  Object.values(groupedItems).forEach((gItem) => {
    const lineTotal = gItem.qty * gItem.price;
    // Description
    zpl += `^FO${marginX},${currentY}^A0N,28,28^FD${gItem.name.substring(0, 30).toUpperCase()}^FS\n`;
    // Qty
    zpl += `^FO${marginX + 520},${currentY}^A0N,28,28^FD${gItem.qty}^FS\n`;
    // Rate
    zpl += `^FO${marginX + 650},${currentY}^A0N,28,28^FD${gItem.price.toFixed(2)}^FS\n`;
    // Amount
    zpl += `^FO${marginX + 800},${currentY}^A0N,28,28^FB100,1,0,R^FD${lineTotal.toFixed(2)}^FS\n`;
    currentY += 40;
  });

  zpl += `^FO${marginX},${currentY}^GB${contentWidth},2,2^FS\n`;
  currentY += 30;

  const totalDiscount = Number(discountAmount || 0);

  // Totals section (right aligned)
  const labelX = marginX + contentWidth - 400;
  const valX = marginX + contentWidth - 150;
  const valWidth = 150;

  zpl += `^FO${labelX},${currentY}^A0N,30,30^FB250,1,0,R^FDSub Total^FS\n`;
  zpl += `^FO${valX},${currentY}^A0N,30,30^FB${valWidth},1,0,R^FD${Number(subtotal).toFixed(2)}^FS\n`;
  currentY += 40;

  zpl += `^FO${labelX},${currentY}^A0N,30,30^FB250,1,0,R^FDDiscount^FS\n`;
  zpl += `^FO${valX},${currentY}^A0N,30,30^FB${valWidth},1,0,R^FD-${totalDiscount.toFixed(2)}^FS\n`;
  currentY += 40;

  zpl += `^FO${labelX},${currentY}^A0N,35,35^FB250,1,0,R^FDTOTAL^FS\n`;
  zpl += `^FO${valX},${currentY}^A0N,35,35^FB${valWidth},1,0,R^FD${Number(totalDue).toFixed(2)}^FS\n`;
  currentY += 40;

  zpl += `^FO${labelX},${currentY}^A0N,30,30^FB250,1,0,R^FDpaid^FS\n`;
  zpl += `^FO${valX},${currentY}^A0N,30,30^FB${valWidth},1,0,R^FD${Number(totalDue).toFixed(2)}^FS\n`;
  currentY += 50;

  zpl += `^FO${marginX},${currentY}^GB${contentWidth},2,2^FS\n`;
  currentY += 30;

  // Amount in words
  const amountWords = `Rupees ${numberToWords(Math.floor(Number(totalDue)))} Only`;
  zpl += `^FO${marginX},${currentY}^A0N,28,28^FD${amountWords.substring(0, 60)}^FS\n`;
  currentY += 50;

  // Signatory
  zpl += `^FO${marginX + contentWidth - 300},${currentY}^A0N,28,28^FDFor YUVA TIMES^FS\n`;
  currentY += 60;

  // Terms & Notes
  zpl += `^FO${marginX},${currentY}^GB${contentWidth},2,2^FS\n`;
  currentY += 30;
  zpl += `^FO${marginX},${currentY}^A0N,25,25^FDTERMS & NOTES:^FS\n`;
  currentY += 35;
  zpl += `^FO${marginX},${currentY}^A0N,25,25^FDWarranty: Guaranteed for Serviced Watches 6 Months. One year for Battery^FS\n`;
  currentY += 30;
  zpl += `^FO${marginX},${currentY}^A0N,25,25^FDCollection Policy: Watch Given to Service Should Be taken within 3 Months^FS\n`;
  currentY += 30;
  zpl += `^FO${marginX},${currentY}^A0N,25,25^FDor Else After 3 Months Watch will not be Returned^FS\n`;
  currentY += 50;

  // Thank you
  zpl += `^FO0,${currentY}^A0N,30,30^FB${pageWidth},1,0,C^FDThank You ! Please Come Again !^FS\n`;

  zpl += `^XZ`;

  const size = `5.8x8.3`;

  return { zpl, size };
}
