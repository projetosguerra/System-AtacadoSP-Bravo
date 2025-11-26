import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

function cap(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mapConcatRole(papel?: string | null): 'RESULTADO' | 'ORIGEM' | null {
  const v = String(papel ?? '').trim().toUpperCase();
  if (v === 'RESULTADO') return 'RESULTADO';
  if (v === 'ORIGEM') return 'ORIGEM';
  return null;
}

function readUserScope(u: any): { perfil: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE'; codSetor?: number; codUsuario?: number } {
  const tipoNum = Number(u?.tipoUsuario ?? u?.tipo ?? NaN);
  let perfil: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE' =
    (['ADMIN','APROVADOR','SOLICITANTE'].includes(String(u?.perfil).toUpperCase() || ''))
      ? (String(u?.perfil).toUpperCase() as any)
      : (Number.isFinite(tipoNum) ? (tipoNum === 1 ? 'ADMIN' : tipoNum === 2 ? 'APROVADOR' : 'SOLICITANTE') : 'APROVADOR');

  const codSetor = Number(u?.codSetor ?? u?.CODSETOR);
  const codUsuario = Number(u?.codUsuario ?? u?.CODUSUARIO);
  return {
    perfil,
    ...(Number.isFinite(codSetor) ? { codSetor } : {}),
    ...(Number.isFinite(codUsuario) ? { codUsuario } : {})
  };
}

export const listarPendentes = async (req: any, res: any) => {
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
            p.STATUS                                          AS STATUS,
            (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,'')) AS SOLICITANTE,
            s.DESCRICAO                                       AS SETOR,
            NVL(p.QTD_ITENS, 0)                               AS QTD_ITENS,
            NVL(p.VALOR_TOTAL, 0)                             AS VALOR_TOTAL,
            NVL(p.CONCAT_PAPEL,'NENHUM')                      AS CONCAT_PAPEL,
            p.CONCAT_GRUPO_ID                                 AS CONCAT_GRUPO_ID,
            p.DATA_APROVACAO                                  AS DATA_APROVACAO,
            (SELECT a.PRIMEIRO_NOME || ' ' || NVL(a.ULTIMO_NOME,'')
               FROM BRAMV_USUARIOS a
              WHERE a.CODUSUARIO = p.APROVADOR_ID)            AS APROVADOR_NOME
          FROM BRAMV_PEDIDOC p
          LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
          LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
          WHERE p.STATUS IN (5,3)
            AND p.DATA >= TRUNC(SYSDATE) - :days
            ${restrictSetor ? 'AND u.CODSETOR = :userSetor' : ''}
          ORDER BY p.DATA DESC
        )
        WHERE ROWNUM <= :maxrows
      `;
      const binds: Record<string, any> = { days, maxrows, ...(restrictSetor ? { userSetor: codSetor } : {}) };
      const r = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

      return (r.rows || []).map((p: any) => ({
        id: p.ID,
        data: p.DATA,
        status: Number(p.STATUS),
        solicitante: p.SOLICITANTE,
        unidadeAdmin: p.SETOR || 'N/A',
        qtdItens: Number(p.QTD_ITENS || 0),
        valor: Number(p.VALOR_TOTAL || 0),
        concatRole: mapConcatRole(p.CONCAT_PAPEL),
        concatGroupId: p.CONCAT_GRUPO_ID ?? null,
        aprovador: p.APROVADOR_NOME || null,
        dataAprovacao: p.DATA_APROVACAO || null,
        centroCusto: null // não há coluna no schema atual
      }));
    });

    return res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR PEDIDOS PENDENTES:', err);
    return res.status(500).json({ error: 'Erro ao buscar pedidos pendentes.' });
  }
};

export const listarHistorico = async (req: any, res: any) => {
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
          p.CONCAT_GRUPO_ID                                 AS CONCAT_GRUPO_ID,
          p.DATA_APROVACAO                                  AS DATA_APROVACAO,
          (SELECT a.PRIMEIRO_NOME || ' ' || NVL(a.ULTIMO_NOME,'')
             FROM BRAMV_USUARIOS a
            WHERE a.CODUSUARIO = p.APROVADOR_ID)            AS APROVADOR_NOME
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
      status: Number(p.STATUS),
      solicitante: p.SOLICITANTE,
      setor: p.SETOR || 'N/A',
      qtdItens: Number(p.QTD_ITENS || 0),
      valorTotal: Number(p.VALOR_TOTAL || 0),
      concatRole: mapConcatRole(p.CONCAT_PAPEL),
      concatGroupId: p.CONCAT_GRUPO_ID ?? null,
      aprovador: p.APROVADOR_NOME || null,
      dataAprovacao: p.DATA_APROVACAO || null,
      centroCusto: null
    }));

    return res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR HISTÓRICO DE PEDIDOS:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
  }
};