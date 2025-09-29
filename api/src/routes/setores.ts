import { Router } from 'express';
import { listarSetores, listarPedidosDoSetor, listarHistoricoSetor, atualizarLimiteSetor } from '../controllers/setoresController.js';
import { updateLimiteSchema } from '../validators/setores.js';

const router = Router();

router.get('/api/setores', (req, res, next) => listarSetores(req, res).catch(next));
router.get('/api/setores/:codsetor/pedidos', (req, res, next) => listarPedidosDoSetor(req, res).catch(next));
router.get('/api/setores/:codsetor/historico', (req, res, next) => listarHistoricoSetor(req, res).catch(next));

router.put('/api/setores/:codsetor/limite', (req, res, next) => {
  const parsed = updateLimiteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return atualizarLimiteSetor(req, res).catch(next);
});

export default router;