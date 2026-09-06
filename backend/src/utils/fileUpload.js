import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Saves a base64 encoded image string as a physical file on disk.
 * Returns the relative static URL to access the image.
 * 
 * @param {string} base64Str - The base64 data string (e.g. data:image/webp;base64,...)
 * @param {string} prefix - Prefix for the generated file name
 * @returns {string|null} The relative URL of the saved file or null
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

  // Parse base64 header
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    // If it's not base64 but doesn't look like a URL, it might be an invalid format
    // Return null or let it throw an error. Let's return it or log it
    console.warn('[FileUpload] Input string is not a valid base64 image data URL');
    return null;
  }

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
 * @param {string} relativeUrl - The relative static URL (e.g. /uploads/filename.webp)
 */
export function deleteImageFile(relativeUrl) {
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
