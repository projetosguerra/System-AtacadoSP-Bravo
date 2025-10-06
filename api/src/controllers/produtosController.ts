import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

// Cache em memória por chave de paginação/termo
const produtosCache = new Map<string, { at: number; data: any[] }>();
const PROD_TTL = 60_000; // 60s

// Single-flight simples para coalescer chamadas duplicadas
const inflight = new Map<string, Promise<any[]>>();

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

    if (inflight.has(cacheKey)) {
      const data = await inflight.get(cacheKey)!;
      return res.json(data);
    }

    const p = (async () => {
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
          fetchArraySize: 100,
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
      return items;
    })()
      .catch((err) => {
        // Em qualquer erro, sirva o cache ou [] sem travar a UI
        console.warn('[produtos] erro, servindo cache/[]:', err?.message || err);
        const fallback = produtosCache.get(cacheKey)?.data || [];
        return fallback;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, p);
    const data = await p;
    return res.json(data);
  } catch (err: any) {
    console.error('ERRO AO BUSCAR PRODUTOS:', err);
    // Último fallback: cache geral mais recente de qualquer chave (ou [])
    const anyCached = Array.from(produtosCache.values()).sort((a, b) => b.at - a.at)[0]?.data || [];
    return res.json(anyCached);
  }
};