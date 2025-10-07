import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';
import { gatePendentes, gateHistorico } from '../utils/gates.js';

function cap(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const listarPendentes = async (req: any, res: any) => {
  const SAT_THRESHOLD = Number(process.env.PENDENTES_QUEUE_THRESHOLD ?? 5);
  if (gatePendentes.isSaturated(SAT_THRESHOLD)) {
    res.set('Retry-After', '3');
    return res.status(503).json({ error: 'Busy, try again shortly.' });
  }

  return gatePendentes.run(async () => {
    const days = cap(Number(req.query?.days ?? process.env.PENDENTES_DAYS ?? 30), 7, 45);
    const maxrows = cap(Number(req.query?.maxrows ?? process.env.PENDENTES_MAXROWS ?? 200), 10, 200);

    try {
      const pedidos = await withConnection(async (connection) => {
        const sql = `
          SELECT * FROM (
            SELECT
              p.NUMPEDRCA                                         AS ID,
              p.DATA                                              AS DATA,
              (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))   AS SOLICITANTE,
              s.DESCRICAO                                         AS SETOR,
              NVL(p.QTD_ITENS, 0)                                 AS QTD_ITENS,
              NVL(p.VALOR_TOTAL, 0)                               AS VALOR_TOTAL
            FROM BRAMV_PEDIDOC p
            LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
            LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
            WHERE p.STATUS = 5
              AND p.DATA >= TRUNC(SYSDATE) - :days
            ORDER BY p.DATA DESC
          )
          WHERE ROWNUM <= :maxrows
        `;
        const r = await connection.execute(sql, { days, maxrows }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 });
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
    }
  });
};

export const listarHistorico = async (req: any, res: any) => {
  const SAT_THRESHOLD = Number(process.env.HIST_QUEUE_THRESHOLD ?? 5);
  if (gateHistorico.isSaturated(SAT_THRESHOLD)) {
    res.set('Retry-After', '3');
    return res.status(503).json({ error: 'Busy, try again shortly.' });
  }

  return gateHistorico.run(async () => {
    const days = cap(Number(req.query?.days ?? process.env.HIST_DAYS ?? 30), 7, 45);
    const maxrows = cap(Number(req.query?.maxrows ?? process.env.HIST_MAXROWS ?? 300), 50, 400);

    try {
      const pedidos = await withConnection(async (connection) => {
        const sql = `
          SELECT * FROM (
            SELECT
              p.NUMPEDRCA                                         AS ID,
              p.DATA                                              AS DATA,
              p.STATUS                                            AS STATUS,
              (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,''))   AS SOLICITANTE,
              s.DESCRICAO                                         AS SETOR,
              NVL(p.QTD_ITENS, 0)                                 AS QTD_ITENS,
              NVL(p.VALOR_TOTAL, 0)                               AS VALOR_TOTAL
            FROM BRAMV_PEDIDOC p
            LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
            LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
            WHERE p.STATUS IN (1,2,3)
              AND p.DATA >= TRUNC(SYSDATE) - :days
            ORDER BY p.DATA DESC
          )
          WHERE ROWNUM <= :maxrows
        `;
        const r = await connection.execute(sql, { days, maxrows }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 });
        return (r.rows || []).map((p: any) => ({
          id: p.ID,
          data: p.DATA,
          status: p.STATUS,
          solicitante: p.SOLICITANTE,
          setor: p.SETOR || 'N/A',
          qtdItens: Number(p.QTD_ITENS || 0),
          valorTotal: Number(p.VALOR_TOTAL || 0),
        }));
      });

      return res.json(pedidos);
    } catch (err) {
      console.error('ERRO AO BUSCAR HISTÓRICO DE PEDIDOS:', err);
      return res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
    }
  });
};