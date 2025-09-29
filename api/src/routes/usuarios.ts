import { Router } from 'express';
import { listarUsuarios, criarUsuario, atualizarUsuario, excluirUsuario, obterSaldoUsuario } from '../controllers/usuariosController.js';
import { createUserSchema, updateUserSchema } from '../validators/users.js';

const router = Router();

router.get('/api/usuarios', (req, res, next) => listarUsuarios(req, res).catch(next));

router.get('/api/usuarios/:codUsuario/saldo', (req, res, next) => obterSaldoUsuario(req, res).catch(next));

router.post('/api/usuarios', (req, res, next) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return criarUsuario(req, res).catch(next);
});

router.put('/api/usuarios/:codUsuario', (req, res, next) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return atualizarUsuario(req, res).catch(next);
});

router.delete('/api/usuarios/:codUsuario', (req, res, next) => excluirUsuario(req, res).catch(next));

export default router;