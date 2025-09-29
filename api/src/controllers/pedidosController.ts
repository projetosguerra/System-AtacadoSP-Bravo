import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const listarPendentes = async (_req: any, res: any) => {
  try {
    const pedidos = await withConnection(async (connection) => {
      const sql = `
        WITH OrderTotals AS (
          SELECT NUMPEDRCA,
                 COUNT(CODPROD)                                  AS QTD_ITENS,
                 SUM(NVL(QT,0) * NVL(PVENDA,0))                  AS VALOR_TOTAL
          FROM BRAMV_PEDIDOI
          GROUP BY NUMPEDRCA
        ),
        UserLatest AS (
          SELECT 
            u.CODUSUARIO,
            u.PRIMEIRO_NOME,
            u.ULTIMO_NOME,
            u.CODSETOR,
            ROW_NUMBER() OVER (
              PARTITION BY u.CODUSUARIO
              ORDER BY u.CODUSUARIO DESC
            ) AS RN
          FROM BRAMV_USUARIOS u
        )
        SELECT 
          p.NUMPEDRCA                                               AS ID,
          p.DATA                                                    AS DATA,
          (ul.PRIMEIRO_NOME || ' ' || NVL(ul.ULTIMO_NOME, ''))      AS SOLICITANTE,
          s.DESCRICAO                                               AS SETOR,
          NVL(ot.QTD_ITENS, 0)                                      AS QTD_ITENS,
          NVL(ot.VALOR_TOTAL, 0)                                    AS VALOR_TOTAL
        FROM BRAMV_PEDIDOC p
        LEFT JOIN OrderTotals ot ON ot.NUMPEDRCA = p.NUMPEDRCA
        LEFT JOIN UserLatest ul  ON ul.CODUSUARIO = p.CODUSUARIO AND ul.RN = 1
        LEFT JOIN BRAMV_SETOR s  ON s.CODSETOR = ul.CODSETOR
        WHERE p.STATUS = 5
        ORDER BY p.DATA DESC
      `;

      try {
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return (result.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          solicitante: p.SOLICITANTE,
          unidadeAdmin: p.SETOR || 'N/A',
          qtdItens: p.QTD_ITENS,
          valor: p.VALOR_TOTAL,
        }));
      } catch (err: any) {
        console.error('[listarPendentes] Oracle error:', { errorNum: err?.errorNum, message: err?.message });
        throw err;
      }
    });

    res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR PEDIDOS PENDENTES:', err);
    res.status(500).json({ error: 'Erro ao buscar pedidos pendentes.' });
  }
};

export const listarHistorico = async (_req: any, res: any) => {
  try {
    const pedidos = await withConnection(async (connection) => {
      const sql = `
        WITH OrderTotals AS (
          SELECT NUMPEDRCA,
                 COUNT(CODPROD)                                  AS QTD_ITENS,
                 SUM(NVL(QT,0) * NVL(PVENDA,0))                  AS VALOR_TOTAL
          FROM BRAMV_PEDIDOI
          GROUP BY NUMPEDRCA
        ),
        UserLatest AS (
          SELECT 
            u.CODUSUARIO,
            u.PRIMEIRO_NOME,
            u.ULTIMO_NOME,
            u.CODSETOR,
            ROW_NUMBER() OVER (
              PARTITION BY u.CODUSUARIO
              ORDER BY u.CODUSUARIO DESC
            ) AS RN
          FROM BRAMV_USUARIOS u
        )
        SELECT 
          p.NUMPEDRCA                                               AS ID,
          TRUNC(NVL(p.DATA_ALTERACAO, p.DATA))                      AS DATA,
          p.STATUS                                                  AS STATUS,
          (ul.PRIMEIRO_NOME || ' ' || NVL(ul.ULTIMO_NOME, ''))      AS SOLICITANTE, 
          s.DESCRICAO                                               AS SETOR,
          NVL(ot.QTD_ITENS, 0)                                      AS QTD_ITENS,
          NVL(ot.VALOR_TOTAL, 0)                                    AS VALOR_TOTAL
        FROM BRAMV_PEDIDOC p
        LEFT JOIN UserLatest ul  ON ul.CODUSUARIO = p.CODUSUARIO AND ul.RN = 1
        LEFT JOIN BRAMV_SETOR s  ON s.CODSETOR = ul.CODSETOR
        LEFT JOIN OrderTotals ot ON p.NUMPEDRCA = ot.NUMPEDRCA
        WHERE p.STATUS IN (1, 2, 3)
        ORDER BY NVL(p.DATA_ALTERACAO, p.DATA) DESC
      `;

      try {
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return (result.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          status: p.STATUS,
          solicitante: p.SOLICITANTE,
          setor: p.SETOR || 'N/A',
          qtdItens: p.QTD_ITENS,
          valorTotal: p.VALOR_TOTAL,
        }));
      } catch (err: any) {
        console.error('[listarHistorico] Oracle error:', { errorNum: err?.errorNum, message: err?.message });
        throw err;
      }
    });

    res.json(pedidos);
  } catch (err) {
    console.error('ERRO AO BUSCAR HISTÓRICO DE PEDIDOS:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
  }
};