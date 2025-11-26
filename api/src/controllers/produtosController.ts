import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';
import { toImageUrl } from '../utils/images.js';

const produtosCache = new Map<string, { at: number; data: any[] }>();
const PROD_TTL = 60_000;
const inflight = new Map<string, Promise<any[]>>();

const INFLIGHT_THRESHOLD = Number(process.env.PRODUTOS_INFLIGHT_THRESHOLD ?? 12);

function safeName(nome: any, codprod: any) {
  const raw = String(nome ?? '').trim();
  if (raw && raw !== '.') return raw;
  return `Produto ${codprod}`;
}

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

    if (inflight.size >= INFLIGHT_THRESHOLD) {
      res.set('Retry-After', '2');
      return res.status(503).json({ error: 'Busy, try again shortly.' });
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
          where += ` AND LOWER(NVL(P.NOMEECOMMERCE, P.DESCRICAO)) LIKE :pQ`;
          binds.pQ = `%${term}%`;
        }

        const sql = `
          WITH ProductBase AS (
            SELECT
              P.CODPROD,
              P.CODAUXILIAR,
              NVL(P.NOMEECOMMERCE, P.DESCRICAO) AS NOME,
              P.DESCRICAO                      AS DESC_ORIG,
              P.EMBALAGEM,
              P.DIRFOTOPROD                    AS DIRFOTO,
              MIN(NVL(I.PTABELA, 0))           AS PRECO
            FROM PCPRODUT P
            JOIN PCCONTRATOI I ON I.CODPROD = P.CODPROD
            JOIN PCCONTRATO  C ON C.CODCONTRATO = I.CODCONTRATO
            JOIN PCCLIENT   CLI ON CLI.CODCLI   = C.CODCLI
            WHERE ${where}
            GROUP BY
              P.CODPROD, P.CODAUXILIAR, P.NOMEECOMMERCE, P.DESCRICAO,
              P.EMBALAGEM, P.DIRFOTOPROD
          ),
          Paged AS (
            SELECT
              CODPROD, CODAUXILIAR, NOME, DESC_ORIG, PRECO, EMBALAGEM, DIRFOTO,
              ROW_NUMBER() OVER (ORDER BY NOME) AS RN
            FROM ProductBase
          )
          SELECT CODPROD, CODAUXILIAR, NOME, DESC_ORIG, PRECO, EMBALAGEM, DIRFOTO
          FROM Paged
          WHERE RN BETWEEN :pStart AND :pEnd
        `;

        const result = await connection.execute(sql, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchArraySize: 200,
        });

        return (result.rows || []).map((row: any) => {
          const nome = safeName(row.NOME, row.CODPROD);
          const descricao = String(row.DESC_ORIG || nome || '').trim();
          return {
            id: row.CODPROD,
            codigoAuxiliar: row.CODAUXILIAR,
            nome,
            preco: Number(row.PRECO || 0),
            unit: row.EMBALAGEM || '',
            descricao,
            imgUrl: toImageUrl(row.DIRFOTO, row.CODPROD),
            brand: null // opcional no frontend
          };
        });
      });

      produtosCache.set(cacheKey, { at: Date.now(), data: items });
      return items;
    })()
      .catch((err) => {
        const fallback = produtosCache.get(cacheKey)?.data || [];
        console.warn('[produtos] erro, servindo cache/[]:', err?.message || err);
        return fallback;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, p);
    const data = await p;
    return res.json(data);
  } catch (err: any) {
    const anyCached = Array.from(produtosCache.values()).sort((a, b) => b.at - a.at)[0]?.data || [];
    console.error('ERRO AO BUSCAR PRODUTOS:', err);
    return res.json(anyCached);
  }
};

