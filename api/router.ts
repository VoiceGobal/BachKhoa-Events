import app from '../server';

export default function handler(req: any, res: any) {
  const incomingUrl = new URL(req.url || '/', 'http://localhost');
  const wildcard = req.query?.path;
  const requestedPath = Array.isArray(wildcard) ? wildcard.join('/') : wildcard;

  if (typeof requestedPath !== 'string' || !requestedPath.trim()) {
    return res.status(404).json({ error: 'Không tìm thấy API.' });
  }

  const route = requestedPath.replace(/^\/+/, '');
  if (route.split('/').some((segment: string) => segment === '.' || segment === '..')) {
    return res.status(400).json({ error: 'Đường dẫn API không hợp lệ.' });
  }

  // The rewrite sends /api/:path* to this concrete Vercel Function and
  // preserves the captured path in ?path=. Restore the URL expected by Express.
  incomingUrl.searchParams.delete('path');
  const query = incomingUrl.searchParams.toString();
  req.url = `/api/${route}${query ? `?${query}` : ''}`;

  return app(req, res);
}
