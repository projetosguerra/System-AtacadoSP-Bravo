import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

const produtosCache = new Map<string, { at: number; data: any[] }>();
const PROD_TTL = 60_000; // 60s

export const listarProdutos = async (req: any, res: any) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(12, Number(req.query.pageSize || 24)));
    const term = String(req.query.q || '').trim().toLowerCase();
    const offset = (page - 1) * pageSize;

    const cacheKey = `p=${page}:s=${pageSize}:q=${term}`;
    const cached = produtosCache.get(cacheKey);
    if (cached && Date.now() - cached.at < PROD_TTL) {
      return res.json(cached.data);
    }

    const items = await withConnection(async (connection) => {
      const binds: Record<string, any> = {
        pStart: offset + 1,
        pEnd: offset + pageSize,
      };

      let where = `
        CLI.CODCLI = 27995
        AND C.CODCLI = CLI.CODCLI
        AND I.CODCONTRATO = C.CODCONTRATO
        AND P.CODPROD = I.CODPROD
        AND TRUNC(C.DTVENCIMENTO) >= TRUNC(SYSDATE)
      `;

      if (term) {
        where += ` AND LOWER(P.DESCRICAO) LIKE :pQ`;
        binds.pQ = `%${term}%`;
      }

      const sql = `
        WITH ProductBase AS (
          SELECT
            P.CODPROD,
            P.CODAUXILIAR,
            P.DESCRICAO,
            P.EMBALAGEM,
            MIN(NVL(I.PTABELA, 0)) AS PRECO
          FROM PCPRODUT P
          JOIN PCCONTRATOI I ON I.CODPROD = P.CODPROD
          JOIN PCCONTRATO  C ON C.CODCONTRATO = I.CODCONTRATO
          JOIN PCCLIENT   CLI ON CLI.CODCLI = C.CODCLI
          WHERE ${where}
          GROUP BY P.CODPROD, P.CODAUXILIAR, P.DESCRICAO, P.EMBALAGEM
        ),
        Paged AS (
          SELECT
            CODPROD, CODAUXILIAR, DESCRICAO, PRECO, EMBALAGEM,
            ROW_NUMBER() OVER (ORDER BY DESCRICAO) AS RN
          FROM ProductBase
        )
        SELECT CODPROD, CODAUXILIAR, DESCRICAO, PRECO, EMBALAGEM
        FROM Paged
        WHERE RN BETWEEN :pStart AND :pEnd
      `;

      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 50,
      });

      return (result.rows || []).map((row: any) => ({
        id: row.CODPROD,
        codigoAuxiliar: row.CODAUXILIAR,
        nome: row.DESCRICAO,
        preco: row.PRECO,
        unit: row.EMBALAGEM,
        descricao: `Descrição para ${row.DESCRICAO}`,
        imgUrl: `https://placehold.co/300x200/eeeeee/333333?text=Produto+${row.CODPROD}`,
      }));
    });

    produtosCache.set(cacheKey, { at: Date.now(), data: items });
    res.json(items);
  } catch (err: any) {
    if (err?.errorNum === 4036) {
      const page = Math.max(1, Number(req.query.page || 1));
      const pageSize = Math.min(50, Math.max(12, Number(req.query.pageSize || 24)));
      const term = String(req.query.q || '').trim().toLowerCase();
      const cacheKey = `p=${page}:s=${pageSize}:q=${term}`;
      const cached = produtosCache.get(cacheKey);
      console.warn('[produtos] ORA-04036 (PGA). Servindo cache anterior ou [].');
      return res.json(cached?.data || []);
    }

    console.error('ERRO AO BUSCAR PRODUTOS:', err);
    res.status(500).json({ error: 'Erro ao buscar produtos do banco de dados.' });
  }
};