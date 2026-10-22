import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import spinRouter, { getEventInfoHandler } from './server/routes/spinRoutes';
import adminRouter from './server/routes/adminRoutes';
import { geminiRouter } from './server/routes/geminiRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for correct client IP detection behind reverse proxies (Cloud Run, Nginx)
app.set('trust proxy', 1);

// JSON body parsing with reasonable size limit
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'BKSamsong Event Backend',
  });
});

// Event general info
app.get('/api/event/info', getEventInfoHandler);

// Modular Routers
app.use('/api/spin', spinRouter);
app.use('/api/admin', adminRouter);
app.use('/api/gemini', geminiRouter);

// Setup Vite in Dev or Static files in Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`BKSamsong Event server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
