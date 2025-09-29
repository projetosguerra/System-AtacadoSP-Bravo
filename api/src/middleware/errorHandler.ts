import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status || 500;
  const body: any = { error: 'Internal Server Error' };
  if (process.env.NODE_ENV !== 'production') {
    body.details = err?.message || String(err);
  }
  console.error('[ERROR_HANDLER]', err);
  res.status(status).json(body);
}