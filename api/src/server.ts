import dotenv from 'dotenv';
dotenv.config();
import oracledb from 'oracledb';
import { buildApp } from './app.js';
import { initPool } from './db/pool.js';

const PORT = Number(process.env.PORT || 8888);

console.log('--- [FASE 1 de 4] Início do arquivo server.ts ---');

// Para forçar THICK (com Instant Client 19+), defina as variáveis de ambiente:
// ORACLEDB_DRIVER_MODE=thick
// ORACLE_CLIENT_LIB_DIR=C:\\instantclient_19_24
const DRIVER_MODE = String(process.env.ORACLEDB_DRIVER_MODE || 'thin').toLowerCase();

if (DRIVER_MODE === 'thick') {
  try {
    const libDir = process.env.ORACLE_CLIENT_LIB_DIR; 
    if (libDir) {
      oracledb.initOracleClient({ libDir });
      console.log(`Oracle Client (Thick) carregado de: ${libDir}`);
    } else {
      oracledb.initOracleClient();
      console.log('Oracle Client (Thick) carregado (PATH do sistema).');
    }
    const v = (oracledb as any).oracleClientVersion || 0;
    if (v < 1801000000) {
      console.warn(`Oracle Client é ${ (oracledb as any).oracleClientVersionString || 'desconhecido' } (< 18.1). Recursos como callTimeout podem não funcionar. Recomenda-se usar THIN ou atualizar para 19c+.`);
    } else {
      console.log(`Oracle Client versão ${(oracledb as any).oracleClientVersionString} (ok).`);
    }
  } catch (err) {
    console.warn('Falha ao iniciar Oracle Client em modo Thick, seguindo em modo Thin. Detalhes:', err);
  }
} else {
  console.log('Usando Oracle driver em modo Thin (sem Instant Client).');
}

async function main() {
  try {
    await initPool();
  } catch (e) {
    console.error('Falha ao criar pool Oracle. Continuando; rotas que usam DB podem falhar até pool subir. Erro:', e);
  }

  const app = buildApp();

  console.log('--- [FASE 3 de 4] Todas as rotas registradas. Iniciando o servidor... ---');
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('--- [FASE 4 de 4] SERVIDOR INICIADO E ESCUTANDO! ---');
    console.log(`API Server rodando em http://localhost:${PORT}`);
  });

  server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT ?? 60_000);
  // @ts-ignore
  server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT ?? 65_000);

  process.on('unhandledRejection', (r) => {
    console.error('[unhandledRejection]', r);
  });
  process.on('uncaughtException', (e) => {
    console.error('[uncaughtException]', e);
  });
}

main().catch((e) => {
  console.error('Falha ao subir o servidor:', e);
  process.exit(1);
});