import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

interface UserScope {
    codUsuario?: number | undefined;
    perfil?: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';
}

function readUserScope(u: any): UserScope {
    const numericCandidates = [
        u?.tipoUsuario, u?.TIPOUSUARIO, u?.tipo,
        u?.perfil, u?.perfilUsuario, u?.role
    ].map(v => Number(v)).filter(Number.isFinite);
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
    const codUsuarioCandidates = [
        u?.codUsuario, u?.CODUSUARIO, u?.userId, u?.id, u?.ID, u?.usuarioId
    ].map(n => Number(n)).filter(Number.isFinite);
    const codUsuario = codUsuarioCandidates.length ? codUsuarioCandidates[0] : undefined;
    return { codUsuario, perfil };
}

async function clobToString(val: any): Promise<string | null> {
    if (val == null) return null;
    if (typeof val === 'string') return val;
    if (Buffer.isBuffer(val)) return val.toString('utf8');
    if (typeof val === 'object' && typeof val.on === 'function') {
        return await new Promise((resolve, reject) => {
            let out = '';
            try {
                val.setEncoding?.('utf8');
                val.on('data', (c: any) => out += c);
                val.on('end', () => resolve(out));
                val.on('error', reject);
            } catch (err) { reject(err); }
        });
    }
    return String(val);
}

export async function obterAteste(req: any, res: any) {
    const pedidoId = Number(req.params.id);
    if (!Number.isFinite(pedidoId)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        const row = await withConnection(async (conn) => {
            const r = await conn.execute(
                `SELECT ID, NUMPEDRCA, CODUSUARIO, RECEBIDO_OK, COMENTARIO, DATA_ATESTE
           FROM BRAMV_ATESTE
          WHERE NUMPEDRCA = :id
          ORDER BY DATA_ATESTE DESC, ID DESC`,
                { id: pedidoId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 5 }
            );
            const first: any = r.rows?.[0];
            if (!first) return null;
            return {
                id: first.ID,
                numpedrca: first.NUMPEDRCA,
                codUsuario: first.CODUSUARIO,
                recebidoOk: Number(first.RECEBIDO_OK) === 1,
                comentario: await clobToString(first.COMENTARIO),
                dataAteste: first.DATA_ATESTE
            };
        });

        return res.json({ ateste: row });
    } catch (e: any) {
        console.error('[ateste] obterAteste erro:', e);
        return res.status(500).json({ error: 'Falha ao buscar ateste.' });
    }
}

export async function criarAteste(req: any, res: any) {
    const pedidoId = Number(req.params.id);
    if (!Number.isFinite(pedidoId)) return res.status(400).json({ error: 'ID inválido.' });

    const recebidoOkRaw = req.body?.recebidoOk;
    const recebidoOk = String(recebidoOkRaw).toLowerCase() === 'true' || recebidoOkRaw === true || recebidoOkRaw === 1;
    const comentario = String(req.body?.comentario || '').trim();

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
            const statusPortal = Number(ped.STATUS);
            const solicitanteId = Number(ped.CODUSUARIO);
            if (solicitanteId !== codUsuario) {
                const err: any = new Error('Somente o solicitante pode atestar o recebimento.');
                err.statusCode = 403;
                throw err;
            }

            if (statusPortal !== 1) {
                const err: any = new Error('Ateste permitido apenas após aprovação do pedido.');
                err.statusCode = 409;
                throw err;
            }

            const existeR = await conn.execute(
                `SELECT COUNT(*) AS QTD
           FROM BRAMV_ATESTE
          WHERE NUMPEDRCA = :id`,
                { id: pedidoId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const qtd = Number((existeR.rows?.[0] as any)?.QTD || 0);
            if (qtd > 0) {
                const err: any = new Error('Já existe um ateste registrado para este pedido.');
                err.statusCode = 409;
                throw err;
            }

            const ins = await conn.execute(
                `INSERT INTO BRAMV_ATESTE (NUMPEDRCA, CODUSUARIO, RECEBIDO_OK, COMENTARIO)
         VALUES (:p1, :p2, :p3, :p4)
         RETURNING ID, DATA_ATESTE INTO :outId, :outDt`,
                {
                    p1: pedidoId,
                    p2: codUsuario,
                    p3: recebidoOk ? 1 : 0,
                    p4: comentario || null,
                    outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    outDt: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
                }
            );

            await conn.execute(
                `INSERT INTO BRAMV_PEDIDO_EVENTO (NUMPEDRCA, TIPO, USUARIO_ID, DETALHE_JSON)
         VALUES (:n, 'ATESTE_RECEBIMENTO', :u, :det)`,
                {
                    n: pedidoId,
                    u: codUsuario,
                    det: JSON.stringify({
                        recebidoOk,
                        comentario: comentario || null
                    })
                }
            );

            await conn.commit();
            return {
                id: (ins.outBinds as any).outId[0],
                dataAteste: (ins.outBinds as any).outDt[0],
                recebidoOk,
                comentario: comentario || null
            };
        });

        res.status(201).json({
            id: result.id,
            numpedrca: pedidoId,
            recebidoOk: result.recebidoOk,
            comentario: result.comentario,
            dataAteste: result.dataAteste
        });
    } catch (e: any) {
        console.error('[ateste] criarAteste erro:', e);
        res.status(e.statusCode || 500).json({ error: e.message || 'Falha ao criar ateste.' });
    }
}