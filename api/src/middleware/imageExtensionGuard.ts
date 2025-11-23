import path from 'path';

const allowed = new Set(['.jpg','.jpeg','.png','.gif','.webp']);

export function imageExtensionGuard(req: any, res: any, next: any) {
  const ext = path.extname(req.path).toLowerCase();
  if (ext && !allowed.has(ext)) {
    return res.status(404).end();
  }
  next();
}