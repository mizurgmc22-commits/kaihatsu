import path from "path";
import fs from "fs";

export const UPLOADS_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.join(__dirname, "..", "..", "uploads");

export const EQUIPMENT_IMAGE_PUBLIC_PATH = "/api/uploads/equipment";
export const EQUIPMENT_IMAGE_DIR = path.join(UPLOADS_ROOT, "equipment");

export const DASHBOARD_FILE_PUBLIC_PATH = "/api/uploads/dashboard";
export const DASHBOARD_FILE_DIR = path.join(UPLOADS_ROOT, "dashboard");

fs.mkdirSync(EQUIPMENT_IMAGE_DIR, { recursive: true });
fs.mkdirSync(DASHBOARD_FILE_DIR, { recursive: true });
