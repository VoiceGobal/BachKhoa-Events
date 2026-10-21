import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MomoPrizeTier, SpinTicket, RewardClaim, AdminAuditLog } from '../types';

export interface EventConfigState {
  status: 'active' | 'paused' | 'ended';
  totalBudget: number;
  awardedAmount: number;
  remainingBudget: number;
  remainingPrizes: number;
}

export const DEFAULT_PRIZE_TIERS: MomoPrizeTier[] = [
  {
    id: 'tier-10k',
    amount: 10000,
    label: '10.000đ',
    totalQuantity: 10,
    remainingQuantity: 10,
    color: '#EDE9FE',
    textColor: '#5B21B6',
  },
  {
    id: 'tier-20k',
    amount: 20000,
    label: '20.000đ',
    totalQuantity: 6,
    remainingQuantity: 6,
    color: '#FEF3C7',
    textColor: '#92400E',
  },
  {
    id: 'tier-50k',
    amount: 50000,
    label: '50.000đ',
    totalQuantity: 3,
    remainingQuantity: 3,
    color: '#FEE2E2',
    textColor: '#991B1B',
  },
  {
    id: 'tier-100k',
    amount: 100000,
    label: '100.000đ',
    totalQuantity: 1,
    remainingQuantity: 1,
    color: '#FCE7F3',
    textColor: '#9D174D',
  },
];

export const DEFAULT_EVENT_CONFIG: EventConfigState = {
  status: 'active',
  totalBudget: 500000,
  awardedAmount: 0,
  remainingBudget: 500000,
  remainingPrizes: 20,
};

// ==========================================
// 1. EVENT CONFIG & BUDGET
// ==========================================
export async function getFirestoreEventConfig(): Promise<EventConfigState> {
  try {
    const configRef = doc(db, 'event_config', 'main');
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        status: data.status || 'active',
        totalBudget: typeof data.totalBudget === 'number' ? data.totalBudget : DEFAULT_EVENT_CONFIG.totalBudget,
        awardedAmount: typeof data.awardedAmount === 'number' ? data.awardedAmount : 0,
        remainingBudget: typeof data.remainingBudget === 'number' ? data.remainingBudget : DEFAULT_EVENT_CONFIG.totalBudget,
        remainingPrizes: typeof data.remainingPrizes === 'number' ? data.remainingPrizes : 20,
      };
    }
  } catch (err) {
    console.warn('[Firestore] Could not load event config from Firestore, using default:', err);
  }
  return DEFAULT_EVENT_CONFIG;
}

export async function saveFirestoreEventConfig(updates: Partial<EventConfigState>): Promise<void> {
  try {
    const configRef = doc(db, 'event_config', 'main');
    const existing = await getFirestoreEventConfig();
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(configRef, updated, { merge: true });
  } catch (err) {
    console.error('[Firestore] Failed saving event config to Firestore:', err);
    throw err;
  }
}

// ==========================================
// 2. PRIZE TIERS (Cơ cấu giải thưởng MoMo)
// ==========================================
export async function getFirestorePrizeTiers(): Promise<MomoPrizeTier[]> {
  try {
    const colRef = collection(db, 'prize_tiers');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: MomoPrizeTier[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          amount: Number(data.amount) || 0,
          label: String(data.label || `${Number(data.amount).toLocaleString('vi-VN')}đ`),
          totalQuantity: Number(data.totalQuantity) || 0,
          remainingQuantity: Number(data.remainingQuantity) || 0,
          color: String(data.color || '#EDE9FE'),
          textColor: String(data.textColor || '#5B21B6'),
        });
      });
      list.sort((a, b) => a.amount - b.amount);
      return list;
    }
  } catch (err) {
    console.warn('[Firestore] Could not load prize tiers from Firestore:', err);
  }
  return DEFAULT_PRIZE_TIERS;
}

// ==========================================
// 3. TICKETS (Mã vé tham gia sự kiện)
// ==========================================
export async function getFirestoreTickets(): Promise<SpinTicket[]> {
  try {
    const colRef = collection(db, 'tickets');
    const snap = await getDocs(query(colRef, limit(200)));
    const list: SpinTicket[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        code: d.id,
        occasion: data.occasion || '20-10',
        isUsed: Boolean(data.isUsed),
        usedAt: data.usedAt,
        usedBy: data.usedBy,
        prizeWon: data.prizeWon,
        claimCode: data.claimCode,
        createdAt: data.createdAt,
      });
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Could not get tickets from Firestore:', err);
    return [];
  }
}

// ==========================================
// 4. CLAIMS (Nhận thưởng MoMo)
// ==========================================
export async function getFirestoreClaims(): Promise<RewardClaim[]> {
  try {
    const colRef = collection(db, 'claims');
    const snap = await getDocs(query(colRef, limit(200)));
    const list: RewardClaim[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        claimCode: data.claimCode || d.id,
        ticketCode: data.ticketCode || '',
        amount: Number(data.amount) || 0,
        fullName: data.fullName || '',
        schoolClassOrDepartment: data.schoolClassOrDepartment || data.department || '',
        momoPhone: data.momoPhone || '',
        status: data.status || 'pending',
        momoTransactionRef: data.momoTransactionRef || data.transactionRef,
        guardianNote: data.guardianNote || data.note,
        adminNote: data.adminNote,
        rejectionReason: data.rejectionReason,
        createdAt: data.createdAt || new Date().toISOString(),
        transferredAt: data.transferredAt,
      });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] Could not get claims from Firestore:', err);
    return [];
  }
}

// ==========================================
// 5. AUDIT LOGS
// ==========================================
export async function getFirestoreAuditLogs(): Promise<AdminAuditLog[]> {
  try {
    const colRef = collection(db, 'audit_logs');
    const snap = await getDocs(query(colRef, limit(100)));
    const list: AdminAuditLog[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        action: data.action || '',
        details: data.details || '',
        timestamp: data.timestamp || new Date().toISOString(),
        adminUser: data.adminUser || 'Hệ thống',
      });
    });
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (err) {
    console.warn('[Firestore] Could not load audit logs:', err);
    return [];
  }
}

// ==========================================
// 6. COMPREHENSIVE ADMIN DATA LOADER
// ==========================================
export async function loadFirestoreAdminDashboard() {
  const [config, prizeTiers, tickets, claims, auditLogs] = await Promise.all([
    getFirestoreEventConfig(),
    getFirestorePrizeTiers(),
    getFirestoreTickets(),
    getFirestoreClaims(),
    getFirestoreAuditLogs(),
  ]);

  const awardedAmount = claims
    .filter((c) => c.status === 'transferred')
    .reduce((acc, c) => acc + c.amount, 0);

  const remainingBudget = Math.max(0, config.totalBudget - awardedAmount);
  const remainingPrizes = prizeTiers.reduce((acc, t) => acc + t.remainingQuantity, 0);

  return {
    totalBudget: config.totalBudget,
    remainingBudget,
    awardedAmount,
    remainingPrizes,
    prizeTiers,
    tickets,
    claims,
    auditLogs,
  };
}
