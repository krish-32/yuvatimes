/**
 * Generates a ZPL string for a standard continuous thermal receipt.
 * @param {Object} data 
 * @param {string} data.storeName
 * @param {string} data.sessionId
 * @param {Array} data.items - Array of cart items (brand, model, sellingPrice)
 * @param {number} data.subtotal
 * @param {number} data.discountAmount
 * @param {number} data.totalDue
 * @returns {string} ZPL command string
 */
export function generateReceiptZpl(data) {
  const { storeName, sessionId, items, subtotal, discountAmount, totalDue } = data;
  const now = new Date();
  
  // Format dates manually for ZPL
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
  const dateStr = `${day}/${month}/${year} ${timeStr}`;

  // A5 Dimensions at 8dpmm (203 dpi)
  // Width: 5.83 inches -> ~1184 dots
  // Length: 8.27 inches -> ~1678 dots
  const pageWidth = 1184;
  const pageHeight = 1678;
  const contentWidth = 900;
  const marginX = Math.floor((pageWidth - contentWidth) / 2); // 142
  
  const rawId = sessionId.replace('pos-', '').replace(/-/g, '');
  const displayInvoiceNo = `INV${year}${month}${day}-${rawId.substring(0, 4).toUpperCase()}`;

  let zpl = `^XA
^LL${pageHeight}
^PW${pageWidth}

^FO0,50^A0N,50,50^FB${pageWidth},1,0,C^FD${storeName || "YUVATIME PREMIUM WATCHES"}^FS
^FO0,110^A0N,30,30^FB${pageWidth},1,0,C^FDMain Street, Downtown Area, City^FS
^FO0,150^A0N,30,30^FB${pageWidth},1,0,C^FDTEL: +91 98765 43210^FS

^FO${marginX},210^A0N,35,35^FDInvoice No: ${displayInvoiceNo}^FS

^FO${marginX},260^GB${contentWidth},3,3^FS

^FO${marginX},290^A0N,30,30^FD000000(WALK-IN CUSTOMER)^FS
^FO${marginX + contentWidth - 100},290^A0N,30,30^FD001^FS
^FO${marginX},330^A0N,30,30^FDCashier: Admin^FS
^FO${marginX + contentWidth - 300},330^A0N,30,30^FD${dateStr}^FS

^FO${marginX},380^GB${contentWidth},3,3^FS
`;

  let currentY = 410;

  // Group identical items
  const groupedItems = {};
  items.forEach(item => {
    const itemName = `${item.brand || 'Item'} ${item.model || ''}`;
    const price = Number(item.sellingPrice || item.price || 0);
    const key = `${itemName}_${price}`;
    
    if (!groupedItems[key]) {
      groupedItems[key] = {
        name: itemName,
        price: price,
        qty: 0,
        barcodes: []
      };
    }
    groupedItems[key].qty += 1;
    groupedItems[key].barcodes.push((item.serial || item.barcode || "00000000").substring(0, 15));
  });

  Object.values(groupedItems).forEach((gItem) => {
    // Line 1: Item Name (Brand + Model)
    zpl += `^FO${marginX},${currentY}^A0N,30,30^FD${gItem.name.substring(0, 40).toUpperCase()}^FS\n`;
    currentY += 40;
    
    // Line 2: Barcode(s), Qty x Price, Total
    const barcodeStr = gItem.qty > 1 ? `${gItem.barcodes[0]}...` : gItem.barcodes[0];
    zpl += `^FO${marginX + 20},${currentY}^A0N,30,30^FD${barcodeStr} UNT^FS\n`;
    
    // Middle alignment for Qty x Price
    zpl += `^FO${marginX + 450},${currentY}^A0N,30,30^FD${gItem.qty}x${gItem.price.toFixed(2)}^FS\n`;
    
    // Right alignment for Total
    const lineTotal = gItem.qty * gItem.price;
    zpl += `^FO${marginX + contentWidth - 200},${currentY}^A0N,30,30^FB200,1,0,R^FD${lineTotal.toFixed(2)}^FS\n`;
    
    currentY += 50;
  });

  zpl += `^FO${marginX},${currentY}^GB${contentWidth},2,2^FS\n`;
  currentY += 40;

  const totalDiscount = Number(discountAmount || 0);
  
  // Left column summary
  zpl += `^FO${marginX},${currentY}^A0N,30,30^FDItem ${items.length}^FS\n`;
  zpl += `^FO${marginX},${currentY + 40}^A0N,30,30^FDQty ${items.length}^FS\n`;
  zpl += `^FO${marginX},${currentY + 80}^A0N,30,30^FDSaving ${totalDiscount.toFixed(2)}^FS\n`;
  
  // Right column summary (totals)
  const summaryRightX = marginX + contentWidth - 350;
  const summaryRightWidth = 200;
  const summaryValWidth = 150;
  const summaryValX = marginX + contentWidth - 150;
  
  zpl += `^FO${summaryRightX},${currentY}^A0N,30,30^FB${summaryRightWidth},1,0,R^FDSubTotal^FS\n`;
  zpl += `^FO${summaryValX},${currentY}^A0N,30,30^FB${summaryValWidth},1,0,R^FD${Number(subtotal).toFixed(2)}^FS\n`;
  
  zpl += `^FO${summaryRightX},${currentY + 40}^A0N,30,30^FB${summaryRightWidth},1,0,R^FDSpec.Disc^FS\n`;
  zpl += `^FO${summaryValX},${currentY + 40}^A0N,30,30^FB${summaryValWidth},1,0,R^FD${totalDiscount.toFixed(2)}^FS\n`;
  
  zpl += `^FO${summaryRightX},${currentY + 80}^A0N,30,30^FB${summaryRightWidth},1,0,R^FDRounding^FS\n`;
  zpl += `^FO${summaryValX},${currentY + 80}^A0N,30,30^FB${summaryValWidth},1,0,R^FD0.00^FS\n`;
  
  zpl += `^FO${summaryRightX},${currentY + 120}^A0N,35,35^FB${summaryRightWidth},1,0,R^FDTotal^FS\n`;
  zpl += `^FO${summaryValX},${currentY + 120}^A0N,35,35^FB${summaryValWidth},1,0,R^FD${Number(totalDue).toFixed(2)}^FS\n`;
  
  zpl += `^FO${summaryRightX},${currentY + 160}^A0N,30,30^FB${summaryRightWidth},1,0,R^FDCASH^FS\n`;
  zpl += `^FO${summaryValX},${currentY + 160}^A0N,30,30^FB${summaryValWidth},1,0,R^FD${Number(totalDue).toFixed(2)}^FS\n`;
  
  zpl += `^FO${summaryRightX},${currentY + 200}^A0N,30,30^FB${summaryRightWidth},1,0,R^FDChange^FS\n`;
  zpl += `^FO${summaryValX},${currentY + 200}^A0N,30,30^FB${summaryValWidth},1,0,R^FD0.00^FS\n`;

  currentY += 260;
  
  zpl += `^FO${marginX},${currentY}^GB${contentWidth},2,2^FS\n`;
  currentY += 40;

  // Barcode footer block
  zpl += `^FO0,${currentY}^A0N,30,30^FB${pageWidth},1,0,C^FD${dateStr}^FS\n`;
  currentY += 50;
  
  // Center the barcode: Barcode width is roughly 400 dots.
  const barcodeX = Math.floor((pageWidth - 400) / 2);
  zpl += `^FO${barcodeX},${currentY}^BY2,2,100^BCN,100,N,N,N^FD${sessionId.substring(0, 15)}^FS\n`;
  currentY += 130;
  
  zpl += `^FO0,${currentY}^A0N,30,30^FB${pageWidth},1,0,C^FDThank You ! Please Come Again !^FS\n`;
  currentY += 40;
  zpl += `^FO0,${currentY}^A0N,30,30^FB${pageWidth},1,0,C^FDWARRANTY: 1 YEAR (MANUFACTURER)^FS\n`;
  currentY += 35;
  zpl += `^FO0,${currentY}^A0N,25,25^FB${pageWidth},1,0,C^FDGoods Sold Are Not Returnable^FS\n`;
  
  zpl += `^XZ`;

  const size = `5.8x8.3`;

  return { zpl, size };
}
