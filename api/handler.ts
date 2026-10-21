import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server';

type ApiRequest = IncomingMessage & { url?: string };

// Vercel routes every /api/* request here. Restore the original API path so
// Express can use the existing routes declared in server.ts unchanged.
export default function handler(req: ApiRequest, res: ServerResponse) {
  const requestUrl = new URL(req.url || '/', 'http://vercel.internal');
  const path = requestUrl.searchParams.get('path');
  if (!path) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Không tìm thấy API.' }));
    return;
  }

  requestUrl.searchParams.delete('path');
  req.url = `/api/${path.replace(/^\/+/, '')}${requestUrl.search}`;
  app(req as any, res as any);
}
