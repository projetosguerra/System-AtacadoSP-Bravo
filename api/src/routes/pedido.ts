import { Router } from 'express';
import {
  obterPedido,
  atualizarStatusPedido,
  aprovarPedido,
  obterLogsPedido,
  obterFinanceiroPedido,
  obterTransportadoraPedido,
  desbloquearPedido
} from '../controllers/pedidoController.js';
import { getConcatContext, createConcat } from '../controllers/concatController.js';
import { updateStatusSchema } from '../validators/pedido.js';

const router = Router();

router.get('/api/pedido/:id', (req, res, next) => obterPedido(req, res).catch(next));
router.get('/api/pedido/:id/logs', (req, res, next) => obterLogsPedido(req, res).catch(next));
router.get('/api/pedido/:id/concat/context', (req, res, next) => getConcatContext(req, res).catch(next));
router.post('/api/pedido/:id/concat', (req, res, next) => createConcat(req, res).catch(next));
router.put('/api/pedido/:id/status', (req, res, next) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return atualizarStatusPedido(req, res).catch(next);
});
router.post('/api/pedido/:id/unlock', (req, res, next) => desbloquearPedido(req, res).catch(next));
router.post('/api/pedido/:id/aprovar', (req, res, next) => aprovarPedido(req, res).catch(next));

router.get('/api/pedido/:id/financeiro', (req, res, next) => obterFinanceiroPedido(req, res).catch(next));
router.get('/api/pedido/:id/transportadora', (req, res, next) => obterTransportadoraPedido(req, res).catch(next));

router.get('/api/pedido/analise/:id/financeiro', (req, res, next) => obterFinanceiroPedido(req, res).catch(next));
router.get('/api/pedido/analise/:id/transportadora', (req, res, next) => obterTransportadoraPedido(req, res).catch(next));

export default router;