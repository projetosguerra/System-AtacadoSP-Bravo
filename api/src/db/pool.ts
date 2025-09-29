import oracledb from 'oracledb';

function looksLikeAlias(connectString: string) {
  return !(connectString.includes(':') && connectString.includes('/'));
}

function printConnectDiagnostics() {
  const cs = process.env.DB_CONNECT_STRING || '';
  const tnsAdmin = process.env.TNS_ADMIN;
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;

  console.info('[DB] Diagnostics:');
  console.info('  - Using Thin mode:', libDir ? 'NO (Thick requested)' : 'YES (no ORACLE_CLIENT_LIB_DIR)');
  console.info('  - DB_CONNECT_STRING:', cs ? '(set)' : '(missing)');
  console.info('  - TNS_ADMIN:', tnsAdmin || '(not set)');
  if (cs) {
    if (looksLikeAlias(cs)) {
      console.warn('  - DB_CONNECT_STRING parece um alias TNS. Sem TNS_ADMIN, o Thin driver não vai resolver.');
      console.warn('    Solução 1: Use Easy Connect (host:port/service_name).');
      console.warn('    Solução 2: Configure TNS_ADMIN apontando para sua pasta com tnsnames.ora.');
    } else {
      console.info('  - DB_CONNECT_STRING parece Easy Connect (host:port/service).');
    }
  }
}

let pool: oracledb.Pool | null = null;

export async function initPool() {
  if (pool) return pool;

  const user = process.env.DB_USER!;
  const password = process.env.DB_PASSWORD!;
  const connectString = process.env.DB_CONNECT_STRING!;

  if (!user || !password || !connectString) {
    console.error('[DB] Faltam variáveis de ambiente: DB_USER, DB_PASSWORD, DB_CONNECT_STRING.');
    printConnectDiagnostics();
    throw new Error('Variáveis de ambiente de DB ausentes.');
  }

  printConnectDiagnostics();

  pool = await oracledb.createPool({
    user,
    password,
    connectString,
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