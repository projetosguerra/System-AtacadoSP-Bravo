import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

interface UserScope {
    codUsuario?: number | undefined;
    perfil?: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';
}

function readUserScope(u: any): UserScope {
    const numericCandidates = [u?.tipoUsuario, u?.TIPOUSUARIO, u?.tipo, u?.perfil, u?.perfilUsuario, u?.role]
        .map(v => Number(v)).filter(Number.isFinite);
    const rawPerfilStr = String(u?.perfil || u?.perfilUsuario || u?.role || '').trim().toUpperCase();
    let perfil: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';
    if (['ADMIN', 'APROVADOR', 'SOLICITANTE'].includes(rawPerfilStr)) {
        perfil = rawPerfilStr as any;
    } else if (numericCandidates.length) {
        const tipoNum = numericCandidates[0];
        perfil = (tipoNum === 1 ? 'ADMIN' : tipoNum === 2 ? 'APROVADOR' : 'SOLICITANTE');
    } else {
        perfil = 'SOLICITANTE';
    }
    const codUsuarioCandidates = [u?.codUsuario, u?.CODUSUARIO, u?.userId, u?.id, u?.ID, u?.usuarioId]
        .map(n => Number(n)).filter(Number.isFinite);
    const codUsuario = codUsuarioCandidates.length ? codUsuarioCandidates[0] : undefined;
    return { codUsuario, perfil };
}

export async function obterSatisfacao(req: any, res: any) {
    const pedidoId = Number(req.params.id);
    if (!Number.isFinite(pedidoId)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        const row = await withConnection(async (conn) => {
            const r = await conn.execute(
                `SELECT IDEVENTO, USUARIO_ID, DATA_EVENTO, DETALHE_JSON
           FROM BRAMV_PEDIDO_EVENTO
          WHERE NUMPEDRCA = :id AND UPPER(TIPO) = 'PESQUISA_SATISFACAO'
          ORDER BY DATA_EVENTO DESC, IDEVENTO DESC`,
                { id: pedidoId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 5 }
            );
            const first: any = r.rows?.[0];
            if (!first) return null;
            let rating: number | null = null;
            let comentario: string | null = null;
            try {
                const json = typeof first.DETALHE_JSON === 'string'
                    ? JSON.parse(first.DETALHE_JSON)
                    : first.DETALHE_JSON;
                rating = Number(json?.rating ?? null);
                comentario = json?.comentario ?? null;
            } catch {
                comentario = typeof first.DETALHE_JSON === 'string' ? first.DETALHE_JSON : null;
            }
            return {
                idEvento: first.IDEVENTO,
                usuarioId: first.USUARIO_ID,
                data: first.DATA_EVENTO,
                rating,
                comentario
            };
        });

        return res.json({ satisfacao: row });
    } catch (e: any) {
        console.error('[satisfacao] obterSatisfacao erro:', e);
        return res.status(500).json({ error: 'Falha ao buscar pesquisa de satisfação.' });
    }
}

export async function criarSatisfacao(req: any, res: any) {
    const pedidoId = Number(req.params.id);
    if (!Number.isFinite(pedidoId)) return res.status(400).json({ error: 'ID inválido.' });

    const rating = Number(req.body?.rating);
    const comentario = String(req.body?.comentario || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating inválido. Use um número entre 1 e 5.' });
    }

    const { codUsuario } = readUserScope(req.user || {});
    if (!Number.isFinite(codUsuario)) return res.status(401).json({ error: 'Usuário não identificado.' });

    try {
        const result = await withConnection(async (conn) => {
            const pedR = await conn.execute(
                `SELECT NUMPEDRCA, STATUS, CODUSUARIO
           FROM BRAMV_PEDIDOC
          WHERE NUMPEDRCA = :id`,
                { id: pedidoId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const ped: any = pedR.rows?.[0];
            if (!ped) {
                const err: any = new Error('Pedido não encontrado.');
                err.statusCode = 404;
                throw err;
            }
            const solicitanteId = Number(ped.CODUSUARIO);
            if (solicitanteId !== codUsuario) {
                const err: any = new Error('Somente o solicitante pode responder a pesquisa.');
                err.statusCode = 403;
                throw err;
            }

            const existeAtesteR = await conn.execute(
                `SELECT COUNT(*) AS QTD
           FROM BRAMV_ATESTE
          WHERE NUMPEDRCA = :id`,
                { id: pedidoId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const qtdAteste = Number((existeAtesteR.rows?.[0] as any)?.QTD || 0);
            if (qtdAteste <= 0) {
                const err: any = new Error('Pesquisa liberada somente após ateste de recebimento.');
                err.statusCode = 409;
                throw err;
            }

            // Bloquear segunda pesquisa (padrão)
            const existeSatR = await conn.execute(
                `SELECT COUNT(*) AS QTD
           FROM BRAMV_PEDIDO_EVENTO
          WHERE NUMPEDRCA = :id
            AND UPPER(TIPO) = 'PESQUISA_SATISFACAO'`,
                { id: pedidoId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const qtdSat = Number((existeSatR.rows?.[0] as any)?.QTD || 0);
            if (qtdSat > 0) {
                const err: any = new Error('Já existe uma pesquisa registrada para este pedido.');
                err.statusCode = 409;
                throw err;
            }

            await conn.execute(
                `INSERT INTO BRAMV_PEDIDO_EVENTO (NUMPEDRCA, TIPO, USUARIO_ID, DETALHE_JSON)
         VALUES (:n, 'PESQUISA_SATISFACAO', :u, :det)`,
                {
                    n: pedidoId,
                    u: codUsuario,
                    det: JSON.stringify({
                        rating,
                        comentario: comentario || null
                    })
                }
            );

            await conn.commit();

            return {
                rating,
                comentario: comentario || null
            };
        });

        res.status(201).json({
            numpedrca: pedidoId,
            rating: result.rating,
            comentario: result.comentario
        });
    } catch (e: any) {
        console.error('[satisfacao] criarSatisfacao erro:', e);
        res.status(e.statusCode || 500).json({ error: e.message || 'Falha ao registrar satisfação.' });
    }
}