import oracledb from 'oracledb';

let pool: oracledb.Pool | null = null;

export async function initPool() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    connectString: process.env.DB_CONNECT_STRING!,
    poolMin: Number(process.env.DB_POOL_MIN || 5),
    poolMax: Number(process.env.DB_POOL_MAX || 20),
    poolIncrement: Number(process.env.DB_POOL_INC || 2),
    stmtCacheSize: Number(process.env.DB_STMT_CACHE || 50),
  });
  console.info('[DB] Connection pool initialized');
  return pool;
}

export async function withConnection<T>(fn: (conn: oracledb.Connection) => Promise<T>): Promise<T> {
  if (!pool) await initPool();
  const conn = await pool!.getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}