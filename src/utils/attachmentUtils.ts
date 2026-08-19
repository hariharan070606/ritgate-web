/**
 * Utility functions for handling gate pass document attachments (PDFs & images).
 * Converts base64 Data URIs to object Blob URLs for safe, native browser previewing.
 */

export function isPdfAttachment(uri?: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const lower = uri.trim().toLowerCase();
  
  if (lower.startsWith('data:application/pdf')) return true;
  if (lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('.pdf#')) return true;
  
  // Base64 encoded PDF files start with JVBERi (ASCII "%PDF-")
  if (lower.startsWith('data:application/octet-stream;base64,jvberi')) return true;
  if (lower.startsWith('data:;base64,jvberi')) return true;
  if (lower.startsWith('jvberi0x') || lower.startsWith('jvberi')) return true;
  
  return false;
}

/**
 * Converts a Data URI (Base64) string into a browser Blob object.
 */
export function dataUriToBlob(dataUri: string, defaultMime = 'application/pdf'): Blob {
  try {
    // If not a data URI, handle potential plain base64
    let mimeType = defaultMime;
    let base64Data = dataUri;

    if (dataUri.startsWith('data:')) {
      const parts = dataUri.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match && match[1]) {
        mimeType = match[1];
      }
      base64Data = parts[1] || '';
    }

    // Force application/pdf if mime is octet-stream and content is PDF
    if (mimeType === 'application/octet-stream' && isPdfAttachment(dataUri)) {
      mimeType = 'application/pdf';
    }

    const cleanBase64 = base64Data.replace(/\s/g, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mimeType });
  } catch (err) {
    console.error('Failed to convert data URI to Blob:', err);
    return new Blob([], { type: defaultMime });
  }
}

/**
 * Opens a document/PDF in a new browser tab without being blocked by Chrome data-URI restrictions.
 */
export function openAttachment(uri?: string, fileName = 'attachment.pdf'): void {
  if (!uri || typeof uri !== 'string') return;

  try {
    if (uri.startsWith('data:')) {
      const isPdf = isPdfAttachment(uri);
      const mime = isPdf ? 'application/pdf' : 'image/png';
      const blob = dataUriToBlob(uri, mime);
      const blobUrl = URL.createObjectURL(blob);

      const newWindow = window.open(blobUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Pop-up was blocked — trigger direct download fallback
        downloadAttachment(uri, fileName);
      }

      // Cleanup object URL after 2 minutes
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 120000);
      return;
    }

    // Remote HTTP / HTTPS / Blob URL
    window.open(uri, '_blank');
  } catch (err) {
    console.error('Error opening attachment:', err);
    downloadAttachment(uri, fileName);
  }
}

/**
 * Directly downloads an attachment to user's device.
 */
export function downloadAttachment(uri?: string, fileName = 'document.pdf'): void {
  if (!uri || typeof uri !== 'string') return;

  try {
    let downloadUrl = uri;
    let shouldRevoke = false;

    if (uri.startsWith('data:')) {
      const isPdf = isPdfAttachment(uri);
      const mime = isPdf ? 'application/pdf' : 'image/png';
      const blob = dataUriToBlob(uri, mime);
      downloadUrl = URL.createObjectURL(blob);
      shouldRevoke = true;
    }

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(downloadUrl);
        } catch {}
      }, 30000);
    }
  } catch (err) {
    console.error('Error downloading attachment:', err);
  }
}
