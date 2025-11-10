import express from 'express';
import cors from 'cors';
import compression from 'compression';
import type { RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';
import { cacheControlMiddleware } from './middleware/cacheControlMiddleware.js';
import { timing } from './middleware/timing.js';
import routes from './routes/index.js';

export function buildApp() {
  const app = express();

  app.use(cors());

  const compressionMw: RequestHandler = (compression as unknown as () => RequestHandler)();
  app.use(compressionMw);

  app.use(express.json());
  app.use(loggingMiddleware as RequestHandler);
  app.use('/api', cacheControlMiddleware as RequestHandler);
  app.use(timing as RequestHandler);

  const imgsDir = process.env.PROD_IMG_DIR;
  if (imgsDir && fs.existsSync(imgsDir)) {
    app.use('/api/media/produtos', (req, res, next) => {
      if (!/\.(jpe?g|png)$/i.test(req.path)) return res.status(403).end();
      next();
    });
    app.use('/api/media/produtos', express.static(imgsDir, {
      maxAge: process.env.NODE_ENV?.startsWith('prod') ? '7d' : '1h',
      index: false,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }));
    console.log(`[STATIC] /api/media/produtos -> ${imgsDir}`);
  } else if (!process.env.PROD_IMG_HTTP_PREFIX) {
    console.warn('[STATIC] Nenhum mapeamento de imagens. Defina PROD_IMG_DIR ou PROD_IMG_HTTP_PREFIX.');
  }

  app.get('/api/ping', (_req, res) => res.type('text/plain').send('pong'));

  app.use(routes);

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    next();
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const msg = err?.message || 'Erro interno';
    const code = err?.statusCode || 500;
    console.error('[ERROR]', msg, err?.stack ? `\n${err.stack}` : '');
    res.status(code).json({ error: msg });
  });

  return app;
}