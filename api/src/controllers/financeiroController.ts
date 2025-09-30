import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const obterFinanceiro = async (_req: any, res: any) => {
  const codcli = 27995;

  // Parâmetros com defaults conservadores, ajustáveis via env
  const days = Number(process.env.FINANCE_DAYS || 90);              // janela
  const maxOrders = Number(process.env.FINANCE_MAX_ORDERS || 1500); // limite de pedidos
  const fallbackDays = Number(process.env.FINANCE_FALLBACK_DAYS || Math.min(days, 30));
  const fallbackMaxOrders = Number(process.env.FINANCE_FALLBACK_MAX_ORDERS || Math.min(maxOrders, 400));

  try {
    const payload = await withConnection(async (connection) => {
      async function runQuery(daysParam: number, maxOrdersParam: number) {
        const sql = `
          WITH ApprovedOrders AS (
            SELECT d.NUMPEDRCA, u.CODSETOR, d.DATA
            FROM BRAMV_PEDIDOC d
            JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = d.CODUSUARIO
            WHERE d.STATUS = 1
              AND TRUNC(d.DATA) >= TRUNC(SYSDATE) - :days
            ORDER BY d.DATA DESC
          ),
          LimitedOrders AS (
            SELECT NUMPEDRCA, CODSETOR
            FROM ApprovedOrders
            WHERE ROWNUM <= :maxOrders
          ),
          SpendBySetor AS (
            SELECT lo.CODSETOR,
                   SUM(NVL(i.QT,0) * NVL(i.PVENDA,0)) AS GASTO_TOTAL
            FROM LimitedOrders lo
            JOIN BRAMV_PEDIDOI i ON i.NUMPEDRCA = lo.NUMPEDRCA
            GROUP BY lo.CODSETOR
          )
          SELECT s.CODSETOR,
                 s.DESCRICAO,
                 NVL(sb.GASTO_TOTAL, 0) AS GASTO_TOTAL
          FROM BRAMV_SETOR s
          LEFT JOIN SpendBySetor sb ON sb.CODSETOR = s.CODSETOR
          WHERE s.CODCLI = :codcli
          ORDER BY s.DESCRICAO
        `;

        const binds = { codcli, days: daysParam, maxOrders: maxOrdersParam };

        const result = await connection.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchArraySize: 50,
        });

        const gastosPorSetor = (result.rows || []).map((r: any) => ({
          CODSETOR: r.CODSETOR,
          DESCRICAO: r.DESCRICAO,
          GASTO_TOTAL: Number(r.GASTO_TOTAL || 0),
        }));

        return { gastosPorSetor, daysUsed: daysParam, maxOrdersUsed: maxOrdersParam };
      }

      async function getSetoresZeros() {
        const rs = await connection.execute(
          `SELECT CODSETOR, DESCRICAO FROM BRAMV_SETOR WHERE CODCLI = :codcli ORDER BY DESCRICAO`,
          { codcli },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 50 }
        );
        const gastosPorSetor = (rs.rows || []).map((r: any) => ({
          CODSETOR: r.CODSETOR,
          DESCRICAO: r.DESCRICAO,
          GASTO_TOTAL: 0,
        }));
        return { gastosPorSetor, fallback: true as const };
      }

      try {
        return await runQuery(days, maxOrders);
      } catch (err: any) {
        console.error('[financeiro] Oracle error (attempt 1)', { errorNum: err?.errorNum, message: err?.message });
        if (err?.errorNum === 4036) {
          try {
            const fb = await runQuery(fallbackDays, fallbackMaxOrders);
            console.warn('[financeiro] Fallback applied due to ORA-04036', {
              daysUsed: fb.daysUsed,
              maxOrdersUsed: fb.maxOrdersUsed,
            });
            return fb;
          } catch (err2) {
            console.error('[financeiro] Fallback attempt also failed.', err2);
            const zeros = await getSetoresZeros();
            console.warn('[financeiro] Returning zeros payload to keep UI working.');
            return zeros;
          }
        }
        throw err;
      }
    });

    res.status(200).json({ gastosPorSetor: payload.gastosPorSetor });
  } catch (err: any) {
    console.error('ERRO AO BUSCAR DADOS FINANCEIROS:', err);
    res.status(500).json({ error: 'Erro ao buscar dados financeiros.' });
  }
};