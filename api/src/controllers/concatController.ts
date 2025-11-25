import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

const MIN_VALUE = 400;

function toNum(x: any, d = 0) { const n = Number(x); return Number.isFinite(n) ? n : d; }

async function getOrderMeta(conn: oracledb.Connection, id: number) {
  const r = await conn.execute(
    `SELECT p.NUMPEDRCA, p.STATUS, u.CODSETOR, u.CODUSUARIO
       FROM BRAMV_PEDIDOC p
       JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
      WHERE p.NUMPEDRCA = :id`,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const row: any = r.rows?.[0];
  if (!row) throw new Error('Pedido não encontrado.');
  return {
    status: Number(row.STATUS),
    codSetor: Number(row.CODSETOR),
    codUsuario: Number(row.CODUSUARIO)
  };
}

async function getOrderTotal(conn: oracledb.Connection, id: number) {
  const r = await conn.execute(
    `SELECT NVL(SUM(QT * PVENDA),0) AS TOTAL
       FROM BRAMV_PEDIDOI
      WHERE NUMPEDRCA = :id`,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return Number((r.rows?.[0] as any)?.TOTAL || 0);
}

export const getConcatContext = async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const data = await withConnection(async (conn) => {
      const meta = await conn.execute(
        `SELECT u.CODSETOR, p.STATUS
           FROM BRAMV_PEDIDOC p
           JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
          WHERE p.NUMPEDRCA = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row: any = meta.rows?.[0];
      if (!row) throw new Error('Pedido base não encontrado.');
      const codSetor = Number(row.CODSETOR);

      const baseItemsCountRes = await conn.execute(
        `SELECT COUNT(*) AS QTD FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const baseHasItems = toNum((baseItemsCountRes.rows?.[0] as any)?.QTD) > 0;

      const baseSumRes = await conn.execute(
        `SELECT NVL(SUM(QT * PVENDA), NULL) AS SOMA FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      let baseValue = toNum((baseSumRes.rows?.[0] as any)?.SOMA, NaN);
      if (!Number.isFinite(baseValue)) {
        const hdr = await conn.execute(
          `SELECT NVL(VALOR_TOTAL,0) AS TOTAL FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
          { id },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        baseValue = toNum((hdr.rows?.[0] as any)?.TOTAL);
      }

      const r = await conn.execute(
        `SELECT p.NUMPEDRCA AS ID,
                p.DATA         AS DATA,
                (u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,'')) AS SOLICITANTE,
                s.DESCRICAO    AS SETOR,
                COUNT(i.CODPROD)                                   AS QTD_ITENS,
                NVL(SUM(i.QT * i.PVENDA), p.VALOR_TOTAL)           AS TOTAL
           FROM BRAMV_PEDIDOC p
           LEFT JOIN BRAMV_PEDIDOI i ON i.NUMPEDRCA = p.NUMPEDRCA
           JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
           JOIN BRAMV_SETOR    s ON s.CODSETOR   = u.CODSETOR
          WHERE p.STATUS = 5
            AND u.CODSETOR = :setor
            AND p.NUMPEDRCA <> :id
            AND NVL(p.CONCAT_PAPEL,'NENHUM') <> 'ORIGEM'
          GROUP BY p.NUMPEDRCA, p.DATA, u.PRIMEIRO_NOME, u.ULTIMO_NOME, s.DESCRICAO, p.VALOR_TOTAL
         HAVING NVL(SUM(i.QT * i.PVENDA), p.VALOR_TOTAL) < :minv
          ORDER BY p.DATA ASC`,
        { setor: codSetor, id, minv: MIN_VALUE },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const candidatos = (r.rows || []).map((x: any) => ({
        id: Number(x.ID),
        data: x.DATA,
        solicitante: x.SOLICITANTE,
        setor: x.SETOR,
        total: toNum(x.TOTAL),
        hasItems: toNum(x.QTD_ITENS) > 0
      }));

      return { minValue: MIN_VALUE, baseValue, baseHasItems, candidatos, codSetor };
    });

    return res.json(data);
  } catch (e: any) {
    console.error('[concat] context erro:', e);
    return res.status(500).json({ error: e?.message || 'Falha ao obter contexto de concatenação.' });
  }
};

export const createConcat = async (req: any, res: any) => {
  const idBase = Number(req.params.id);
  const includeIds = (Array.isArray(req.body?.includeIds) ? req.body.includeIds : [])
    .map((x: any) => Number(x))
    .filter(Number.isFinite);

  const allIds = Array.from(new Set<number>([idBase, ...includeIds]));
  if (!Number.isFinite(idBase) || allIds.length < 2) {
    return res.status(400).json({ error: 'Selecione pelo menos um pedido adicional.' });
  }

  try {
    const outcome = await withConnection(async (conn) => {
      const placeholders = allIds.map((_, i) => `:p${i}`).join(',');
      const binds: Record<string, any> = {};
      allIds.forEach((val, i) => (binds[`p${i}`] = val));

      const lock = await conn.execute(
        `SELECT p.NUMPEDRCA AS ID,
                p.STATUS     AS STATUS,
                NVL(p.CONCAT_PAPEL,'') AS PAPEL,
                u.CODSETOR   AS CODSETOR
           FROM BRAMV_PEDIDOC p
           JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
          WHERE p.NUMPEDRCA IN (${placeholders})
          FOR UPDATE`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const rows = (lock.rows || []) as any[];
      if (rows.length !== allIds.length) throw new Error('Pedido inexistente na seleção.');

      const setorRef = Number(rows[0].CODSETOR);
      for (const r of rows) {
        if (Number(r.CODSETOR) !== setorRef) throw new Error(`Pedido #${r.ID} de outro setor.`);
      }

      const baseRow = rows.find(r => Number(r.ID) === idBase);
      if (!baseRow) throw new Error('Pedido base não encontrado.');
      const baseStatus = Number(baseRow.STATUS);
      if (![5, 3].includes(baseStatus)) throw new Error(`Pedido base #${idBase} não elegível (status=${baseStatus}).`);
      if (String(baseRow.PAPEL) === 'ORIGEM') throw new Error(`Pedido base #${idBase} já é origem de concatenação.`);

      for (const r of rows) {
        if (Number(r.ID) === idBase) continue;
        if (Number(r.STATUS) !== 5) throw new Error(`Pedido #${r.ID} não está pendente (status=${r.STATUS}).`);
        if (String(r.PAPEL) === 'ORIGEM') throw new Error(`Pedido #${r.ID} já é origem de concatenação.`);
      }

      const missing = await (async () => {
        const rs = await conn.execute(
          `SELECT NUMPEDRCA, COUNT(*) AS QTD
             FROM BRAMV_PEDIDOI
            WHERE NUMPEDRCA IN (${placeholders})
            GROUP BY NUMPEDRCA`,
          binds,
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const map = new Map<number, number>();
        for (const id of allIds) map.set(id, 0);
        for (const r of (rs.rows || []) as any[]) map.set(Number(r.NUMPEDRCA), toNum(r.QTD));
        return Array.from(map.entries()).filter(([, qtd]) => qtd <= 0).map(([id]) => id);
      })();
      if (missing.length) {
        const msg = `Não é possível concatenar. Pedido(s) sem itens: ${missing.join(', ')}.`;
        const err: any = new Error(msg);
        err.statusCode = 422;
        throw err;
      }

      const items = await conn.execute(
        `SELECT i.CODPROD,
                SUM(i.QT)     AS QT,
                MAX(i.PVENDA) AS PVENDA
           FROM BRAMV_PEDIDOI i
          WHERE i.NUMPEDRCA IN (${placeholders})
          GROUP BY i.CODPROD`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const aggItems = (items.rows || []).map((r: any) => ({
        codprod: toNum(r.CODPROD),
        qt: toNum(r.QT),
        pvenda: toNum(r.PVENDA),
      }));
      const total = aggItems.reduce((s, it) => s + it.qt * it.pvenda, 0);
      if (total < MIN_VALUE) throw new Error(`Total (${total.toFixed(2)}) abaixo do mínimo (${MIN_VALUE.toFixed(2)}).`);
      const qtdItens = aggItems.length;

      const cli = await conn.execute(
        `SELECT NVL(CODUSUR2, CODUSUR1) CODUSUR FROM PCCLIENT WHERE CODCLI = :codcli`,
        { codcli: Number(process.env.CODCLI ?? 27995) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const codRca = toNum((cli.rows?.[0] as any)?.CODUSUR, NaN);
      if (!Number.isFinite(codRca)) throw new Error('CODUSUR do cliente não encontrado.');

      const rNum = await conn.execute(
        `SELECT NVL(PROXNUMPEDFORCA,1) AS PROX FROM PCUSUARI WHERE CODUSUR = :rca FOR UPDATE`,
        { rca: codRca },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const newId = toNum((rNum.rows?.[0] as any)?.PROX, 1);
      await conn.execute(
        `UPDATE PCUSUARI SET PROXNUMPEDFORCA = NVL(PROXNUMPEDFORCA,1) + 1 WHERE CODUSUR = :rca`,
        { rca: codRca }
      );

      const rUser = await conn.execute(
        `SELECT CODUSUARIO FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
        { id: idBase },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const codUsuario = toNum((rUser.rows?.[0] as any)?.CODUSUARIO, NaN);
      const createdBy = toNum(req.user?.codUsuario ?? null, NaN) || null;

      await conn.execute(
        `INSERT INTO BRAMV_PEDIDOC
           (NUMPEDRCA, DATA, CODUSUARIO, STATUS, QTD_ITENS, VALOR_TOTAL,
            CONCAT_GRUPO_ID, CONCAT_PAPEL, CONCAT_CRIADO_EM, CONCAT_CRIADO_POR)
         VALUES
           (:id, SYSDATE, :codUsuario, 5, :qtd, :total,
            :grp, 'RESULTADO', SYSDATE, :createdBy)`,
        { id: newId, codUsuario, qtd: qtdItens, total, grp: newId, createdBy }
      );

      await conn.executeMany(
        `INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA)
         VALUES (:id, :codprod, :qt, :pvenda)`,
        aggItems.map(it => ({ id: newId, codprod: it.codprod, qt: it.qt, pvenda: it.pvenda }))
      );

      await conn.executeMany(
        `INSERT INTO BRAMV_PEDIDO_CONCAT_SRC (GRUPO_ID, PEDIDO_NOVO, PEDIDO_ORIGEM, CRIADO_POR)
         VALUES (:grp, :newId, :src, :createdBy)`,
        allIds.map(src => ({ grp: newId, newId, src, createdBy }))
      );
      await conn.execute(
        `UPDATE BRAMV_PEDIDOC
            SET STATUS = 9,
                CONCAT_GRUPO_ID = :grp,
                CONCAT_PAPEL = 'ORIGEM',
                CONCAT_CRIADO_EM = SYSDATE,
                CONCAT_CRIADO_POR = :createdBy
          WHERE NUMPEDRCA IN (${placeholders})
            AND NUMPEDRCA <> :newId`,
        { ...binds, grp: newId, createdBy, newId }
      );

      await conn.commit();
      return { newId, total, qtdItens };
    });

    res.status(201).json({ success: true, ...outcome });
  } catch (e: any) {
    const code = e?.statusCode || 400;
    console.error('[createConcat] erro:', e);
    res.status(code).json({ error: e?.message || 'Falha ao concatenar.' });
  }
};