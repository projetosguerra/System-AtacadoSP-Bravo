import express from 'express';
import cors from 'cors';
import compression from 'compression';
import type { RequestHandler } from 'express';
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

  app.use(routes);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const msg = err?.message || 'Erro interno';
    const code = err?.statusCode || 500;
    console.error('[ERROR]', msg, err?.stack ? `\n${err.stack}` : '');
    res.status(code).json({ error: msg });
  });

  return app;
}