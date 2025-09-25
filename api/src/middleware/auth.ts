// api/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

type AuthUser = {
  id: number;
  perfil: number;
  setorId?: number;
  [k: string]: any;
};

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as any).user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}