import { Router } from 'express';
import { obterPedido, atualizarStatusPedido } from '../controllers/pedidoController.js';
import { updateStatusSchema } from '../validators/pedido.js';

const router = Router();

router.get('/api/pedido/:id', (req, res, next) => obterPedido(req, res).catch(next));

router.put('/api/pedido/:id/status', (req, res, next) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return atualizarStatusPedido(req, res).catch(next);
});

export default router;