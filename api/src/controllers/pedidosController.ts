import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const listarPendentes = async (req: any, res: any) => {
  const days = Number(req.query?.days ?? process.env.PENDENTES_DAYS ?? 30);
  const maxrows = Number(req.query?.maxrows ?? process.env.PENDENTES_MAXROWS ?? 200);

  try {
    const pedidos = await withConnection(async (connection) => {
      const sql = `
        WITH Base AS (
          SELECT p.NUMPEDRCA, p.DATA, p.CODUSUARIO
            FROM BRAMV_PEDIDOC p
           WHERE p.STATUS = 5
             AND TRUNC(p.DATA) >= TRUNC(SYSDATE) - :days
           ORDER BY p.DATA DESC
        ),
        Limited AS (
          SELECT * FROM Base WHERE ROWNUM <= :maxrows
        ),
        IAGG AS (
          SELECT i.NUMPEDRCA,
                 COUNT(*) AS QTD_ITENS,
                 SUM(NVL(i.QT,0) * NVL(i.PVENDA,0)) AS VALOR_TOTAL
            FROM BRAMV_PEDIDOI i
           WHERE i.NUMPEDRCA IN (SELECT NUMPEDRCA FROM Limited)
           GROUP BY i.NUMPEDRCA
        )
        SELECT
          l.NUMPEDRCA                                        AS ID,
          l.DATA                                             AS DATA,
          (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))  AS SOLICITANTE,
          s.DESCRICAO                                        AS SETOR,
          NVL(ia.QTD_ITENS, 0)                               AS QTD_ITENS,
          NVL(ia.VALOR_TOTAL, 0)                             AS VALOR_TOTAL
        FROM Limited l
        LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = l.CODUSUARIO
        LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
        LEFT JOIN IAGG ia          ON ia.NUMPEDRCA  = l.NUMPEDRCA
        ORDER BY l.DATA DESC
      `;

      try {
        const result = await connection.execute(sql, { days, maxrows }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 });
        return (result.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          solicitante: p.SOLICITANTE,
          unidadeAdmin: p.SETOR || 'N/A',
          qtdItens: Number(p.QTD_ITENS || 0),
          valor: Number(p.VALOR_TOTAL || 0),
        }));
      } catch (err: any) {
        if (err?.errorNum === 4036) {
          console.warn('[pendentes] ORA-04036. Fallback sem totais.');
          const fb = await connection.execute(
            `
            SELECT * FROM (
              SELECT
                p.NUMPEDRCA                                        AS ID,
                p.DATA                                             AS DATA,
                (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))  AS SOLICITANTE,
                s.DESCRICAO                                        AS SETOR
              FROM BRAMV_PEDIDOC p
              LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
              LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
             WHERE p.STATUS = 5
               AND TRUNC(p.DATA) >= TRUNC(SYSDATE) - :days
             ORDER BY p.DATA DESC
            )
            WHERE ROWNUM <= :maxrows
            `,
            { days, maxrows },
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 }
          );
          return (fb.rows || []).map((p: any) => ({
            id: p.ID, data: p.DATA, solicitante: p.SOLICITANTE, unidadeAdmin: p.SETOR || 'N/A', qtdItens: 0, valor: 0
          }));
        }
        throw err;
      }
    });

    res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR PEDIDOS PENDENTES:', err);
    res.status(500).json({ error: 'Erro ao buscar pedidos pendentes.' });
  }
};

// Histórico com "limit early" e agregação única
export const listarHistorico = async (req: any, res: any) => {
  const days = Number(req.query?.days ?? process.env.HIST_DAYS ?? 45);
  const maxrows = Number(req.query?.maxrows ?? process.env.HIST_MAXROWS ?? 400);

  try {
    const pedidos = await withConnection(async (connection) => {
      const sql = `
        WITH Base AS (
          SELECT p.NUMPEDRCA, TRUNC(p.DATA) AS DATA, p.STATUS, p.CODUSUARIO
            FROM BRAMV_PEDIDOC p
           WHERE p.STATUS IN (1,2,3)
             AND TRUNC(p.DATA) >= TRUNC(SYSDATE) - :days
           ORDER BY p.DATA DESC
        ),
        Limited AS (
          SELECT * FROM Base WHERE ROWNUM <= :maxrows
        ),
        IAGG AS (
          SELECT i.NUMPEDRCA,
                 COUNT(*) AS QTD_ITENS,
                 SUM(NVL(i.QT,0) * NVL(i.PVENDA,0)) AS VALOR_TOTAL
            FROM BRAMV_PEDIDOI i
           WHERE i.NUMPEDRCA IN (SELECT NUMPEDRCA FROM Limited)
           GROUP BY i.NUMPEDRCA
        )
        SELECT
          l.NUMPEDRCA                                        AS ID,
          l.DATA                                             AS DATA,
          l.STATUS                                           AS STATUS,
          (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))  AS SOLICITANTE,
          s.DESCRICAO                                        AS SETOR,
          NVL(ia.QTD_ITENS, 0)                               AS QTD_ITENS,
          NVL(ia.VALOR_TOTAL, 0)                             AS VALOR_TOTAL
        FROM Limited l
        LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = l.CODUSUARIO
        LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
        LEFT JOIN IAGG ia          ON ia.NUMPEDRCA  = l.NUMPEDRCA
        ORDER BY l.DATA DESC
      `;

      try {
        const result = await connection.execute(sql, { days, maxrows }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 });
        return (result.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          status: p.STATUS,
          solicitante: p.SOLICITANTE,
          setor: p.SETOR || 'N/A',
          qtdItens: Number(p.QTD_ITENS || 0),
          valorTotal: Number(p.VALOR_TOTAL || 0),
        }));
      } catch (err: any) {
        if (err?.errorNum === 4036) {
          console.warn('[historico] ORA-04036. Fallback sem totais.');
          const fb = await connection.execute(
            `
            SELECT * FROM (
              SELECT
                p.NUMPEDRCA                                        AS ID,
                TRUNC(p.DATA)                                      AS DATA,
                p.STATUS                                           AS STATUS,
                (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))  AS SOLICITANTE,
                s.DESCRICAO                                        AS SETOR
              FROM BRAMV_PEDIDOC p
              LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
              LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
             WHERE p.STATUS IN (1,2,3)
               AND TRUNC(p.DATA) >= TRUNC(SYSDATE) - :days
             ORDER BY p.DATA DESC
            )
            WHERE ROWNUM <= :maxrows
            `,
            { days, maxrows },
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 }
          );
          return (fb.rows || []).map((p: any) => ({
            id: p.ID, data: p.DATA, status: p.STATUS, solicitante: p.SOLICITANTE, setor: p.SETOR || 'N/A', qtdItens: 0, valorTotal: 0
          }));
        }
        throw err;
      }
    });

    res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR HISTÓRICO DE PEDIDOS:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
  }
};