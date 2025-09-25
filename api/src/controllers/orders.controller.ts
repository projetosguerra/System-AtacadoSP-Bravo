import type { Request, Response } from 'express';
import oracledb from 'oracledb';
import { getOracleConnection } from '../db/oracle.js';

export async function getPendingOrders(req: Request, res: Response) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 5)));
  const includeInAnalysis = String(req.query.includeInAnalysis ?? 'true') === 'true';
  const statuses = includeInAnalysis ? [5, 3] : [5];

  const sql = `
    SELECT *
    FROM (
      SELECT
        c.ID            AS "id",
        c.NUMERO        AS "numero",
        c.STATUS        AS "status",
        c.VALOR_TOTAL   AS "total",
        -- Se VALOR_TOTAL não existisse, poderíamos usar:
        -- (SELECT SUM(i.QTDE * i.VALOR) FROM BRAMV_PEDIDOI i WHERE i.ID_PEDIDOC = c.ID) AS "total",
        c.DATA_CRIACAO  AS "dataCriacao",
        s.NOME          AS "setor",
        u.NOME          AS "solicitante",
        ROW_NUMBER() OVER (ORDER BY c.DATA_CRIACAO DESC) AS rn
      FROM BRAMV_PEDIDOC c
        JOIN BRAMV_SETOR s ON s.ID = c.ID_SETOR
        JOIN BRAMV_USUARIOS u ON u.ID = c.ID_USUARIO
      WHERE c.STATUS IN (${statuses.map((_, i) => `:${'st'+i}`).join(',')})
    )
    WHERE rn <= :limit
  `;

  const binds: Record<string, any> = { limit };
  statuses.forEach((st, i) => (binds['st' + i] = st));

  let conn: oracledb.Connection | null = null;
  try {
    conn = await getOracleConnection();
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const items = (result.rows ?? []).map((r: any) => ({
      id: r.id,
      numero: r.numero,
      status: r.status,
      total: Number(r.total ?? 0),
      dataCriacao: r.dataCriacao,
      setor: r.setor,
      solicitante: r.solicitante,
    }));

    return res.json({ items });
  } catch (err) {
    console.error('getPendingOrders error:', err);
    return res.status(500).json({ message: 'Erro ao carregar pedidos pendentes' });
  } finally {
    if (conn) await conn.close();
  }
}