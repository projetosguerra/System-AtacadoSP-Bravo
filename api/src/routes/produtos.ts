import { Router } from 'express';
import { listarProdutos } from '../controllers/produtosController.js';
import { getProdutoDetalhe } from '../controllers/produtosController.js';  
import { getProdutosProximos } from '../controllers/produtosController.js';

const router = Router();
router.get('/api/produtos', (req, res, next) => listarProdutos(req, res).catch(next));
router.get('/api/produtos/:id', (req, res, next) => getProdutoDetalhe(req, res).catch(next));
router.get('/api/produtos/:id/proximos', (req, res, next) => getProdutosProximos(req, res).catch(next));

export default router;