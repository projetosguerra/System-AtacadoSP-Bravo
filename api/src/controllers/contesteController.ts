import type { Request, Response } from 'express';
import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

type ContesteStatus = 1 | 2 | 3 | 4 | 9;

type Perfil = 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';

function getUserScope(req: any): { perfil: Perfil; codSetor?: number; codUsuario?: number } {
  const p = String(req?.user?.perfil || '').toUpperCase();
  const perfil: Perfil = (['ADMIN', 'APROVADOR', 'SOLICITANTE'].includes(p) ? p : 'APROVADOR') as Perfil;
  const codSetor = Number(req?.user?.codSetor);
  const codUsuario = Number(req?.user?.codUsuario);
  return {
    perfil,
    ...(Number.isFinite(codSetor) ? { codSetor } : {}),
    ...(Number.isFinite(codUsuario) ? { codUsuario } : {}),
  };
}

interface UserScope {
    codUsuario: number | undefined;
    perfil?: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';
}

export async function getOpenContestsCount(req: any, res: any) {
  const codcli = Number(process.env.CODCLI ?? 27995);
  const { perfil, codSetor, codUsuario } = getUserScope(req);

  try {
    const count = await withConnection(async (connection) => {
      const binds: Record<string, any> = { codcli };
      let where = `c.STATUS IN (1,2)`;

      if (perfil === 'SOLICITANTE' && Number.isFinite(codUsuario)) {
        where += ` AND c.CODUSUARIO_SOLICITANTE = :userId`;
        binds.userId = codUsuario;
      } else if (perfil === 'APROVADOR' && Number.isFinite(codSetor)) {
        where += ` AND u.CODSETOR = :userSetor`;
        binds.userSetor = codSetor;
      }

      const sql = `
        SELECT COUNT(*) AS QTD
          FROM BRAMV_CONTESTE c
          JOIN BRAMV_USUARIOS u
            ON u.CODUSUARIO = c.CODUSUARIO_SOLICITANTE
           AND u.CODCLI = :codcli
         WHERE ${where}
      `;

      const r = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const row: any = r.rows?.[0];
      return Number(row?.QTD || 0);
    });

    return res.status(200).json({ open: count });
  } catch (e: any) {
    console.error('[contestes][open-count] erro:', e?.message || e);
    return res.status(200).json({ open: 0 });
  }
}

function readUserScope(u: any): UserScope {
    const numericCandidates = [
        u?.tipoUsuario,
        u?.TIPOUSUARIO,
        u?.tipo,
        u?.perfil,
        u?.perfilUsuario,
        u?.role,
        u?.ROLE,
    ].map(v => Number(v)).filter(n => Number.isFinite(n));

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
        u?.codUsuario, u?.CODUSUARIO, u?.userId, u?.id, u?.ID, u?.usuarioId, u?.USUARIO_ID
    ].map(n => Number(n)).filter(Number.isFinite);
    const codUsuario = codUsuarioCandidates.length ? codUsuarioCandidates[0] : undefined;

    return { codUsuario, perfil };
}

