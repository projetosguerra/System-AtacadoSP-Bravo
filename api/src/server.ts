import dotenv from 'dotenv';
dotenv.config();
import oracledb from 'oracledb';
import { buildApp } from './app.js';
import { initPool } from './db/pool.js';

const PORT = Number(process.env.PORT || 8888);

console.log('--- [FASE 1 de 4] Início do arquivo server.ts ---');

try {
  oracledb.initOracleClient();
  console.log('Oracle Client inicializado em modo Thick com sucesso!');
} catch (err) {
  console.error('ERRO FATAL na inicialização do Oracle Client:', err);
  process.exit(1);
}

async function main() {
  await initPool();

  const app = buildApp();

  console.log('--- [FASE 3 de 4] Todas as rotas registradas. Iniciando o servidor... ---');
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('--- [FASE 4 de 4] SERVIDOR INICIADO E ESCUTANDO! ---');
    console.log(`API Server rodando em http://localhost:${PORT}`);
  });

  // timeouts para não deixar fetch “eterno”
  // @ts-ignore Node types podem variar
  server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT ?? 60_000);
  // @ts-ignore
  server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT ?? 65_000);
}

main().catch((e) => {
  console.error('Falha ao subir o servidor:', e);
  process.exit(1);
});