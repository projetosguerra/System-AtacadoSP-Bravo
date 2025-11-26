import { Router } from 'express';
import { obterAteste, criarAteste } from '../controllers/atesteController.js';
import { criarAtesteSchema } from '../validators/ateste.js';

const router = Router();

router.get('/api/pedido/:id/ateste', (req, res, next) =>
  obterAteste(req, res).catch(next)
);

router.post('/api/pedido/:id/ateste', (req, res, next) => {
  const parsed = criarAtesteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  return criarAteste(req, res).catch(next);
});

export default router;