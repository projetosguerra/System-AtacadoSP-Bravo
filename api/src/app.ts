import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { loggingMiddleware } from './middleware/loggingMiddleware.js';
import { cacheControlMiddleware } from './middleware/cacheControlMiddleware.js';
import { timing } from './middleware/timing.js';
import routes from './routes/index.js';

export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(loggingMiddleware);
  app.use('/api', cacheControlMiddleware);
  app.use(timing);

  // Monta todas as rotas
  app.use(routes);

  return app;
}