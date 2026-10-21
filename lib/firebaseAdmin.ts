import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ.');
    }
  } else {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Thiếu FIREBASE_SERVICE_ACCOUNT_JSON hoặc bộ biến FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY trên Vercel.');
    }
  }

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Service account cần project_id, client_email và private_key.');
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    }),
    projectId: serviceAccount.project_id,
  });
}

export function getFirebaseAdmin() {
  const app = getApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function getUserFromRequest(req: any) {
  const authorization = String(req.headers?.authorization || '');
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer || String(req.headers?.['x-firebase-id-token'] || '');
  if (!token) return null;

  try {
    const { auth } = getFirebaseAdmin();
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}

const DEFAULT_ADMIN_EMAILS = [
  'tuancuongnx@gmail.com',
  'tuancuong241298@gmail.com',
  'cuongtt.ptit@gmail.com',
  'admin@bachkhoa.edu.vn',
  'bksamsong@bachkhoa.edu.vn',
];

export async function requireAdmin(req: any) {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  const configuredEmails = (process.env.FIREBASE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = String(user.email || '').toLowerCase();
  if (user.email_verified && [...DEFAULT_ADMIN_EMAILS, ...configuredEmails].includes(email)) return user;

  const { db } = getFirebaseAdmin();
  const adminDoc = await db.collection('admins').doc(user.uid).get();
  return adminDoc.exists ? user : null;
}
