import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

function cap(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const PENDENTES_INFLIGHT_THRESHOLD =
  Number(process.env.PENDENTES_INFLIGHT_THRESHOLD ??
    process.env.PENDENTES_QUEUE_THRESHOLD ?? 5);

const HIST_INFLIGHT_THRESHOLD =
  Number(process.env.HIST_INFLIGHT_THRESHOLD ??
    process.env.HIST_QUEUE_THRESHOLD ?? 5);

let inflightPendentes = 0;
let inflightHistorico = 0;

function mapConcatRole(papel?: string | null): 'RESULT' | 'SOURCE' | null {
  const v = String(papel ?? '').trim().toUpperCase();
  if (v === 'RESULTADO') return 'RESULT';
  if (v === 'ORIGEM') return 'SOURCE';
  return null;
}

// Normaliza usuário de middleware variados
function readUserScope(u: any): { perfil: 'ADMIN'|'APROVADOR'|'SOLICITANTE'; codSetor?: number; codUsuario?: number } {
  const rawPerfil =
    u?.perfil ?? u?.role ?? u?.perfilUsuario ?? u?.tipoPerfil ?? u?.tipo ?? '';
  const perfilUp = String(rawPerfil).trim().toUpperCase();

  // Também aceitar tipo numérico se existir (1=ADMIN, 2=APROVADOR, 3=SOLICITANTE)
  const tipoNum = Number(u?.tipoUsuario ?? u?.tipo ?? NaN);
  let perfil: 'ADMIN'|'APROVADOR'|'SOLICITANTE';
  if (['ADMIN','APROVADOR','SOLICITANTE'].includes(perfilUp)) {
    perfil = perfilUp as any;
  } else if (Number.isFinite(tipoNum)) {
    perfil = (tipoNum === 1 ? 'ADMIN' : tipoNum === 2 ? 'APROVADOR' : 'SOLICITANTE');
  } else {
    // fallback conservador: tratar como aprovador (mais restritivo)
    perfil = 'APROVADOR';
  }

  const codSetor = Number(
    u?.codSetor ?? u?.codsetor ?? u?.CODSETOR ?? u?.setorId ?? u?.COD_SETOR
  );
  const codUsuario = Number(u?.codUsuario ?? u?.CODUSUARIO ?? u?.userId);

  return {
    perfil,
    ...(Number.isFinite(codSetor) ? { codSetor } : {}),
    ...(Number.isFinite(codUsuario) ? { codUsuario } : {})
  };
}

export const listarPendentes = async (req: any, res: any) => {
  if (inflightPendentes >= PENDENTES_INFLIGHT_THRESHOLD) {
    res.set('Retry-After', '2');
    return res.status(503).json({ error: 'Busy, try again shortly.' });
  }

  inflightPendentes++;
  try {
    const days = cap(Number(req.query?.days ?? process.env.PENDENTES_DAYS ?? 30), 7, 45);
    const maxrows = cap(Number(req.query?.maxrows ?? process.env.PENDENTES_MAXROWS ?? 200), 10, 200);

    const { perfil, codSetor } = readUserScope(req.user || {});
    const isAdmin = perfil === 'ADMIN';
    const restrictSetor = !isAdmin && Number.isFinite(codSetor as any);

    const pedidos = await withConnection(async (connection) => {
      const sql = `
        SELECT * FROM (
          SELECT
            p.NUMPEDRCA                                       AS ID,
            p.DATA                                            AS DATA,
            (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,'')) AS SOLICITANTE,
            s.DESCRICAO                                       AS SETOR,
            NVL(p.QTD_ITENS, 0)                               AS QTD_ITENS,
            NVL(p.VALOR_TOTAL, 0)                             AS VALOR_TOTAL
          FROM BRAMV_PEDIDOC p
          LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
          LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
          WHERE p.STATUS IN (5,3)
            AND NVL(p.CONCAT_PAPEL,'NENHUM') <> 'ORIGEM'
            AND p.DATA >= TRUNC(SYSDATE) - :days
            ${restrictSetor ? 'AND u.CODSETOR = :userSetor' : ''}
          ORDER BY p.DATA DESC
        )
        WHERE ROWNUM <= :maxrows
      `;
      const binds: Record<string, any> = { days, maxrows };
      if (restrictSetor) binds.userSetor = codSetor;

      const r = await connection.execute(
        sql,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 }
      );

      return (r.rows || []).map((p: any) => ({
        id: p.ID,
        data: p.DATA,
        solicitante: p.SOLICITANTE,
        unidadeAdmin: p.SETOR || 'N/A',
        qtdItens: Number(p.QTD_ITENS || 0),
        valor: Number(p.VALOR_TOTAL || 0),
      }));
    });

    return res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR PEDIDOS PENDENTES:', err);
    return res.status(500).json({ error: 'Erro ao buscar pedidos pendentes.' });
  } finally {
    inflightPendentes = Math.max(0, inflightPendentes - 1);
  }
};

