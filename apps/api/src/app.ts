import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ZodError } from 'zod';
import { env } from './env';
import { ApiError } from './http';
import './types';

import { authRouter } from './modules/auth';
import { dashboardRouter } from './modules/dashboard';
import { inventoryRouter, locationsRouter } from './modules/inventory';
import { inboundRouter } from './modules/inbound';
import { outboundRouter } from './modules/outbound';
import { warehousesRouter } from './modules/warehouses';
import { customersRouter } from './modules/customers';
import { usersRouter, rolesRouter } from './modules/users';
import { integrationsRouter } from './modules/integrations';
import { apiKeysRouter } from './modules/apikeys';
import { auditRouter } from './modules/audit';
import { aiRouter } from './modules/ai';
import { attachmentsRouter } from './modules/attachments';
import { billingRouter } from './modules/billing';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '2mb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aetherwms-api', time: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/inbound', inboundRouter);
  app.use('/api/outbound', outboundRouter);
  app.use('/api/warehouses', warehousesRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/attachments', attachmentsRouter);
  app.use('/api/billing', billingRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // Centralized error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    }
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
