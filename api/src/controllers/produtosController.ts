import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';
import { getImagePrefix } from '../utils/imagePrefix.js';

const produtosCache = new Map<string, { at: number; data: any[] }>();
const PROD_TTL = 60_000;
const inflight = new Map<string, Promise<any[]>>();

const INFLIGHT_THRESHOLD = Number(process.env.PRODUTOS_INFLIGHT_THRESHOLD ?? 12);

function toImageUrl(rawPath: string | null | undefined, codprod: number) {
  const placeholder = `https://placehold.co/300x200/eeeeee/333333?text=Produto+${codprod}`;
  if (!rawPath) return placeholder;

  const filename = String(rawPath).replace(/\\/g, '/').split('/').pop();
  if (!filename) return placeholder;

  const httpPrefix = process.env.PROD_IMG_HTTP_PREFIX;
  if (httpPrefix) {
    return `${httpPrefix.replace(/\/+$/, '')}/${encodeURIComponent(filename)}`;
  }
  return `/api/media/produtos/${encodeURIComponent(filename)}`;
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
              /* Se for necessário mais tarde:
                 dbms_lob.substr(P.DADOSTECNICOS, 4000, 1) AS DADOSTECNICOS,
              */
              P.EMBALAGEM,
              P.DIRFOTOPROD          AS DIRFOTO,
              MIN(NVL(I.PTABELA, 0)) AS PRECO
            FROM PCPRODUT P
            JOIN PCCONTRATOI I ON I.CODPROD = P.CODPROD
            JOIN PCCONTRATO  C ON C.CODCONTRATO = I.CODCONTRATO
            JOIN PCCLIENT   CLI ON CLI.CODCLI = C.CODCLI
            /* Joins extras do script do seu chefe (não usados agora, mas mantidos para compatibilidade):
               JOIN PCMARCA        M   ON P.CODMARCA = M.CODMARCA
               LEFT JOIN PCCATEGORIA    CAT ON P.CODCATEGORIA = CAT.CODCATEGORIA
               LEFT JOIN PCSUBCATEGORIA SUB ON P.CODSUBCATEGORIA = SUB.CODSUBCATEGORIA
            */
            WHERE ${where}
            GROUP BY
              P.CODPROD, P.CODAUXILIAR, P.NOMEECOMMERCE, P.DESCRICAO,
              P.EMBALAGEM, P.DIRFOTOPROD
          ),
          Paged AS (
            SELECT
              CODPROD, CODAUXILIAR, NOME, PRECO, EMBALAGEM, DIRFOTO,
              ROW_NUMBER() OVER (ORDER BY NOME) AS RN
            FROM ProductBase
          )
          SELECT CODPROD, CODAUXILIAR, NOME, PRECO, EMBALAGEM, DIRFOTO
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
          nome: row.NOME,
          preco: row.PRECO,
          unit: row.EMBALAGEM,
          descricao: `Descrição para ${row.NOME}`,
          imgUrl: toImageUrl(row.DIRFOTO, row.CODPROD),
        }));
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