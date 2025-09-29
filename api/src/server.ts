import dotenv from 'dotenv';
dotenv.config();
import oracledb from 'oracledb';
import { buildApp } from './app.js';
import { initPool } from './db/pool.js';

const PORT = Number(process.env.PORT || 8888);

console.log('--- [FASE 1 de 4] Início do arquivo server.ts ---');

try {
  const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
  if (libDir) {
    oracledb.initOracleClient({ libDir });
    console.log('Oracle Client (Thick) inicializado com sucesso em:', libDir);
  } else {
    console.log('Nenhum ORACLE_CLIENT_LIB_DIR definido. Usando Oracle Thin driver (sem initOracleClient).');
  }
} catch (err) {
  console.error('Falha ao inicializar Oracle Thick. Usando Oracle Thin driver. Detalhes:', err);
}

async function main() {
  await initPool();

  const app = buildApp();

  app.get('/health', (_req, res) => res.json({ ok: true }));

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