import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";
import { HttpError } from "./errorHandler.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new HttpError(400, "Logo must be a PNG, JPEG, WEBP, or SVG image"));
      return;
    }
    cb(null, true);
  },
});
