import { Router } from 'express';
import os from 'os';
import { getGatesSnapshot } from '../utils/gates.js';

const router = Router();

router.get('/api/health', (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    gates: getGatesSnapshot(),
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    },
    node: process.version,
    host: os.hostname(),
    time: new Date().toISOString(),
  });
});

export default router;