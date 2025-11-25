import path from 'path';
import fs from 'fs';
import { getImagePrefix } from './imagePrefix.js';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function sanitizeFilename(name: string): string {
  return name.replace(/[\r\n]/g, '').replace(/[/\\]+/g, '').trim();
}

function resolveFilename(rawPath: string): string | null {
  const baseCandidate = sanitizeFilename(String(rawPath).replace(/\\/g, '/').split('/').pop() || '');
  if (!baseCandidate) return null;

  const dir = process.env.PROD_IMG_DIR?.trim();
  if (!dir) return baseCandidate;

  const ext = path.extname(baseCandidate).toLowerCase();
  if (ext && ALLOWED_EXT.has(ext)) {
    try {
      const full = path.join(dir, baseCandidate);
      const st = fs.statSync(full);
      if (st.isFile()) return baseCandidate;
    } catch {
    }
  }

  const stem = ext ? baseCandidate.slice(0, -ext.length) : baseCandidate;
  for (const tryExt of ['.jpg', '.jpeg', '.png', '.webp']) {
    const candidate = stem + tryExt;
    const full = path.join(dir, candidate);
    try {
      const st = fs.statSync(full);
      if (st.isFile()) return candidate;
    } catch { /* continua */ }
  }

  return baseCandidate;
}

export function toImageUrl(rawPath: string | null | undefined, codprod: number): string {
  const placeholder = `https://placehold.co/300x200/eeeeee/333333?text=Produto+${encodeURIComponent(String(codprod))}`;
  if (!rawPath) return placeholder;

  const resolved = resolveFilename(rawPath);
  if (!resolved) return placeholder;

  const ext = path.extname(resolved).toLowerCase();
  if (!ext || !ALLOWED_EXT.has(ext)) {
    if (process.env.NODE_ENV?.startsWith('dev')) {
      console.warn(`[images] Arquivo sem extensão válida ou inexistente: raw="${rawPath}" resolved="${resolved}"`);
    }
    return placeholder;
  }

  const prefix = getImagePrefix()?.trim();
  if (prefix) {
    return `${prefix.replace(/\/+$/, '')}/${encodeURIComponent(resolved)}`;
  }

  const origin = (process.env.PUBLIC_API_ORIGIN || '').trim();
  if (origin) {
    return `${origin.replace(/\/+$/, '')}/api/media/produtos/${encodeURIComponent(resolved)}`;
  }

  return `/api/media/produtos/${encodeURIComponent(resolved)}`;
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