import path from 'path';
import fs from 'fs';

export const UPLOADS_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'Pictures');

export const EQUIPMENT_IMAGE_PUBLIC_PATH = '/api/uploads/equipment';
export const EQUIPMENT_IMAGE_DIR = path.join(UPLOADS_ROOT, 'equipment');

fs.mkdirSync(EQUIPMENT_IMAGE_DIR, { recursive: true });
