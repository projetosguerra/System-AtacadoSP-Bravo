import path from 'path';
import fs from 'fs';
import { getImagePrefix } from './imagePrefix.js';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n]/g, '').replace(/[/\\]+/g, '').trim();
}

export function toImageUrl(rawPath: string | null | undefined, codprod: number): string {
  const placeholder = `https://placehold.co/300x200/eeeeee/333333?text=Produto+${encodeURIComponent(String(codprod))}`;
  if (!rawPath) return placeholder;

  const filename = sanitizeFilename(String(rawPath).replace(/\\/g, '/').split('/').pop() || '');
  if (!filename) return placeholder;

  const prefix = getImagePrefix()?.trim();
  if (prefix) {
    // If you use an external CDN/prefix, use it
    return `${prefix.replace(/\/+$/, '')}/${encodeURIComponent(filename)}`;
  }

  // Build a robust API origin. Prefer PUBLIC_API_ORIGIN (recommended).
  const explicitOrigin = (process.env.PUBLIC_API_ORIGIN || '').replace(/\/+$/, '');
  const port = process.env.PORT || '8888';
  const origin = explicitOrigin || `http://localhost:${port}`;

  return `${origin}/api/media/produtos/${encodeURIComponent(filename)}`;
}

export function fileExistsInImageDir(filename: string): boolean {
  const dir = process.env.PROD_IMG_DIR?.trim();
  if (!dir) return false;
  const safe = sanitizeFilename(filename);
  const ext = path.extname(safe).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return false;
  const full = path.join(dir, safe);
  try {
    const st = fs.statSync(full);
    return st.isFile();
  } catch {
    return false;
  }
}