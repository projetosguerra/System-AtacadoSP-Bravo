import type { Request, Response } from 'express';
import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

type MonthRange = { start: Date; end: Date };

function getMonthRange(monthOffset = -1): MonthRange {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parsePerDay(param?: string): { min: number; max: number } {
  if (!param) return { min: 1, max: 2 };
  const m = String(param).split('-').map((v) => Number(v));
  if (m.length === 1 && Number.isFinite(m[0])) return { min: Math.max(1, Number(m[0]) || 1), max: Math.max(1, Number(m[0]) || 1) };
  if (m.length >= 2 && Number.isFinite(m[0]) && Number.isFinite(m[1])) {
    const a = Number(m[0]) || 1;
    const b = Number(m[1]) || 1;
    const min = Math.max(1, Math.min(a, b));
    const max = Math.max(1, Math.max(a, b));
    return { min, max };
  }
  return { min: 1, max: 2 };
}

export async function seedMonth(req: Request, res: Response) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Seed desabilitado em produção.' });
  }

  try {
    const monthOffset = Number(req.query.monthOffset ?? -1); 
    const perDay = parsePerDay(String(req.query.perDay ?? '1-2')); 
    const { start, end } = getMonthRange(monthOffset);

    const info = { days: 0, orders: 0, items: 0, from: start.toISOString(), to: end.toISOString(), perDay };

    await withConnection(async (conn) => {
      let codusuario = 1;
      const u = await conn.execute(`SELECT MIN(CODUSUARIO) AS U FROM BRAMV_USUARIOS WHERE CODUSUARIO IS NOT NULL`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
      codusuario = Number((u.rows?.[0] as any)?.U) || codusuario;

      let prod1 = 101, prod2 = 102;
      try {
        const p1 = await conn.execute(`SELECT MIN(CODPROD) AS P1 FROM PCPRODUT`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        prod1 = Number((p1.rows?.[0] as any)?.P1) || prod1;
        const p2 = await conn.execute(
          `SELECT CODPROD AS P2 FROM (SELECT CODPROD FROM PCPRODUT WHERE CODPROD > :p1 ORDER BY CODPROD) WHERE ROWNUM = 1`,
          { p1: prod1 },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        prod2 = Number((p2.rows?.[0] as any)?.P2) || prod2;
      } catch {
      }

      const statusCycle = [1, 3, 2, 5]; 
      let statusIndex = 0;

      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        info.days += 1;

        const qty = perDay.min === perDay.max ? perDay.min : perDay.min + ((d.getDate() % (perDay.max - perDay.min + 1)));
        for (let i = 0; i < qty; i++) {
          const nextIdRow = await conn.execute(`SELECT NVL(MAX(NUMPEDRCA), 0) + 1 AS ID FROM BRAMV_PEDIDOC`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
          const numpedrca = Number((nextIdRow.rows?.[0] as any)?.ID);

          const status = statusCycle[statusIndex % statusCycle.length];
          statusIndex++;

          await conn.execute(
            `INSERT INTO BRAMV_PEDIDOC (NUMPEDRCA, CODUSUARIO, STATUS, DATA)
             VALUES (:id, :usr, :st, :dt)`,
            { id: numpedrca, usr: codusuario, st: status, dt: d }
          );

          await conn.execute(
            `INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA) VALUES (:id, :p, :qt, :pv)`,
            { id: numpedrca, p: prod1, qt: 2, pv: 49.9 }
          );
          await conn.execute(
            `INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA) VALUES (:id, :p, :qt, :pv)`,
            { id: numpedrca, p: prod2, qt: 1, pv: 109.5 }
          );

          info.orders += 1;
          info.items += 2;
        }
      }

      await conn.commit();
    });

    return res.json({ ok: true, ...info });
  } catch (e: any) {
    console.error('[seedMonth] erro:', e);
    return res.status(500).json({ error: e?.message || 'Falha no seed.' });
  }
}

export async function cleanupSeedMonth(req: Request, res: Response) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Cleanup desabilitado em produção.' });
  }

  try {
    const monthOffset = Number(req.query.monthOffset ?? -1);
    const { start, end } = getMonthRange(monthOffset);

    const result = await withConnection(async (conn) => {
      const candidates = await conn.execute(
        `
        WITH MonthOrders AS (
          SELECT NUMPEDRCA
            FROM BRAMV_PEDIDOC
           WHERE TRUNC(DATA) BETWEEN TRUNC(:start) AND TRUNC(:end)
        ),
        ItemCounts AS (
          SELECT i.NUMPEDRCA,
                 SUM(CASE WHEN ABS(i.PVENDA - 49.9) < 0.0001 THEN 1 ELSE 0 END) AS C1,
                 SUM(CASE WHEN ABS(i.PVENDA - 109.5) < 0.0001 THEN 1 ELSE 0 END) AS C2,
                 COUNT(*) AS TOT
            FROM BRAMV_PEDIDOI i
           WHERE i.NUMPEDRCA IN (SELECT NUMPEDRCA FROM MonthOrders)
           GROUP BY i.NUMPEDRCA
        )
        SELECT NUMPEDRCA
          FROM ItemCounts
         WHERE C1 = 1 AND C2 = 1 AND TOT = 2
        `,
        { start, end },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const ids = (candidates.rows || []).map((r: any) => Number(r.NUMPEDRCA));
      if (!ids.length) {
        return { deletedHeaders: 0, deletedItems: 0, ids: [] as number[] };
      }

      const bindIds = ids.map((_, i) => `:p${i}`).join(',');
      const binds: Record<string, number> = {};
      ids.forEach((v, i) => (binds[`p${i}`] = v));

      const delItems = await conn.execute(
        `DELETE FROM BRAMV_PEDIDOI WHERE NUMPEDRCA IN (${bindIds})`,
        binds
      );
      const delHeaders = await conn.execute(
        `DELETE FROM BRAMV_PEDIDOC WHERE NUMPEDRCA IN (${bindIds})`,
        binds
      );

      await conn.commit();
      return { deletedHeaders: delHeaders.rowsAffected || 0, deletedItems: delItems.rowsAffected || 0, ids };
    });

    return res.json({ ok: true, ...result, monthOffset, from: getMonthRange(monthOffset).start, to: getMonthRange(monthOffset).end });
  } catch (e: any) {
    console.error('[cleanupSeedMonth] erro:', e);
    return res.status(500).json({ error: e?.message || 'Falha no cleanup.' });
  }
}