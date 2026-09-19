import { useState } from 'react';

/**
 * Custom hook for printing ZPL via standard WebUSB API
 */
export function useWebUSBPrinter() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerError, setPrinterError] = useState(null);

  const printZplWithUsb = async (fetchZplFn) => {
    setIsPrinting(true);
    setPrinterError(null);

    if (!navigator.usb) {
      const errorMsg = 'WebUSB is not supported by your browser. Please use Chrome or Edge.';
      setPrinterError(errorMsg);
      setIsPrinting(false);
      throw new Error(errorMsg);
    }

    try {
      let device;
      
      // 1a. Check if the user has ALREADY granted permission previously
      const existingDevices = await navigator.usb.getDevices();
      if (existingDevices.length > 0) {
        // Automatically use the previously authorized printer without a popup!
        device = existingDevices[0];
      } else {
        // 1b. Prompt user to select a USB printer (shows browser popup once)
        device = await navigator.usb.requestDevice({
          filters: [{ classCode: 7 }] // USB Printer Class
        });
      }

      // 2. Now that we have the device permission, we can safely wait for the network to fetch the ZPL
      const zplString = await fetchZplFn();

      await device.open();
      
      // Select the first configuration
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim the first available interface
      const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
      await device.claimInterface(interfaceNumber);

      // Find the bulk OUT endpoint to send data
      const endpoint = device.configuration.interfaces[0].alternate.endpoints.find(
        (ep) => ep.direction === 'out' && ep.type === 'bulk'
      );

      if (!endpoint) {
        throw new Error('No compatible bulk OUT endpoint found on this printer.');
      }

      // Convert the ZPL string into a byte array
      const encoder = new TextEncoder();
      const data = encoder.encode(zplString);

      // Send the ZPL data to the printer
      const result = await device.transferOut(endpoint.endpointNumber, data);

      if (result.status !== 'ok') {
        throw new Error(`USB Transfer failed with status: ${result.status}`);
      }

      await device.close();
    } catch (err) {
      console.error('WebUSB Error:', err);
      
      let errorMessage = err.message;
      if (errorMessage.includes('Failed to claim interface')) {
        errorMessage = 'Failed to claim interface. On Ubuntu, you must run: sudo rmmod usblp (or unbind the printer) because the OS driver is blocking WebUSB.';
      }
      
      setPrinterError(errorMessage);
      throw new Error(errorMessage);
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
