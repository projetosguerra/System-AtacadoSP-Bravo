import { Router } from 'express';
import { obterSatisfacao, criarSatisfacao } from '../controllers/satisfacaoController.js';
import { criarSatisfacaoSchema } from '../validators/satisfacao.js';

const router = Router();

router.get('/api/pedido/:id/satisfacao', (req, res, next) =>
  obterSatisfacao(req, res).catch(next)
);

router.post('/api/pedido/:id/satisfacao', (req, res, next) => {
  const parsed = criarSatisfacaoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return criarSatisfacao(req, res).catch(next);
});

export default router;