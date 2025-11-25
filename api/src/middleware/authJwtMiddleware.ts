import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

interface DecodedToken {
  codUsuario?: number;
  codSetor?: number;
  perfil?: string;
  tipoUsuario?: number;
  iat?: number;
  exp?: number;
  id?: number; 
}

function normalizePerfil(perfilRaw: any, tipoUsuario?: number): 'ADMIN'|'APROVADOR'|'SOLICITANTE' {
  const p = String(perfilRaw || '').trim().toUpperCase();
  if (['ADMIN','APROVADOR','SOLICITANTE'].includes(p)) return p as any;
  if (Number.isFinite(tipoUsuario)) {
    return tipoUsuario === 1 ? 'ADMIN' : tipoUsuario === 2 ? 'APROVADOR' : 'SOLICITANTE';
  }
  return 'APROVADOR';
}

export async function authJwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !String(header).startsWith('Bearer ')) {
    return next();
  }

  const token = String(header).slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const codUsuario = Number(decoded.codUsuario ?? decoded.id);
    const codSetor = Number(decoded.codSetor);
    const tipoUsuario = Number(decoded.tipoUsuario);
    let perfil = normalizePerfil(decoded.perfil, tipoUsuario);

    let finalCodSetor = Number.isFinite(codSetor) ? codSetor : NaN;

    if (!Number.isFinite(finalCodSetor) && Number.isFinite(codUsuario)) {
      try {
        await withConnection(async (connection) => {
          const r = await connection.execute(
            `SELECT CODSETOR, TIPOUSUARIO FROM BRAMV_USUARIOS WHERE CODUSUARIO = :id`,
            { id: codUsuario },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const row: any = r.rows?.[0];
          if (row) {
            const fetchedSetor = Number(row.CODSETOR);
            if (Number.isFinite(fetchedSetor)) finalCodSetor = fetchedSetor;
            const fetchedTipo = Number(row.TIPOUSUARIO);
            if (!['ADMIN','APROVADOR','SOLICITANTE'].includes(perfil)) {
              perfil = fetchedTipo === 1 ? 'ADMIN' : fetchedTipo === 2 ? 'APROVADOR' : 'SOLICITANTE';
            }
          }
        });
      } catch (e) {
        console.warn('[authJwtMiddleware] fallback setor falhou:', e);
      }
    }

    (req as any).user = {
      codUsuario: Number.isFinite(codUsuario) ? codUsuario : undefined,
      codSetor: Number.isFinite(finalCodSetor) ? finalCodSetor : undefined,
      perfil,
      tipoUsuario: Number.isFinite(tipoUsuario) ? tipoUsuario : undefined
    };

    if (String(process.env.AUTH_DEBUG || '') === '1') {
      res.setHeader('X-Auth-Resolved', JSON.stringify((req as any).user));
    }

    return next();
  } catch (err: any) {
    console.warn('[authJwtMiddleware] token inválido:', err.message);
    (req as any).user = undefined;
    return next();
  }
}