import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import productsRouter from './routes/products';
import cartRouter from './routes/cart';
import ordersRouter from './routes/orders';
import shippingRouter from './routes/shipping';
import addressesRouter from './routes/addresses';
import wishlistRouter from './routes/wishlist';
import adminProductsRouter from './routes/admin/products';
import adminOrdersRouter from './routes/admin/orders';
import adminSiteRouter from './routes/admin/site';
import adminDashboardRouter from './routes/admin/dashboard';
import adminUsersRouter from './routes/admin/users';
import adminFinanceRouter from './routes/admin/finance';
import adminShippingRouter from './routes/admin/shipping';
import adminCatalogsRouter from './routes/admin/catalogs';
import catalogsRouter from './routes/catalogs';
import consentRouter from './routes/consent';
import contactRouter from './routes/contact';
import newsletterRouter from './routes/newsletter';
import quotesRouter from './routes/quotes';
import siteRouter from './routes/site';
import categoriesRouter from './routes/categories';
import stripeWebhookRouter from './routes/webhooks/stripe';
import privacyRouter from './routes/privacy';
import { validateProductionEnv, warnDevelopmentEnv } from './lib/env-check';
import { getFrontendUrl } from './lib/urls';
import { prisma } from './lib/prisma';
import { initApiMonitoring, captureApiException } from './lib/monitoring';
import { globalApiLimiter } from './middleware/rateLimit';
import { securityHeaders } from './middleware/securityHeaders';
import { adminIpGate } from './middleware/adminGate';
import { internalErrorMessage } from './lib/safe-response';

dotenv.config();
validateProductionEnv();
warnDevelopmentEnv();

void initApiMonitoring();

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(securityHeaders);
app.use(globalApiLimiter);

app.use(cors({
  origin: getFrontendUrl(),
  credentials: true,
  exposedHeaders: ['X-Cart-Session'],
}));

app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json());

app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE !== 'true') {
    return next();
  }
  const path = req.path;
  if (
    path === '/api/health' ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/webhooks')
  ) {
    return next();
  }
  return res.status(503).json({
    error: 'Service temporarily unavailable for maintenance',
    maintenance: true,
  });
});

app.use('/uploads', (req, res, next) => {
  const relativePath = req.path.replace(/^\//, '');
  if (relativePath === 'invoices' || relativePath.startsWith('invoices/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/catalogs', catalogsRouter);
app.use('/api/consent', consentRouter);
app.use('/api/contact', contactRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/site', siteRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/admin', adminIpGate);
app.use('/api/admin/products', adminProductsRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/site', adminSiteRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/finance', adminFinanceRouter);
app.use('/api/admin/shipping-rates', adminShippingRouter);
app.use('/api/admin/catalogs', adminCatalogsRouter);

app.get('/api/health', async (_req, res) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const payload = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    version: process.env.SENTRY_RELEASE || 'local',
  };

  res.status(dbStatus === 'ok' ? 200 : 503).json(payload);
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  captureApiException(err, {
    method: req.method,
    path: req.path,
  });
  const status = typeof err === 'object' && err !== null && 'status' in err
    ? Number((err as { status?: number }).status) || 500
    : 500;
  res.status(status).json({
    error: internalErrorMessage(err),
  });
});

app.listen(port, () => {
  console.log(`Express API server running on port ${port}`);
});
