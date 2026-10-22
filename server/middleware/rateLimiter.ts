import type { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const store = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract IP (works with trust proxy)
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').replace('::ffff:', '');
    const now = Date.now();

    const timestamps = store.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => now - t < options.windowMs);

    if (validTimestamps.length >= options.max) {
      const retryAfter = Math.ceil((validTimestamps[0] + options.windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: options.message,
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    validTimestamps.push(now);
    store.set(ip, validTimestamps);

    // Periodic cleanup of stale IPs every 1000 requests
    if (store.size > 2000) {
      for (const [key, list] of store.entries()) {
        if (list.every((t) => now - t >= options.windowMs)) {
          store.delete(key);
        }
      }
    }

    next();
  };
}

export const spinRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Bạn đang quay số quá nhanh. Vui lòng chờ vài giây rồi thử lại.',
});

export const ticketCheckRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Quá nhiều yêu cầu kiểm tra vé. Vui lòng thử lại sau 1 phút.',
});

export const claimSubmitRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Quá nhiều yêu cầu nhận thưởng. Vui lòng chờ 1 phút.',
});

export const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Quá nhiều lần thử đăng nhập quản trị không đúng. Vui lòng thử lại sau 15 phút.',
});