export const listarHistorico = async (req: any, res: any) => {
  if (inflightHistorico >= HIST_INFLIGHT_THRESHOLD) {
    res.set('Retry-After', '2');
    return res.status(503).json({ error: 'Busy, try again shortly.' });
  }

  inflightHistorico++;
  try {
    const days = cap(Number(req.query?.days ?? process.env.HIST_DAYS ?? 30), 7, 45);
    const maxrows = cap(Number(req.query?.maxrows ?? process.env.HIST_MAXROWS ?? 300), 50, 400);

    const statusParam = String(req.query?.status ?? '').trim();
    const parsed = statusParam
      ? statusParam.split(',').map(s => Number(s)).filter(n => Number.isFinite(n))
      : [1, 2, 3, 5];
    const statuses = (parsed.length > 0 ? parsed : [1, 2, 3, 5]).filter(n => n >= 0 && n <= 99);

    const includeOrigens = String(req.query?.includeOrigens ?? '').toLowerCase() === 'true';

    const { perfil, codSetor, codUsuario } = readUserScope(req.user || {});
    const isAdmin = perfil === 'ADMIN';
    const meus = String(req.query?.meus ?? '').toLowerCase() === 'true';
    const restrictSetor = !isAdmin && Number.isFinite(codSetor as any);
    const restrictUsuario = restrictSetor && perfil === 'SOLICITANTE' && meus && Number.isFinite(codUsuario as any);

    const bindNames = statuses.map((_, i) => `s${i}`);
    const inClause = bindNames.map(n => `:${n}`).join(',');

    const sql = `
      SELECT * FROM (
        SELECT
          p.NUMPEDRCA                                       AS ID,
          p.DATA                                            AS DATA,
          p.STATUS                                          AS STATUS,
          (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,'')) AS SOLICITANTE,
          s.DESCRICAO                                       AS SETOR,
          NVL(p.QTD_ITENS, 0)                               AS QTD_ITENS,
          NVL(p.VALOR_TOTAL, 0)                             AS VALOR_TOTAL,
          p.CONCAT_PAPEL                                    AS CONCAT_PAPEL,
          p.CONCAT_GRUPO_ID                                 AS CONCAT_GRUPO_ID
        FROM BRAMV_PEDIDOC p
        LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
        LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
        WHERE p.STATUS IN (${inClause})
          AND p.DATA >= TRUNC(SYSDATE) - :days
          ${includeOrigens ? '' : `AND NVL(p.CONCAT_PAPEL,'NENHUM') <> 'ORIGEM'`}
          ${restrictSetor ? 'AND u.CODSETOR = :userSetor' : ''}
          ${restrictUsuario ? 'AND p.CODUSUARIO = :userId' : ''}
        ORDER BY p.DATA DESC
      )
      WHERE ROWNUM <= :maxrows
    `;

    const binds: Record<string, any> = { days, maxrows };
    statuses.forEach((val, i) => { binds[`s${i}`] = val; });
    if (restrictSetor) binds.userSetor = codSetor;
    if (restrictUsuario) binds.userId = codUsuario;

    const r = await withConnection(conn =>
      conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 })
    );

    const pedidos = (r.rows || []).map((p: any) => ({
      id: p.ID,
      data: p.DATA,
      status: p.STATUS,
      solicitante: p.SOLICITANTE,
      setor: p.SETOR || 'N/A',
      qtdItens: Number(p.QTD_ITENS || 0),
      valorTotal: Number(p.VALOR_TOTAL || 0),
      concatRole: mapConcatRole(p.CONCAT_PAPEL),
      concatGroupId: p.CONCAT_GRUPO_ID ?? null,
    }));

    return res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR HISTÓRICO DE PEDIDOS:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
  } finally {
    inflightHistorico = Math.max(0, inflightHistorico - 1);
  }
};