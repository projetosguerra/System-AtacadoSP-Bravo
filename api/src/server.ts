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
  app.listen(PORT, '0.0.0.0', () => {
    console.log('--- [FASE 4 de 4] SERVIDOR INICIADO E ESCUTANDO! ---');
    console.log(`API Server rodando em http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error('Falha ao subir o servidor:', e);
  process.exit(1);
});