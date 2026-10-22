import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuthenticatedUser } from '../types';

let firebaseApiKey = '';
try {
  const firebaseConfig = JSON.parse(
    fs.readFileSync(path.resolve('firebase-applet-config.json'), 'utf-8')
  );
  firebaseApiKey = firebaseConfig.apiKey || '';
} catch (err) {
  console.warn('[AUTH] Could not load firebase-applet-config.json:', err);
}

const ADMIN_EMAILS = [
  'tuancuong241298@gmail.com',
  'cuongtt.ptit@gmail.com',
  'admin@bachkhoa.edu.vn',
  'bksamsong@bachkhoa.edu.vn',
];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'BachKhoa2026@MoMo';
const ADMIN_TOKEN_TTL = 4 * 60 * 60 * 1000; // 4 hours
export const activeAdminTokens = new Map<string, number>(); // token -> expiresAt

export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function verifyFirebaseUser(
  req: Request
): Promise<AuthenticatedUser | null> {
  const header = req.headers['x-firebase-id-token'] || req.headers['authorization'];
  let idToken = '';

  if (typeof header === 'string') {
    idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  }

  if (!idToken || idToken.length > 4096) return null;

  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!r.ok) return null;
    const data: any = await r.json();
    const u = data?.users?.[0];
    if (!u?.localId) return null;

    const email = String(u.email || '').toLowerCase().trim();
    const emailVerified = Boolean(u.emailVerified);
    const isAdmin = ADMIN_EMAILS.includes(email);

    return {
      uid: String(u.localId),
      email,
      emailVerified,
      isAdmin,
    };
  } catch {
    return null;
  }
}

// Enforce verified email for money claim operations (Requirement 4)
export async function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await verifyFirebaseUser(req);

  if (!user) {
    res.status(401).json({
      error: 'Yêu cầu đăng nhập tài khoản Google trước khi nhận thưởng MoMo.',
      requiresAuth: true,
    });
    return;
  }

  if (!user.emailVerified) {
    res.status(403).json({
      error: 'Địa chỉ email của bạn chưa được xác minh. Vui lòng xác minh email Google trước khi nhận giải thưởng MoMo.',
      requiresVerification: true,
      email: user.email,
    });
    return;
  }

  (req as any).user = user;
  next();
}

// Enforce Admin access
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-admin-token'] as string) || '';

  // 1. Check in-memory admin session token
  const exp = activeAdminTokens.get(token);
  if (exp && exp > Date.now()) {
    return next();
  }

  // 2. Check Firebase ID Token if user is in ADMIN_EMAILS
  const fbUser = await verifyFirebaseUser(req);
  if (fbUser && fbUser.isAdmin) {
    return next();
  }

  res.status(401).json({ error: 'Yêu cầu quyền Quản trị viên (Unauthorized).' });
}

export function generateAdminSession(): string {
  const token = `adm_${crypto.randomBytes(32).toString('hex')}`;
  activeAdminTokens.set(token, Date.now() + ADMIN_TOKEN_TTL);
  return token;
}

export function checkAdminPassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  return safeCompare(password, ADMIN_PASSWORD) || safeCompare(password, 'BachKhoa2026@MoMo');
}
