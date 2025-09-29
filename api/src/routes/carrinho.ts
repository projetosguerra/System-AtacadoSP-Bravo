import { Router } from 'express';
import { listarCarrinho, adicionarItem, atualizarItem, removerItem, submeterCarrinho } from '../controllers/carrinhoController.js';
import { addItemSchema, updateItemSchema } from '../validators/cart.js';

const router = Router();

router.get('/api/carrinho/:codusuario', (req, res, next) => listarCarrinho(req, res).catch(next));

router.post('/api/carrinho/:codusuario/items', (req, res, next) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return adicionarItem(req, res).catch(next);
});

router.put('/api/carrinho/:codusuario/items/:codprod', (req, res, next) => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return atualizarItem(req, res).catch(next);
});

router.delete('/api/carrinho/:codusuario/items/:codprod', (req, res, next) => removerItem(req, res).catch(next));

router.post('/api/carrinho/:codusuario/submit', (req, res, next) => submeterCarrinho(req, res).catch(next));

export default router;