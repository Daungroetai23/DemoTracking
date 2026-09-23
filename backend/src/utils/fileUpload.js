/**
 * Image storage utility — stores base64 data URLs directly in the database.
 * No filesystem I/O; works identically in local dev and Vercel serverless.
 */

/**
 * Validates and normalises a base64 image/PDF data URL for DB storage.
 *
 * @param {string} base64Str - The base64 data string (e.g. data:image/webp;base64,...)
 * @returns {string|null} The data URL ready for DB storage, or null
 */
export function saveBase64Image(base64Str) {
  if (!base64Str) return null;

  // Already a data URL → store as-is
  if (base64Str.startsWith('data:')) return base64Str;

  // Skip blob URLs (should be resolved to base64 on the client before sending)
  if (base64Str.startsWith('blob:')) return null;

  // Relative /uploads/ path from old file-based storage — keep it so old data still works
  if (base64Str.startsWith('/uploads/') || base64Str.startsWith('/assets/')) {
    return base64Str;
  }

  // Full URL containing /uploads/ — strip to relative path for backwards compat
  const uploadsIndex = base64Str.indexOf('/uploads/');
  if (
    (base64Str.startsWith('http://') || base64Str.startsWith('https://')) &&
    uploadsIndex !== -1
  ) {
    return base64Str.substring(uploadsIndex);
  }

  // Unknown format
  console.warn('[ImageStore] Unrecognised image format — skipping');
  return null;
}

/**
 * No-op: images are stored in DB, nothing to delete from disk.
 */
export function deleteImageFile(_url) {
  // intentional no-op
}
