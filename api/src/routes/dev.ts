import { Router } from 'express';
import { seedMonth, cleanupSeedMonth } from '../controllers/devSeedController.js';

const router = Router();

router.get('/api/dev/seed', (req, res) => seedMonth(req, res));

router.get('/api/dev/seed/last-month', (req, res) => {
  req.query.monthOffset = req.query.monthOffset ?? '-1';
  seedMonth(req, res);
});

router.get('/api/dev/cleanup', (req, res) => cleanupSeedMonth(req, res));
router.get('/api/dev/cleanup/last-month', (req, res) => {
  req.query.monthOffset = req.query.monthOffset ?? '-1';
  cleanupSeedMonth(req, res);
});

export default router;