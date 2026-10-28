import { join } from 'node:path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};