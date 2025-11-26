import dotenv from 'dotenv';
dotenv.config();
import oracledb from 'oracledb';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { buildApp } from './app.js';
import { initPool } from './db/pool.js';

const PORT = Number(process.env.PORT || 8888);
console.log('--- [FASE 1 de 4] Início do arquivo server.ts ---');

const DRIVER_MODE = String(process.env.ORACLEDB_DRIVER_MODE || 'thin').toLowerCase();

oracledb.fetchAsString = [ oracledb.CLOB ];

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
      console.warn(`Oracle Client é ${(oracledb as any).oracleClientVersionString || 'desconhecido'} (< 18.1). Alguns recursos podem não funcionar.`);
    } else {
      console.log(`Oracle Client versão ${(oracledb as any).oracleClientVersionString} (ok).`);
    }
  } catch (err) {
    console.warn('Falha ao iniciar Oracle Client em modo Thick, usando Thin. Detalhes:', err);
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

  const imgDir = process.env.PROD_IMG_DIR?.trim();
  if (imgDir) {
    console.log(`[STATIC] Montando imagens de produtos: ${imgDir} -> /api/media/produtos`);
    const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
    app.use('/api/media/produtos', (req, res, next) => {
      const ext = path.extname(req.path).toLowerCase();
      if (ext && !allowedExt.has(ext)) return res.status(404).end();
      next();
    }, express.static(imgDir, {
      maxAge: process.env.IMAGES_MAX_AGE || '7d',
      fallthrough: true
    }));
  } else if (process.env.PROD_IMG_HTTP_PREFIX) {
    console.log(`[STATIC] Usando prefixo externo para imagens: ${process.env.PROD_IMG_HTTP_PREFIX}`);
  } else {
    console.log('[STATIC] Nenhum mapeamento de imagens definido (PROD_IMG_DIR ou PROD_IMG_HTTP_PREFIX). Placeholders serão usados.');
  }

  app.get('/api/debug/imagem/:name', (req, res) => {
    const dir = process.env.PROD_IMG_DIR?.trim();
    if (!dir) return res.status(500).json({ error: 'PROD_IMG_DIR não configurado' });
    const name = String(req.params.name || '').replace(/[/\\]+/g, '');
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      return res.json({ exists: st.isFile(), full });
    } catch (err) {
      return res.json({ exists: false, full });
    }
  });

  console.log('--- [FASE 3 de 4] Todas as rotas registradas. Iniciando o servidor... ---');
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('--- [FASE 4 de 4] SERVIDOR INICIADO E ESCUTANDO! ---');
    console.log(`API Server rodando em http://localhost:${PORT}`);
  });

  server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT ?? 60_000);
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