async function clobToString(val: any): Promise<string> {
    if (val == null) return '';
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


export async function listarContestes(req: Request, res: Response) {
    const numpedrca = Number(req.params.id);
    if (!Number.isFinite(numpedrca)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        const rows = await withConnection(async (conn) => {
            const r = await conn.execute(
                `SELECT ID,
                NUMPEDRCA,
                CODUSUARIO_SOLICITANTE,
                DATA_CRIACAO,
                MOTIVO_REPROVACAO,
                JUSTIFICATIVA,
                STATUS,
                DATA_ANALISE,
                ANALISADO_POR,
                PARECER
           FROM BRAMV_CONTESTE
          WHERE NUMPEDRCA = :id
          ORDER BY DATA_CRIACAO DESC, ID DESC`,
                { id: numpedrca },
                { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 20 }
            );

            const out: any[] = [];
            for (const row of (r.rows || []) as any[]) {
                const justificativaStr = await clobToString(row.JUSTIFICATIVA);
                const parecerStr = await clobToString(row.PARECER);
                out.push({
                    id: row.ID,
                    numpedrca: row.NUMPEDRCA,
                    codUsuarioSolicitante: row.CODUSUARIO_SOLICITANTE,
                    dataCriacao: row.DATA_CRIACAO,
                    motivoReprovacao: row.MOTIVO_REPROVACAO,
                    justificativa: justificativaStr,
                    status: row.STATUS,
                    dataAnalise: row.DATA_ANALISE,
                    analisadoPor: row.ANALISADO_POR,
                    parecer: parecerStr
                });
            }
            return out;
        });

        res.json(rows);
    } catch (e: any) {
        console.error('[conteste] listarContestes erro:', e);
        res.status(500).json({ error: 'Falha ao listar contestes.' });
    }
}

export async function criarConteste(req: Request, res: Response) {
    const numpedrca = Number(req.params.id);
    const justificativa = String(req.body?.justificativa || '').trim();
    if (!Number.isFinite(numpedrca)) return res.status(400).json({ error: 'ID inválido.' });
    if (justificativa.length < 5) return res.status(400).json({ error: 'Justificativa muito curta (mín. 5).' });

    const { codUsuario } = readUserScope((req as any).user || {});
    if (!Number.isFinite(codUsuario)) return res.status(401).json({ error: 'Usuário não identificado.' });

    try {
        const payload = await withConnection(async (conn) => {
            const pedidoR = await conn.execute(
                `SELECT NUMPEDRCA, STATUS, CODUSUARIO
           FROM BRAMV_PEDIDOC
          WHERE NUMPEDRCA = :id`,
                { id: numpedrca },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const ped: any = pedidoR.rows?.[0];
            if (!ped) throw new Error('Pedido não encontrado.');
            if (Number(ped.STATUS) !== 2) {
                const err: any = new Error('Somente pedidos reprovados podem ser contestados.');
                err.statusCode = 409;
                throw err;
            }
            if (Number(ped.CODUSUARIO) !== codUsuario) {
                const err: any = new Error('Apenas o solicitante pode contestar.');
                err.statusCode = 403;
                throw err;
            }

            const openR = await conn.execute(
                `SELECT COUNT(*) AS QTD
           FROM BRAMV_CONTESTE
          WHERE NUMPEDRCA = :id
            AND STATUS IN (1,2)`,
                { id: numpedrca },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const qtdOpen = Number((openR.rows?.[0] as any)?.QTD || 0);
            if (qtdOpen > 0) {
                const err: any = new Error('Já existe um conteste em andamento.');
                err.statusCode = 409;
                throw err;
            }

            const motivoR = await conn.execute(
                `SELECT DETALHE_JSON
           FROM BRAMV_PEDIDO_EVENTO
          WHERE NUMPEDRCA = :id
            AND UPPER(TIPO) = 'REPROVACAO'
          ORDER BY DATA_EVENTO DESC, IDEVENTO DESC`,
                { id: numpedrca },
                { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 5 }
            );
            let motivoReprovacao: string | null = null;
            const evRow: any = motivoR.rows?.[0];
            if (evRow?.DETALHE_JSON) {
                try {
                    const raw = await clobToString(evRow.DETALHE_JSON);
                    const json = JSON.parse(raw);
                    motivoReprovacao = json?.motivo || raw;
                } catch {
                    motivoReprovacao = await clobToString(evRow.DETALHE_JSON);
                }
            }

            const ins = await conn.execute(
                `INSERT INTO BRAMV_CONTESTE
           (NUMPEDRCA, CODUSUARIO_SOLICITANTE, MOTIVO_REPROVACAO, JUSTIFICATIVA, STATUS)
         VALUES
           (:p1, :p2, :p3, :p4, 1)
         RETURNING ID INTO :outId`,
                {
                    p1: numpedrca,
                    p2: codUsuario,
                    p3: motivoReprovacao,
                    p4: justificativa,
                    outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
                }
            );

            await conn.execute(
                `INSERT INTO BRAMV_PEDIDO_EVENTO (NUMPEDRCA, TIPO, USUARIO_ID, DETALHE_JSON)
         VALUES (:n, 'CONTESTE_ABERTO', :u, :det)`,
                { n: numpedrca, u: codUsuario, det: JSON.stringify({ justificativa }) }
            );

            try {
                await conn.execute(
                    `UPDATE BRAMV_PEDIDOC SET CONTESTE_STATUS = 1 WHERE NUMPEDRCA = :id`,
                    { id: numpedrca }
                );
            } catch { }

            await conn.commit();
            return { id: (ins.outBinds as any)?.outId[0], motivoReprovacao };
        });

        res.status(201).json({
            id: payload.id,
            numpedrca,
            justificativa,
            motivoReprovacao: payload.motivoReprovacao,
            status: 1
        });
    } catch (e: any) {
        console.error('[conteste] criarConteste erro:', e);
        res.status(e.statusCode || 500).json({ error: e.message || 'Falha ao criar conteste.' });
    }
}

export async function listarContestesPendentes(req: Request, res: Response) {
    const { perfil, codUsuario } = readUserScope((req as any).user || {});
    if (!['ADMIN', 'APROVADOR'].includes(perfil || '')) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    const limit = Math.min(Math.max(Number(req.query?.limit ?? 100), 10), 200);
    let setorFiltro = Number(req.query?.setor);
    if (!Number.isFinite(setorFiltro)) setorFiltro = NaN;

    try {
        const data = await withConnection(async (conn) => {
            const sql = `
        SELECT c.ID,
               c.NUMPEDRCA,
               c.STATUS,
               c.JUSTIFICATIVA,
               c.MOTIVO_REPROVACAO,
               c.DATA_CRIACAO,
               c.DATA_ANALISE,
               u.CODUSUARIO AS SOLIC_ID,
               u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,'') AS SOLICITANTE,
               s.DESCRICAO AS SETOR
          FROM BRAMV_CONTESTE c
          JOIN BRAMV_PEDIDOC p ON p.NUMPEDRCA = c.NUMPEDRCA
          JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
          JOIN BRAMV_SETOR s     ON s.CODSETOR   = u.CODSETOR
         WHERE c.STATUS IN (1,2)
           ${Number.isFinite(setorFiltro) ? 'AND s.CODSETOR = :setor' : ''}
         ORDER BY c.DATA_CRIACAO ASC
      `;
            const binds: any = {};
            if (Number.isFinite(setorFiltro)) binds.setor = setorFiltro;

            const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 50 });
            return (r.rows || []).slice(0, limit).map((row: any) => ({
                id: row.ID,
                numpedrca: row.NUMPEDRCA,
                status: row.STATUS,
                justificativa: row.JUSTIFICATIVA,
                motivoReprovacao: row.MOTIVO_REPROVACAO,
                dataCriacao: row.DATA_CRIACAO,
                dataAnalise: row.DATA_ANALISE,
                solicitante: row.SOLICITANTE,
                setor: row.SETOR
            }));
        });

        res.json({ contestes: data });
    } catch (e: any) {
        console.error('[conteste] listarContestesPendentes erro:', e);
        res.status(500).json({ error: 'Falha ao listar contestes pendentes.' });
    }
}

export async function analisarConteste(req: Request, res: Response) {
    console.log('[DEBUG analisarConteste] req.user =', (req as any).user);
    const contesteId = Number(req.params.id);
    const { decisao, parecer, reenviarParaAnalise } = req.body || {};
    if (!Number.isFinite(contesteId)) return res.status(400).json({ error: 'ID inválido.' });
    if (!['DEFERIDO', 'INDEFERIDO'].includes(decisao)) return res.status(400).json({ error: 'Decisão inválida.' });

    const { codUsuario, perfil } = readUserScope((req as any).user || {});
    if (!Number.isFinite(codUsuario)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (!['ADMIN', 'APROVADOR'].includes(perfil || '')) return res.status(403).json({ error: 'Somente aprovador/admin pode analisar.' });

    try {
        const result = await withConnection(async (conn) => {
            const cR = await conn.execute(
                `SELECT ID, NUMPEDRCA, STATUS
           FROM BRAMV_CONTESTE
          WHERE ID = :id
          FOR UPDATE`,
                { id: contesteId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const cRow: any = cR.rows?.[0];
            if (!cRow) throw new Error('Conteste não encontrado.');
            const stAtual: ContesteStatus = cRow.STATUS;
            if ([3, 4, 9].includes(stAtual)) {
                const err: any = new Error('Conteste já encerrado.');
                err.statusCode = 409;
                throw err;
            }

            const novoStatus: ContesteStatus = decisao === 'DEFERIDO' ? 3 : 4;

            await conn.execute(
                `UPDATE BRAMV_CONTESTE
            SET STATUS = :st,
                DATA_ANALISE = SYSDATE,
                ANALISADO_POR = :u,
                PARECER = :pz
          WHERE ID = :id`,
                { st: novoStatus, u: codUsuario, pz: parecer || null, id: contesteId }
            );

            try {
                await conn.execute(
                    `UPDATE BRAMV_PEDIDOC
              SET CONTESTE_STATUS = 2
            WHERE NUMPEDRCA = :p`,
                    { p: cRow.NUMPEDRCA }
                );
            } catch { }

            if (novoStatus === 3 && reenviarParaAnalise === true) {
                await conn.execute(
                    `UPDATE BRAMV_PEDIDOC SET STATUS = 3 WHERE NUMPEDRCA = :p AND STATUS = 2`,
                    { p: cRow.NUMPEDRCA }
                );
            }

            await conn.execute(
                `INSERT INTO BRAMV_PEDIDO_EVENTO (NUMPEDRCA, TIPO, USUARIO_ID, DETALHE_JSON)
         VALUES (:n, :tipo, :u, :det)`,
                {
                    n: cRow.NUMPEDRCA,
                    tipo: novoStatus === 3 ? 'CONTESTE_DEFERIDO' : 'CONTESTE_INDEFERIDO',
                    u: codUsuario,
                    det: JSON.stringify({ parecer: parecer || null, reenviado: reenviarParaAnalise === true })
                }
            );

            await conn.commit();
            return { novoStatus };
        });

        res.json({ success: true, status: result.novoStatus });
    } catch (e: any) {
        console.error('[conteste] analisarConteste erro:', e);
        res.status(e.statusCode || 500).json({ error: e.message || 'Falha ao analisar conteste.' });
    }
}