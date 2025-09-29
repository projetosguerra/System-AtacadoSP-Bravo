import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { registerSchema, loginSchema } from '../validators/auth.js';

const router = Router();

router.post('/api/auth/register', (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return register(req, res).catch(next);
});

router.post('/api/auth/login', (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return login(req, res).catch(next);
});

export default router;