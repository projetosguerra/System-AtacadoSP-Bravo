import { Router } from 'express';
import { obterFinanceiro } from '../controllers/financeiroController.js';

const router = Router();
router.get('/api/financeiro', (req, res, next) => obterFinanceiro(req, res).catch(next));

export default router;