export async function getProdutoDetalhe(req: any, res: any) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const codCli = Number(process.env.CODCLI ?? 27995);

  try {
    const data = await withConnection(async (conn) => {
      const binds = { pId: id, pCodCli: codCli };

      const sql = `
        SELECT
          P.CODPROD,
          P.CODAUXILIAR,
          NVL(P.NOMEECOMMERCE, P.DESCRICAO) AS NOME,
          dbms_lob.substr(P.DADOSTECNICOS, 4000, 1) AS DADOSTECNICOS,
          P.EMBALAGEM,
          P.DIRFOTOPROD AS DIRFOTO,
          (
            SELECT MIN(NVL(I.PTABELA, 0))
            FROM PCCONTRATOI I
            JOIN PCCONTRATO  C   ON C.CODCONTRATO = I.CODCONTRATO
            JOIN PCCLIENT    CLI ON CLI.CODCLI     = C.CODCLI
            WHERE CLI.CODCLI = :pCodCli
              AND I.CODPROD  = P.CODPROD
              AND TRUNC(C.DTVENCIMENTO) >= TRUNC(SYSDATE)
          ) AS PRECO
        FROM PCPRODUT P
        WHERE P.CODPROD = :pId
          AND EXISTS (
            SELECT 1
            FROM PCCONTRATOI I2
            JOIN PCCONTRATO  C2   ON C2.CODCONTRATO = I2.CODCONTRATO
            JOIN PCCLIENT    CLI2 ON CLI2.CODCLI     = C2.CODCLI
            WHERE CLI2.CODCLI = :pCodCli
              AND I2.CODPROD  = P.CODPROD
              AND TRUNC(C2.DTVENCIMENTO) >= TRUNC(SYSDATE)
          )
      `;

      const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const r = (result.rows || [])[0] as any;
      if (!r) return null;

      return {
        id: r.CODPROD,
        codigoAuxiliar: r.CODAUXILIAR,
        nome: safeName(r.NOME, r.CODPROD),
        descricaoTecnica: r.DADOSTECNICOS || '',
        preco: Number(r.PRECO || 0),
        embalagem: r.EMBALAGEM || '',
        imgUrl: toImageUrl(r.DIRFOTO, r.CODPROD),
        marca: null // removido join; mantém compat
      };
    });

    if (!data) return res.status(404).json({ error: 'Produto não encontrado ou sem contrato vigente.' });
    return res.json(data);
  } catch (e: any) {
    console.error('[getProdutoDetalhe] erro:', e);
    return res.status(500).json({ error: 'Erro interno ao buscar detalhes do produto.' });
  }
};

export async function getProdutosProximos(req: any, res: any) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  const codCli = Number(process.env.CODCLI ?? 27995);

  try {
    const data = await withConnection(async (conn) => {
      const sql = `
        WITH ProductBase AS (
          SELECT
            P.CODPROD,
            P.CODAUXILIAR,
            NVL(P.NOMEECOMMERCE, P.DESCRICAO) AS NOME,
            P.EMBALAGEM,
            P.DIRFOTOPROD          AS DIRFOTO,
            MIN(NVL(I.PTABELA, 0)) AS PRECO
          FROM PCPRODUT P
          JOIN PCCONTRATOI I ON I.CODPROD = P.CODPROD
          JOIN PCCONTRATO  C ON C.CODCONTRATO = I.CODCONTRATO
          JOIN PCCLIENT   CLI ON CLI.CODCLI   = C.CODCLI
          WHERE CLI.CODCLI = :pCodCli
            AND TRUNC(C.DTVENCIMENTO) >= TRUNC(SYSDATE)
          GROUP BY P.CODPROD, P.CODAUXILIAR, P.NOMEECOMMERCE, P.DESCRICAO,
                   P.EMBALAGEM, P.DIRFOTOPROD
        ),
        Paged AS (
          SELECT
            CODPROD, CODAUXILIAR, NOME, PRECO, EMBALAGEM, DIRFOTO,
            ROW_NUMBER() OVER (ORDER BY NOME) AS RN,
            COUNT(*)     OVER ()               AS TOTAL
          FROM ProductBase
        ),
        Curr AS (
          SELECT RN, TOTAL FROM Paged WHERE CODPROD = :pId
        )
        SELECT p.*
        FROM Paged p
        CROSS JOIN Curr c
        WHERE p.RN IN (
          MOD(c.RN    , c.TOTAL) + 1,
          MOD(c.RN + 1, c.TOTAL) + 1
        )
        ORDER BY p.RN
      `;

      const binds = { pId: id, pCodCli: codCli };
      const r = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

      return (r.rows || []).map((row: any) => ({
        id: row.CODPROD,
        codigoAuxiliar: row.CODAUXILIAR,
        nome: safeName(row.NOME, row.CODPROD),
        preco: Number(row.PRECO || 0),
        unit: row.EMBALAGEM || '',
        imgUrl: toImageUrl(row.DIRFOTO, row.CODPROD),
      }));
    });

    return res.json(Array.isArray(data) ? data : []);
  } catch (e: any) {
    console.error('[getProdutosProximos] erro:', e);
    return res.status(500).json({ error: 'Erro ao buscar próximos produtos.' });
  }
}