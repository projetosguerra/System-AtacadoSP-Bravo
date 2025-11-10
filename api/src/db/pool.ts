import oracledb from 'oracledb';

let pool: oracledb.Pool | null = null;

const POOL_MIN = Number(process.env.DB_POOL_MIN ?? 0);
const POOL_MAX = Number(process.env.DB_POOL_MAX ?? 20);
const POOL_INC = Number(process.env.DB_POOL_INC ?? 1);
const POOL_TIMEOUT = Number(process.env.DB_POOL_TIMEOUT ?? 60); // seconds
const QUEUE_TIMEOUT = Number(process.env.DB_QUEUE_TIMEOUT ?? 10_000); // ms
const STMT_CACHE = Number(process.env.DB_STMT_CACHE ?? 100);

let warnedCallTimeout = false;

export async function initPool() {
  if (pool) return pool;

  const p = await oracledb.createPool({
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    connectString: process.env.DB_CONNECT_STRING!,
    poolMin: POOL_MIN,
    poolMax: POOL_MAX,
    poolIncrement: POOL_INC,
    poolTimeout: POOL_TIMEOUT,
    queueTimeout: QUEUE_TIMEOUT,
    homogeneous: true,
    stmtCacheSize: STMT_CACHE,
    enableStatistics: true,
  });

  pool = p;
  console.log(`[DB] Pool criado (min=${POOL_MIN} max=${POOL_MAX} inc=${POOL_INC} queueTimeout=${QUEUE_TIMEOUT}ms stmtCache=${STMT_CACHE})`);
  return pool;
}

export function getPool(): oracledb.Pool {
  if (!pool) throw new Error('Pool não inicializado. Chame initPool() antes.');
  return pool!;
}

type WithConnMeta = { acquireMs: number };

function sanitizeSchemaName(v?: string | null) {
  const s = (v || '').trim();
  return s && /^[A-Z0-9_#$]{1,30}$/i.test(s) ? s : '';
}

export async function withConnection<T>(
  fn: (conn: oracledb.Connection, meta?: WithConnMeta) => Promise<T>
): Promise<T> {
  const p = getPool();
  const t0 = Date.now();
  let conn: oracledb.Connection | null = null;
  try {
    conn = await p.getConnection();
    const acquireMs = Date.now() - t0;

    const CALL_TIMEOUT = Number(process.env.DB_OP_TIMEOUT ?? 20_000);
    try {
      (conn as any).callTimeout = CALL_TIMEOUT;
    } catch (e: any) {
      if (!warnedCallTimeout) {
        warnedCallTimeout = true;
        console.warn(`[DB] callTimeout não suportado no client atual: ${e?.message || e}`);
      }
    }

    const schema = sanitizeSchemaName(process.env.DB_SCHEMA);
    if (schema) {
      await conn.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${schema}`);
    }

    return await fn(conn, { acquireMs });
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) { console.error('[DB] Erro ao fechar conexão:', e); }
    }
  }
}

export function getPoolStatsText() {
  const p = getPool() as any;
  return typeof p.getStatistics === 'function' ? p.getStatistics() : 'Statistics indisponíveis (enableStatistics=false).';
}