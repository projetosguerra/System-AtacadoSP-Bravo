import { Router } from 'express';
import { listarPendentes, listarHistorico } from '../controllers/pedidosController.js';

const router = Router();

router.get('/api/pedidos/pendentes', (req, res, next) => listarPendentes(req, res).catch(next));
router.get('/api/pedidos/historico', (req, res, next) => listarHistorico(req, res).catch(next));

export default router;