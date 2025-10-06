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
  const tnsAdmin = process.env.TNS_ADMIN;
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;

  if (!user || !password || !connectString) {
    console.error('[DB] Faltam variáveis de ambiente: DB_USER, DB_PASSWORD, DB_CONNECT_STRING.');
    printConnectDiagnostics();
    throw new Error('Variáveis de ambiente de DB ausentes.');
  }

  if (looksLikeAlias(connectString) && !tnsAdmin && !libDir) {
    printConnectDiagnostics();
    throw new Error('Configuração inválida: DB_CONNECT_STRING parece alias TNS mas TNS_ADMIN/InstantClient não foram configurados. Use Easy Connect (host:port/service_name) ou defina TNS_ADMIN.');
  }

  printConnectDiagnostics();

  pool = await oracledb.createPool({
    user,
    password,
    connectString,
    poolMin: Number(process.env.DB_POOL_MIN ?? 0),
    poolMax: Number(process.env.DB_POOL_MAX ?? 20),     
    poolIncrement: Number(process.env.DB_POOL_INC ?? 2),
    queueTimeout: Number(process.env.DB_QUEUE_TIMEOUT ?? 10000), 
    stmtCacheSize: Number(process.env.DB_STMT_CACHE ?? 50),
  });

  console.info('[DB] Connection pool initialized');
  return pool;
}

export async function withConnection<T>(fn: (conn: oracledb.Connection) => Promise<T>, opTimeoutMs = Number(process.env.DB_OP_TIMEOUT ?? 20000)): Promise<T> {
  if (!pool) await initPool();
  const conn = await pool!.getConnection();
  let timer: NodeJS.Timeout | null = null;

  try {
    const op = fn(conn);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        try {
          if (typeof conn.break === 'function') conn.break();
        } catch {}
        reject(Object.assign(new Error(`DB operation timeout after ${opTimeoutMs}ms`), { code: 'DB_OP_TIMEOUT', statusCode: 504 }));
      }, opTimeoutMs);
    });
    return await Promise.race([op, timeout]) as T;
  } finally {
    if (timer) clearTimeout(timer);
    try { await conn.close(); } catch (e) { console.error('[DB] erro ao fechar conexão', e); }
  }
}