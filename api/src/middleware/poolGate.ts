import type { Request, Response, NextFunction } from 'express';
import { getPoolStatsText } from '../db/pool.js';

export function poolGate(options?: { queueThreshold?: number; activeThreshold?: number }) {
  const qTh = Number(options?.queueThreshold ?? process.env.DB_QUEUE_THRESHOLD ?? 15);
  const aTh = Number(options?.activeThreshold ?? process.env.DB_ACTIVE_THRESHOLD ?? 0);

  return function (req: Request, res: Response, next: NextFunction) {
    try {
      const stats = getPoolStatsText();
      const mQueue = stats.match(/pool queue length:\s*(\d+)/i);
      const mActive = stats.match(/pool connections in use:\s*(\d+)/i);
      const queued = mQueue ? Number(mQueue[1]) : 0;
      const active = mActive ? Number(mActive[1]) : 0;

      if ((qTh > 0 && queued >= qTh) || (aTh > 0 && active >= aTh)) {
        res.set('Retry-After', '2');
        return res.status(503).json({ error: 'Banco ocupado, tente novamente em instantes.' });
      }
    } catch {
    }
    next();
  };
}