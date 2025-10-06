import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const obterFinanceiro = async (req: any, res: any) => {
  const codcli = 27995;

  if (String(process.env.FINANCE_SAFE || '0') === '1') {
    return res.status(200).json({ gastosPorSetor: [] });
  }

  const days = Number(req.query?.days ?? process.env.FINANCE_DAYS ?? 14);
  const maxOrders = Number(req.query?.maxOrders ?? process.env.FINANCE_MAX_ORDERS ?? 300);

  const fallbackDays = Number(process.env.FINANCE_FALLBACK_DAYS ?? Math.min(days, 7));
  const fallbackMaxOrders = Number(process.env.FINANCE_FALLBACK_MAX_ORDERS ?? Math.min(maxOrders, 150));

  try {
    const payload = await withConnection(async (connection) => {
      async function runQuery(daysParam: number, maxOrdersParam: number) {
        const sql = `
          WITH LimitedOrders AS (
            SELECT d.NUMPEDRCA, u.CODSETOR
              FROM BRAMV_PEDIDOC d
              JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = d.CODUSUARIO
             WHERE d.STATUS = 1
               AND TRUNC(d.DATA) >= TRUNC(SYSDATE) - :days
               AND ROWNUM <= :maxOrders
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
          fetchArraySize: 200,
        });

        const gastosPorSetor = (result.rows || []).map((r: any) => ({
          CODSETOR: r.CODSETOR,
          DESCRICAO: r.DESCRICAO,
          GASTO_TOTAL: Number(r.GASTO_TOTAL || 0),
        }));
        return { gastosPorSetor };
      }

      async function getSetoresZeros() {
        const rs = await connection.execute(
          `SELECT CODSETOR, DESCRICAO FROM BRAMV_SETOR WHERE CODCLI = :codcli ORDER BY DESCRICAO`,
          { codcli },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 100 }
        );
        const gastosPorSetor = (rs.rows || []).map((r: any) => ({
          CODSETOR: r.CODSETOR,
          DESCRICAO: r.DESCRICAO,
          GASTO_TOTAL: 0,
        }));
        return { gastosPorSetor };
      }

      try {
        return await runQuery(days, maxOrders);
      } catch (err: any) {
        if (err?.errorNum === 4036) {
          try {
            return await runQuery(fallbackDays, fallbackMaxOrders);
          } catch {
            return await getSetoresZeros();
          }
        }
        throw err;
      }
    });

    res.status(200).json({ gastosPorSetor: payload.gastosPorSetor });
  } catch (err: any) {
    console.error('ERRO AO BUSCAR DADOS FINANCEIROS:', err);
    return res.status(200).json({ gastosPorSetor: [] });
  }
};