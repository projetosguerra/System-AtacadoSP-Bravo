import type { Request, Response, NextFunction } from 'express';

export function timing(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    const len = res.getHeader('Content-Length') || 0;
    console.info(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} in ${ms.toFixed(1)}ms (len=${len})`);
  });
  next();
}