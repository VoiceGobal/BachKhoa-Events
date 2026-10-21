import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
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

export async function saveFirestorePrizeTiers(tiers: MomoPrizeTier[]): Promise<void> {
  try {
    for (const tier of tiers) {
      const tierRef = doc(db, 'prize_tiers', tier.id);
      await setDoc(tierRef, {
        id: tier.id,
        amount: Number(tier.amount),
        label: tier.label || `${Number(tier.amount).toLocaleString('vi-VN')}đ`,
        totalQuantity: Number(tier.totalQuantity) || 0,
        remainingQuantity: Number(tier.remainingQuantity) || 0,
        color: tier.color || '#EDE9FE',
        textColor: tier.textColor || '#5B21B6',
        updatedAt: new Date().toISOString(),
      });
    }

    // Also update remaining prizes count in main config
    const totalRemaining = tiers.reduce((acc, t) => acc + (Number(t.remainingQuantity) || 0), 0);
    await saveFirestoreEventConfig({ remainingPrizes: totalRemaining });
  } catch (err) {
    console.error('[Firestore] Failed saving prize tiers to Firestore:', err);
    throw err;
  }
}

// ==========================================
// 3. TICKETS (Mã vé tham gia sự kiện)
// ==========================================
export function generateTicketCode(prefix = 'PN'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${random}`;
}

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

export async function submitFirestoreClaim(claim: {
  claimCode: string;
  ticketCode?: string;
  amount: number;
  fullName: string;
  schoolClassOrDepartment: string;
  momoPhone: string;
  guardianNote?: string;
  userId?: string;
}): Promise<void> {
  try {
    const claimDoc = doc(db, 'claims', claim.claimCode);
    await setDoc(claimDoc, {
      id: claim.claimCode,
      claimCode: claim.claimCode,
      ticketCode: claim.ticketCode || '',
      amount: claim.amount,
      fullName: claim.fullName.trim(),
      momoPhone: claim.momoPhone.trim(),
      department: claim.schoolClassOrDepartment.trim(),
      schoolClassOrDepartment: claim.schoolClassOrDepartment.trim(),
      note: claim.guardianNote?.trim() || '',
      guardianNote: claim.guardianNote?.trim() || '',
      status: 'pending',
      userId: claim.userId || 'guest',
      createdAt: new Date().toISOString(),
    });

    // Also add to audit log
    await addFirestoreAuditLog({
      action: 'Nộp thông tin nhận thưởng MoMo',
      details: `${claim.fullName} đã gửi yêu cầu nhận ${claim.amount.toLocaleString('vi-VN')}đ qua MoMo: ${claim.momoPhone}`,
      adminUser: claim.fullName,
    });
  } catch (err) {
    console.error('[Firestore] Failed saving claim to Firestore:', err);
    throw err;
  }
}

export async function updateFirestoreClaimStatus(
  claimCode: string,
  newStatus: string,
  extra: { momoTransactionRef?: string; rejectionReason?: string; adminNote?: string } = {}
): Promise<void> {
  try {
    const claimDoc = doc(db, 'claims', claimCode);
    const updates: Record<string, any> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (extra.momoTransactionRef) updates.momoTransactionRef = extra.momoTransactionRef;
    if (extra.rejectionReason) updates.rejectionReason = extra.rejectionReason;
    if (extra.adminNote) updates.adminNote = extra.adminNote;
    if (newStatus === 'transferred') updates.transferredAt = new Date().toISOString();

    await updateDoc(claimDoc, updates);

    await addFirestoreAuditLog({
      action: `Cập nhật trạng thái nhận thưởng: ${newStatus}`,
      details: `Mã nhận thưởng ${claimCode} chuyển sang ${newStatus}. ${extra.momoTransactionRef ? `Mã GD MoMo: ${extra.momoTransactionRef}` : ''}`,
      adminUser: 'Admin Bách Khoa',
    });
  } catch (err) {
    console.error('[Firestore] Failed updating claim in Firestore:', err);
    throw err;
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

export async function addFirestoreAuditLog(entry: {
  action: string;
  details: string;
  adminUser?: string;
}): Promise<void> {
  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const logRef = doc(db, 'audit_logs', logId);
    await setDoc(logRef, {
      id: logId,
      action: entry.action,
      details: entry.details,
      timestamp: new Date().toISOString(),
      adminUser: entry.adminUser || 'Admin Bách Khoa',
    });
  } catch (err) {
    console.warn('[Firestore] Could not write audit log:', err);
  }
}

// ==========================================
// 7. COMPREHENSIVE ADMIN DATA LOADER
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
