import oracledb from 'oracledb';
export async function getOracleConnection() {
  return oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
  });
}