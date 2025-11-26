import { Router } from 'express';
import { obterFinanceiro, obterFinanceiroSetor } from '../controllers/financeiroController.js';

const router = Router();
router.get('/api/financeiro', (req, res, next) => obterFinanceiro(req, res).catch(next));

router.get('/api/financeiro/setor/:codSetor', (req, res, next) => obterFinanceiroSetor(req, res).catch(next));

export default router;