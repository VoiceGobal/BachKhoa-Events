/**
 * Máy chủ chạy LOCAL (npm run dev / npm start).
 * Trên Vercel, toàn bộ API nằm ở api/index.ts (Vercel Function) – file này KHÔNG được dùng.
 */
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config({ path: ['.env.local', '.env'] });

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  // Import sau dotenv để các biến môi trường (Firebase, Gemini…) đã sẵn sàng
  const { default: api } = await import('./api/index');

  const server = express();
  server.use(api);

  if (process.env.NODE_ENV === 'production') {
    server.use(express.static(path.resolve('dist')));
    server.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
