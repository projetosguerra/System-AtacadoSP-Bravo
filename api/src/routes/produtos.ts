import { Router } from 'express';
import { listarProdutos } from '../controllers/produtosController.js';

const router = Router();
router.get('/api/produtos', (req, res, next) => listarProdutos(req, res).catch(next));

export default router;