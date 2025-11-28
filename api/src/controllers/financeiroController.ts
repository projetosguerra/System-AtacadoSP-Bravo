import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const obterFinanceiro = async (req: any, res: any) => {
  const codcli = 27995;
  if (String(process.env.FINANCE_SAFE || '0') === '1') {
    return res.status(200).json({ gastosPorSetor: [] });
  }

  const days = Number(req.query?.days ?? process.env.FINANCE_DAYS ?? 45);
  const maxOrders = Number(req.query?.maxOrders ?? process.env.FINANCE_MAX_ORDERS ?? 600);

  try {
    const payload = await withConnection(async (connection) => {
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
      const binds = { codcli, days, maxOrders };
      const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 500 });
      const gastosPorSetor = (result.rows || []).map((r: any) => ({
        CODSETOR: r.CODSETOR,
        DESCRICAO: r.DESCRICAO,
        GASTO_TOTAL: Number(r.GASTO_TOTAL || 0),
      }));
      return { gastosPorSetor };
    });

    return res.status(200).json({ gastosPorSetor: payload.gastosPorSetor });
  } catch (err: any) {
    console.error('ERRO AO BUSCAR DADOS FINANCEIROS:', err);
    return res.status(200).json({ gastosPorSetor: [] });
  }
};

export const obterFinanceiroSetor = async (req: any, res: any) => {
  const codSetor = Number(req.params.codSetor);
  if (!Number.isFinite(codSetor)) return res.status(400).json({ error: 'codSetor inválido' });

  const days = Number(req.query?.days ?? 90);
  const maxOrders = Number(req.query?.maxOrders ?? 600);

  try {
    const data = await withConnection(async (connection) => {
      const sql = `
        WITH LimitedOrders AS (
          SELECT d.NUMPEDRCA
            FROM BRAMV_PEDIDOC d
            JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = d.CODUSUARIO
           WHERE d.STATUS = 1
             AND u.CODSETOR = :codSetor
             AND TRUNC(d.DATA) >= TRUNC(SYSDATE) - :days
             AND ROWNUM <= :maxOrders
        )
        SELECT NVL(SUM(i.QT * i.PVENDA), 0) AS GASTO_TOTAL
          FROM LimitedOrders lo
          JOIN BRAMV_PEDIDOI i ON i.NUMPEDRCA = lo.NUMPEDRCA
      `;
      const binds = { codSetor, days, maxOrders };
      const r = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const gastoTotal = Number((r.rows?.[0] as any)?.GASTO_TOTAL || 0);
      return { CODSETOR: codSetor, GASTO_TOTAL: gastoTotal };
    });

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('ERRO AO BUSCAR FINANCEIRO POR SETOR:', err);
    return res.status(200).json({ CODSETOR: codSetor, GASTO_TOTAL: 0 });
  }
};