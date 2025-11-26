import { Router } from 'express';
import { listarContestes, listarContestesPendentes, criarConteste, analisarConteste } from '../controllers/contesteController.js';
import { criarContesteSchema, analisarContesteSchema } from '../validators/conteste.js';

const router = Router();

router.get('/api/pedido/:id/conteste', (req, res, next) =>
  listarContestes(req, res).catch(next)
);

router.get('/api/conteste/pendentes', (req, res, next) =>
  listarContestesPendentes(req, res).catch(next)
);

router.post('/api/pedido/:id/conteste', (req, res, next) => {
  const parsed = criarContesteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return criarConteste(req, res).catch(next);
});

router.put('/api/conteste/:id/analisar', (req, res, next) => {
  const parsed = analisarContesteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return analisarConteste(req, res).catch(next);
});

export default router;