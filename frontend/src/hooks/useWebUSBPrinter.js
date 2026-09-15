import { useState } from 'react';

/**
 * Custom hook to abstract WebUSB printing logic for ZPL strings.
 */
export function useWebUSBPrinter() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerError, setPrinterError] = useState(null);

  const printZplWithUsb = async (zplString) => {
    // 1. Safety check for WebUSB support
    if (!('usb' in navigator)) {
      setPrinterError('WebUSB is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    setIsPrinting(true);
    setPrinterError(null);

    try {
      // 2. Request device selection from the user
      const device = await navigator.usb.requestDevice({
        filters: [{ classCode: 7 }], // 7 is the USB class code for Printers
      });

      // 3. Connect and configure
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      // 4. Find the correct bulk OUT endpoint
      const interfaceData = device.configuration.interfaces[0].alternates[0];
      const endpoint = interfaceData.endpoints.find(
        (e) => e.direction === 'out' && e.type === 'bulk'
      );

      if (!endpoint) {
        throw new Error('No bulk OUT endpoint found on the selected USB device.');
      }

      // 5. Encode ZPL string to bytes and transfer
      const encoder = new TextEncoder();
      const data = encoder.encode(zplString);

      const result = await device.transferOut(endpoint.endpointNumber, data);
      
      if (result.status !== 'ok') {
        throw new Error('USB transfer failed with status: ' + result.status);
      }
    } catch (err) {
      setPrinterError(err.message);
      throw err;
    } finally {
      setIsPrinting(false);
    }
  };

  return {
    isPrinting,
    printerError,
    printZplWithUsb,
  };
}
