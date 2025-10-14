import { Router } from 'express';
import os from 'os';
import oracledb from 'oracledb';
import { getPoolStatsText } from '../db/pool.js';

const router = Router();

router.get('/api/health', (_req, res) => {
  const mem = process.memoryUsage();
  const thin = (oracledb as any).thin === true;
  const clientVersion = (oracledb as any).oracleClientVersionString || (thin ? 'thin' : 'unknown');
  res.json({
    ok: true,
    now: new Date().toISOString(),
    node: process.version,
    host: os.hostname(),
    driver: thin ? 'thin' : 'thick',
    oracleClientVersion: clientVersion,
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});

router.get('/api/_debug/db-stats', (_req, res) => {
  try {
    const stats = getPoolStatsText();
    res.type('text/plain').send(stats);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Falha ao obter estatísticas do pool.' });
  }
});

export default router;