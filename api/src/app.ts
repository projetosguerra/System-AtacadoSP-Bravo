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

  return app;
}