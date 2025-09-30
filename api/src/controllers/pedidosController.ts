import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

// Pendentes: versão leve com subconsultas por pedido + janela e limite
export const listarPendentes = async (_req: any, res: any) => {
  const days = Number(process.env.PENDENTES_DAYS || 30);
  const maxrows = Number(process.env.PENDENTES_MAXROWS || 300);

  try {
    const pedidos = await withConnection(async (connection) => {
      async function runQuery(withTotals: boolean) {
        const sql = `
          SELECT * FROM (
            SELECT
              p.NUMPEDRCA                                         AS ID,
              p.DATA                                              AS DATA,
              (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))   AS SOLICITANTE,
              s.DESCRICAO                                         AS SETOR
              ${withTotals ? `,
              (SELECT COUNT(*) 
                 FROM BRAMV_PEDIDOI i 
                WHERE i.NUMPEDRCA = p.NUMPEDRCA)                  AS QTD_ITENS,
              (SELECT NVL(SUM(i.QT * i.PVENDA),0) 
                 FROM BRAMV_PEDIDOI i 
                WHERE i.NUMPEDRCA = p.NUMPEDRCA)                  AS VALOR_TOTAL
              ` : `,
              0 AS QTD_ITENS,
              0 AS VALOR_TOTAL
              `}
            FROM BRAMV_PEDIDOC p
            LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
            LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
            WHERE p.STATUS = 5
              AND TRUNC(p.DATA) >= TRUNC(SYSDATE) - :days
            ORDER BY p.DATA DESC
          )
          WHERE ROWNUM <= :maxrows
        `;

        const result = await connection.execute(
          sql,
          { days, maxrows },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 50 }
        );

        return (result.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          solicitante: p.SOLICITANTE,
          unidadeAdmin: p.SETOR || 'N/A',
          qtdItens: Number(p.QTD_ITENS || 0),
          valor: Number(p.VALOR_TOTAL || 0),
        }));
      }

      try {
        return await runQuery(true);
      } catch (err: any) {
        if (err?.errorNum === 4036) {
          console.warn('[pendentes] ORA-04036. Fallback sem totais.');
          return await runQuery(false);
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

// Histórico: remove uso de U.ATUALIZADO_EM (coluna não existe) + janela/limite + fallback de memoria
export const listarHistorico = async (_req: any, res: any) => {
  const days = Number(process.env.HIST_DAYS || 90);
  const maxrows = Number(process.env.HIST_MAXROWS || 1000);

  try {
    const pedidos = await withConnection(async (connection) => {
      async function runQuery(withTotals: boolean) {
        const colsTotals = withTotals
          ? `,
            (SELECT COUNT(*) FROM BRAMV_PEDIDOI i WHERE i.NUMPEDRCA = p.NUMPEDRCA)       AS QTD_ITENS,
            (SELECT NVL(SUM(i.QT * i.PVENDA),0) FROM BRAMV_PEDIDOI i WHERE i.NUMPEDRCA = p.NUMPEDRCA) AS VALOR_TOTAL
          `
          : `,
            0 AS QTD_ITENS,
            0 AS VALOR_TOTAL
          `;

        const sql = `
          SELECT * FROM (
            SELECT
              p.NUMPEDRCA                                         AS ID,
              TRUNC(p.DATA)                                       AS DATA,
              p.STATUS                                            AS STATUS,
              (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))   AS SOLICITANTE,
              s.DESCRICAO                                         AS SETOR
              ${colsTotals}
            FROM BRAMV_PEDIDOC p
            LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
            LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
            WHERE p.STATUS IN (1, 2, 3)
              AND TRUNC(p.DATA) >= TRUNC(SYSDATE) - :days
            ORDER BY p.DATA DESC
          )
          WHERE ROWNUM <= :maxrows
        `;

        const result = await connection.execute(
          sql,
          { days, maxrows },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 50 }
        );

        return (result.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          status: p.STATUS,
          solicitante: p.SOLICITANTE,
          setor: p.SETOR || 'N/A',
          qtdItens: Number(p.QTD_ITENS || 0),
          valorTotal: Number(p.VALOR_TOTAL || 0),
        }));
      }

      try {
        return await runQuery(true);
      } catch (err: any) {
        if (err?.errorNum === 4036) {
          console.warn('[historico] ORA-04036. Fallback sem totais.');
          return await runQuery(false);
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