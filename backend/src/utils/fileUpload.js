import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = !!process.env.VERCEL;
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists (only when running locally)
if (!isVercel && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Processes a base64 encoded image string.
 * 
 * On Vercel: Returns the base64 data URL as-is (stored directly in DB).
 * Locally: Saves as a physical file and returns the relative URL.
 * 
 * @param {string} base64Str - The base64 data string (e.g. data:image/webp;base64,...)
 * @param {string} prefix - Prefix for the generated file name
 * @returns {string|null} The data URL (Vercel) or relative file URL (local), or null
 */
export function saveBase64Image(base64Str, prefix = 'asset') {
  if (!base64Str) return null;

  // If it's already a relative /uploads/ or /assets/ path, return as-is
  if (base64Str.startsWith('/uploads/') || base64Str.startsWith('/assets/')) {
    return base64Str;
  }

  // If it's a full URL containing /uploads/, extract the relative path
  // e.g. "http://localhost:5000/uploads/file.webp" → "/uploads/file.webp"
  const uploadsIndex = base64Str.indexOf('/uploads/');
  if (
    (base64Str.startsWith('http://') || base64Str.startsWith('https://')) &&
    uploadsIndex !== -1
  ) {
    return base64Str.substring(uploadsIndex);
  }

  // Skip blob URLs (shouldn't reach backend, but just in case)
  if (base64Str.startsWith('blob:')) {
    return null;
  }

  // If it's already a data URL, and we're on Vercel, return it directly (store in DB)
  if (base64Str.startsWith('data:') && isVercel) {
    return base64Str;
  }

  // Parse base64 header
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    // If it's not base64 but doesn't look like a URL, it might be an invalid format
    console.warn('[FileUpload] Input string is not a valid base64 image data URL');
    return null;
  }

  // On Vercel: return the full data URL as-is (will be stored in DB LongText column)
  if (isVercel) {
    return base64Str;
  }

  // Locally: save to disk
  const mimeType = matches[1];
  const base64Data = matches[2];

  // Map mimeType to file extension
  let ext = 'webp';
  if (mimeType.includes('pdf')) ext = 'pdf';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
  else if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('gif')) ext = 'gif';
  else if (mimeType.includes('webp')) ext = 'webp';

  // Generate a unique filename
  const fileName = `${prefix}_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  // Write buffer to disk
  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

  return `/uploads/${fileName}`;
}

/**
 * Deletes a physical file from the uploads directory.
 * Skips on Vercel since files are stored in DB.
 * @param {string} relativeUrl - The relative static URL (e.g. /uploads/filename.webp)
 */
export function deleteImageFile(relativeUrl) {
  // On Vercel, images are stored in DB, nothing to delete from disk
  if (isVercel) return;
  
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  
  const fileName = relativeUrl.replace('/uploads/', '');
  const filePath = path.join(uploadsDir, fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[FileUpload] Deleted file: ${filePath}`);
    }
  } catch (err) {
    console.error(`[FileUpload] Failed to delete file: ${filePath}`, err);
  }
}
