/**
 * Purchase Order File Validation (Pure module - works in browser and server)
 * 
 * Validates PO files by actual content (magic bytes), not browser-declared MIME type.
 * Sanitizes storage paths to prevent directory traversal and invalid characters.
 */

export const PO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

export type PoFileKind = {
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png';
  extension: 'pdf' | 'jpg' | 'png';
};

/**
 * Detect file type by magic bytes (file signature)
 * 
 * @param bytes - First 8 bytes of the file
 * @returns Detected file kind or null if unrecognized
 */
export function detectPoFileKind(bytes: Uint8Array): PoFileKind | null {
  if (bytes.length < 4) return null;

  // PDF: 25 50 44 46 ("%PDF")
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { contentType: 'application/pdf', extension: 'pdf' };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: 'image/png', extension: 'png' };
  }

  return null;
}

/**
 * Validate purchase order file
 * 
 * Checks:
 * - File exists and is not empty
 * - Size is within limit
 * - Actual file type matches PDF, JPEG, or PNG by magic bytes
 * 
 * @param file - File to validate
 * @returns Validation result with detected kind or error message
 */
export async function validatePoFile(
  file: File
): Promise<{ ok: true; kind: PoFileKind } | { ok: false; error: string }> {
  // Check if file exists and is not empty
  if (!file || file.size === 0) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  // Check size limit
  if (file.size > PO_MAX_BYTES) {
    return { ok: false, error: 'File size must be less than 10MB' };
  }

  // Read first 8 bytes to detect actual file type
  let bytes: Uint8Array;
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    bytes = new Uint8Array(buffer);
  } catch (error) {
    return { ok: false, error: 'Could not read file contents.' };
  }

  // Detect file type by magic bytes
  const kind = detectPoFileKind(bytes);
  if (!kind) {
    return { ok: false, error: 'Please upload a PDF, JPG, or PNG file.' };
  }

  return { ok: true, kind };
}

/**
 * Build sanitized storage path for PO file
 * 
 * Prevents directory traversal and sanitizes filename:
 * - Strips directory separators (/ and \)
 * - Removes original extension
 * - Replaces unsafe characters with underscore
 * - Collapses repeated underscores
 * - Limits length to 60 characters
 * - Falls back to 'purchase-order' if empty
 * 
 * @param userId - User ID for the path prefix
 * @param originalName - Original filename from upload
 * @param kind - Detected file kind
 * @returns Safe storage path: userId/timestamp-sanitized.ext
 */
export function buildPoStoragePath(
  userId: string,
  originalName: string,
  kind: PoFileKind
): string {
  // Extract base name (strip directory paths)
  let baseName = originalName;
  const lastSlash = Math.max(
    baseName.lastIndexOf('/'),
    baseName.lastIndexOf('\\')
  );
  if (lastSlash >= 0) {
    baseName = baseName.substring(lastSlash + 1);
  }

  // Remove extension
  const lastDot = baseName.lastIndexOf('.');
  if (lastDot > 0) {
    baseName = baseName.substring(0, lastDot);
  }

  // Replace unsafe characters with underscore (keep only A-Za-z0-9._-)
  baseName = baseName.replace(/[^A-Za-z0-9._-]/g, '_');

  // Collapse repeated underscores
  baseName = baseName.replace(/_+/g, '_');

  // Trim leading/trailing underscores
  baseName = baseName.replace(/^_+|_+$/g, '');

  // Limit length
  if (baseName.length > 60) {
    baseName = baseName.substring(0, 60);
  }

  // Fallback if empty
  if (baseName.length === 0) {
    baseName = 'purchase-order';
  }

  // Build final path with timestamp and correct extension
  return `${userId}/${Date.now()}-${baseName}.${kind.extension}`;
}
