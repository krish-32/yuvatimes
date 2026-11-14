/**
 * Utilities for converting ZPL to a PDF or PNG image (via Labelary) and
 * sharing the resulting file to third-party apps on the user's device using
 * the Web Share API (navigator.share).
 */

const LABELARY_URL = "https://api.labelary.com/v1/printers/8dpmm/labels/";

/**
 * Convert a ZPL string to a PDF Blob via the Labelary rendering API.
 * @param {string} zpl - The ZPL command string.
 * @param {string} [size="2x1"] - Label size in inches (WxH), e.g. "2x1".
 * @returns {Promise<Blob>} The rendered PDF as a Blob.
 */
export async function zplToPdfBlob(zpl, size = "2x1") {
  const response = await fetch(`${LABELARY_URL}${size}/`, {
    method: "POST",
    headers: {
      Accept: "application/pdf",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: zpl,
  });

  if (!response.ok) {
    throw new Error(`Labelary API failed with status: ${response.status}`);
  }

  return response.blob();
}

/**
 * Convert a ZPL string to a PNG image Blob via the Labelary rendering API.
 * @param {string} zpl - The ZPL command string.
 * @param {string} [size="2x1"] - Label size in inches (WxH), e.g. "2x1".
 * @returns {Promise<Blob>} The rendered PNG image as a Blob.
 */
export async function zplToImageBlob(zpl, size = "2x1") {
  const response = await fetch(`${LABELARY_URL}${size}/`, {
    method: "POST",
    headers: {
      Accept: "image/png",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: zpl,
  });

  if (!response.ok) {
    throw new Error(`Labelary API failed with status: ${response.status}`);
  }

  return response.blob();
}

/**
 * Check whether the Web Share API can share files on this device/browser.
 * @returns {boolean}
 */
export function canShareFiles() {
  if (
    typeof navigator === "undefined" ||
    !navigator.share ||
    !navigator.canShare
  ) {
    return false;
  }
  try {
    return navigator.canShare({
      files: [new File(["x"], "x.pdf", { type: "application/pdf" })],
    });
  } catch {
    return false;
  }
}

/**
 * Share a PDF Blob to third-party apps via the Web Share API.
 * @param {Blob} blob - The PDF Blob to share.
 * @param {string} filename - The suggested filename (e.g. "barcodes.pdf").
 * @returns {Promise<void>}
 */
export async function sharePdf(blob, filename) {
  if (typeof navigator === "undefined" || !navigator.share) {
    throw new Error("Sharing is not supported on this device/browser.");
  }

  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && !navigator.canShare({ files: [file] })) {
    throw new Error("This device cannot share PDF files.");
  }

  await navigator.share({
    files: [file],
    title: filename,
  });
}

/**
 * Check whether the Web Share API can share PNG images on this device/browser.
 * @returns {boolean}
 */
export function canShareImages() {
  if (
    typeof navigator === "undefined" ||
    !navigator.share ||
    !navigator.canShare
  ) {
    return false;
  }
  try {
    return navigator.canShare({
      files: [new File(["x"], "x.png", { type: "image/png" })],
    });
  } catch {
    return false;
  }
}

/**
 * Share a PNG image Blob to third-party apps via the Web Share API.
 * @param {Blob} blob - The PNG image Blob to share.
 * @param {string} filename - The suggested filename (e.g. "barcodes.png").
 * @returns {Promise<void>}
 */
export async function shareImage(blob, filename) {
  if (typeof navigator === "undefined" || !navigator.share) {
    throw new Error("Sharing is not supported on this device/browser.");
  }

  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare && !navigator.canShare({ files: [file] })) {
    throw new Error("This device cannot share PNG images.");
  }

  await navigator.share({
    files: [file],
    title: filename,
  });
}