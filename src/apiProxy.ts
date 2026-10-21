import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequest = IncomingMessage & { body?: unknown };

export async function proxyApiRequest(req: VercelRequest, res: ServerResponse) {
  res.setHeader('X-API-Proxy', 'vercel-function');
  const apiOrigin = process.env.API_ORIGIN?.trim().replace(/\/+$/, '');
  if (!apiOrigin) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'API chưa được cấu hình. Vui lòng thử lại sau.' }));
    return;
  }

  try {
    const requestUrl = new URL(req.url || '/', 'http://vercel.internal');
    const apiPath = requestUrl.searchParams.get('path');
    if (!apiPath) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Thiếu đường dẫn API cần chuyển tiếp.' }));
      return;
    }
    requestUrl.searchParams.delete('path');
    const upstreamUrl = new URL(`/api/${apiPath.replace(/^\/+/, '')}`, `${apiOrigin}/`);
    upstreamUrl.search = requestUrl.searchParams.toString();

    const headers = new Headers();
    for (const name of ['content-type', 'x-firebase-id-token', 'authorization']) {
      const value = req.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }

    const method = req.method || 'GET';
    const response = await fetch(upstreamUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD'
        ? undefined
        : req.body === undefined
          ? undefined
          : typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    res.statusCode = response.status;
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const disposition = response.headers.get('content-disposition');
    if (disposition) res.setHeader('Content-Disposition', disposition);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('[API proxy] Upstream request failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Không thể kết nối máy chủ sự kiện. Vé chưa bị sử dụng.' }));
  }
}
