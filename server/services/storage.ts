import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  MomoPrizeTier,
  TicketInternal,
  ClaimInternal,
  EventConfigState,
  AuditLogInternal,
} from '../types';

// ==========================================
// PERSISTENT DATABASE ENGINE
// ==========================================
const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// In-memory single-source-of-truth stores
export const ticketsMap = new Map<string, TicketInternal>();
export const claimsMap = new Map<string, ClaimInternal>();
export const ticketOwners = new Map<string, string>(); // uid -> lastTicketCode
export const freeSpinsUsed = new Map<string, number>(); // uid -> count
export const auditLogs: AuditLogInternal[] = [];

export const eventConfig: EventConfigState = {
  eventName: 'Kỷ Niệm Ngày Phụ Nữ Việt Nam 20/10 & Tri Ân Thầy Cô 20/11',
  organizer: 'Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa',
  authorName: 'Tô Tuấn Cường',
  authorUnit: 'Cán bộ Ban Công nghệ & Đào tạo, Trường TC Công nghiệp Bách Khoa',
  authorEmail: 'tuancuong241298@gmail.com',
  year: 2026,
  status: 'active',
  minRewardAmount: 10000,
  maxRewardAmount: 100000,
  totalBudget: 500000,
  awardedAmount: 0,
  aiAttribution: 'Vận hành độc quyền trên hạ tầng Google Cloud & AI Studio Build',
};

export let prizeTiers: MomoPrizeTier[] = [
  { id: 'tier-10k', amount: 10000, label: '10.000đ', totalQuantity: 10, remainingQuantity: 10, color: '#EDE9FE', textColor: '#5B21B6' },
  { id: 'tier-20k', amount: 20000, label: '20.000đ', totalQuantity: 6, remainingQuantity: 6, color: '#FEF3C7', textColor: '#92400E' },
  { id: 'tier-50k', amount: 50000, label: '50.000đ', totalQuantity: 3, remainingQuantity: 3, color: '#FEE2E2', textColor: '#991B1B' },
  { id: 'tier-100k', amount: 100000, label: '100.000đ', totalQuantity: 1, remainingQuantity: 1, color: '#FCE7F3', textColor: '#9D174D' },
];

// Mutex lock for atomic transactions
let transactionQueue: Promise<unknown> = Promise.resolve();

export function runAtomicTransaction<T>(operation: () => Promise<T> | T): Promise<T> {
  const next = transactionQueue.then(async () => {
    return await operation();
  });
  transactionQueue = next.then(() => {}, () => {});
  return next;
}

export function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const state = {
      eventConfig,
      prizeTiers,
      tickets: Array.from(ticketsMap.values()),
      claims: Array.from(claimsMap.values()),
      auditLogs,
      ticketOwners: Object.fromEntries(ticketOwners),
      freeSpinsUsed: Object.fromEntries(freeSpinsUsed),
    };
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE); // Atomic write via file rename
  } catch (err) {
    console.error('[DB] Failed saving database to disk:', err);
  }
}

export function loadDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const state = JSON.parse(raw);
      if (state.eventConfig) Object.assign(eventConfig, state.eventConfig);
      if (Array.isArray(state.prizeTiers) && state.prizeTiers.length > 0) {
        prizeTiers = state.prizeTiers;
      }
      if (Array.isArray(state.tickets) && state.tickets.length > 0) {
        ticketsMap.clear();
        state.tickets.forEach((t: TicketInternal) => ticketsMap.set(t.code, t));
      }
      if (Array.isArray(state.claims)) {
        claimsMap.clear();
        state.claims.forEach((c: ClaimInternal) => claimsMap.set(c.claimCode, c));
      }
      if (state.ticketOwners) Object.entries(state.ticketOwners).forEach(([k, v]) => ticketOwners.set(k, String(v)));
      if (state.freeSpinsUsed) Object.entries(state.freeSpinsUsed).forEach(([k, v]) => freeSpinsUsed.set(k, Number(v)));
      if (Array.isArray(state.auditLogs) && state.auditLogs.length > 0) {
        auditLogs.length = 0;
        auditLogs.push(...state.auditLogs);
      }
      console.log(`[DB] Database loaded: ${ticketsMap.size} tickets, ${claimsMap.size} claims, ${prizeTiers.length} prize tiers.`);
      return;
    }
  } catch (err) {
    console.warn('[DB] Failed reading database file, initializing seeds:', err);
  }

  // Seed default 8-character secure tickets for all 5 holidays
  const defaultOccasions = [
    { occasion: '20-10', prefix: 'PN' },
    { occasion: '20-11', prefix: 'NG' },
    { occasion: '08-03', prefix: 'Q8' },
    { occasion: 'tet', prefix: 'TT' },
    { occasion: 'valentine', prefix: 'VL' },
  ];

  defaultOccasions.forEach(({ occasion, prefix }) => {
    for (let i = 0; i < 20; i++) {
      const code = generateSecureTicketCode(prefix);
      ticketsMap.set(code, {
        code,
        occasion,
        isUsed: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Khởi tạo hệ thống CSDL vé bảo mật đa sự kiện',
    details: 'Đã tạo 100 vé dự thưởng bảo mật 8 ký tự (20 vé/dịp: PN, NG, Q8, TT, VL) & 20 giải MoMo',
    timestamp: new Date().toISOString(),
    adminUser: 'Hệ thống BKS',
  });

  saveDatabase();
  console.log(`[DB] Initialized fresh database with ${ticketsMap.size} secure tickets.`);
}

const SECURE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function generateSecureTicketCode(prefix: string): string {
  const cleanPrefix = (prefix || 'PN').toUpperCase().slice(0, 4);
  let code = '';
  do {
    const bytes = crypto.randomBytes(6);
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += SECURE_CHARS[bytes[i] % SECURE_CHARS.length];
    }
    code = `${cleanPrefix}${randStr}`;
  } while (ticketsMap.has(code));
  return code;
}

// ==========================================
// PII MASKING UTILITIES (Requirement 4)
// ==========================================
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 9) return '***';
  return clean.slice(0, 3) + '****' + clean.slice(-3);
}

export function maskFullName(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  return words
    .map((w, idx) => {
      if (idx === 0 || idx === words.length - 1) {
        return w.charAt(0) + '***';
      }
      return '***';
    })
    .join(' ');
}

// Slice metadata definitions
export const SLICES_DATA = [
  { id: 0, label: '10.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 10000, wish: 'Chúc mừng bạn trúng 10.000đ chuyển khoản qua ví MoMo!' },
  { id: 1, label: 'Bình An', subLabel: 'Sức Khỏe', isCash: false, amount: 0, wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!' },
  { id: 2, label: '20.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 20000, wish: 'Chúc mừng bạn trúng lì xì 20.000đ ví MoMo từ chương trình trao yêu thương!' },
  { id: 3, label: 'Tự Tin', subLabel: 'Tỏa Sáng', isCash: false, amount: 0, wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!' },
  { id: 4, label: '50.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 50000, wish: 'Tuyệt vời! Bạn đã trúng giải thưởng 50.000đ vào ví MoMo!' },
  { id: 5, label: 'Hạnh Phúc', subLabel: 'Ngập Tràn', isCash: false, amount: 0, wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!' },
  { id: 6, label: '100.000đ', subLabel: 'Giải Đặc Biệt', isCash: true, amount: 100000, wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ chuyển khoản ví MoMo!' },
  { id: 7, label: 'Tri Ân Vàng', subLabel: 'Lời Chúc', isCash: false, amount: 0, wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến bạn!' },
];

// ==========================================
// BACKEND TRANSACTIONAL SPIN ENGINE (Requirement 1)
// ==========================================
export interface SpinResult {
  segmentIndex: number;
  label: string;
  subLabel: string;
  wishMessage: string;
  prizeAmount: number;
  claimCode?: string;
  ticketCode?: string;
  isDemo: boolean;
}

export async function executeBackendSpin(
  ticketCodeInput: string | undefined,
  isDemoInput: boolean,
  user: { uid?: string; email?: string } | null
): Promise<SpinResult> {
  return runAtomicTransaction(async () => {
    const isDemo = Boolean(isDemoInput);
    const cleanTicket = (ticketCodeInput || '').trim().toUpperCase();

    if (isDemo) {
      const demoSlices = [1, 3, 5, 7, 0, 2];
      const targetIndex = demoSlices[Math.floor(Math.random() * demoSlices.length)];
      const slice = SLICES_DATA[targetIndex];
      return {
        segmentIndex: targetIndex,
        label: slice.label,
        subLabel: slice.subLabel,
        wishMessage: slice.wish,
        prizeAmount: slice.amount,
        isDemo: true,
      };
    }

    if (!cleanTicket) {
      throw new Error('Vui lòng cung cấp mã vé dự thưởng hợp lệ.');
    }

    // 1. Check ticket in memory
    let ticket = ticketsMap.get(cleanTicket);

    // If ticket was generated externally with valid pattern, add to database
    if (!ticket) {
      const validPattern = /^(PN|NG|Q8|TT|VL)[A-Z0-9]{6}$/;
      if (validPattern.test(cleanTicket)) {
        ticket = {
          code: cleanTicket,
          occasion: cleanTicket.startsWith('NG') ? '20-11' : cleanTicket.startsWith('TT') ? 'tet' : '20-10',
          isUsed: false,
          createdAt: new Date().toISOString(),
        };
        ticketsMap.set(cleanTicket, ticket);
      } else {
        throw new Error(`Mã vé "${cleanTicket}" không tồn tại trong hệ thống.`);
      }
    }

    if (ticket.isUsed) {
      throw new Error(`Mã vé "${cleanTicket}" đã được sử dụng trước đó.`);
    }

    // 2. Select prize based on live inventory with atomic deduction
    const availableCashTiers = prizeTiers.filter((t) => t.remainingQuantity > 0 && t.amount > 0);
    const totalRemainingPrizes = availableCashTiers.reduce((acc, t) => acc + t.remainingQuantity, 0);

    let targetIndex = 1; // Default to thoughtful non-cash wish
    let prizeAmount = 0;
    let claimCode: string | undefined = undefined;

    // 50% probability of cash prize if inventory remains
    const willWinCash = availableCashTiers.length > 0 && totalRemainingPrizes > 0 && Math.random() < 0.5;

    if (willWinCash) {
      // Pick random tier from available stock
      const chosenTier = availableCashTiers[Math.floor(Math.random() * availableCashTiers.length)];
      prizeAmount = chosenTier.amount;

      // Find slice index matching amount
      const sliceIdx = SLICES_DATA.findIndex((s) => s.isCash && s.amount === prizeAmount);
      targetIndex = sliceIdx !== -1 ? sliceIdx : 0;

      // ATOMIC DECREMENT OF INVENTORY
      chosenTier.remainingQuantity = Math.max(0, chosenTier.remainingQuantity - 1);

      // Generate cryptographically secure claim code
      const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const numPart = Math.floor(1000 + Math.random() * 9000);
      claimCode = `MOMO-${randPart}-${numPart}`;

      // Create claim document in state
      claimsMap.set(claimCode, {
        id: `claim-${claimCode}`,
        claimCode,
        ticketCode: cleanTicket,
        amount: prizeAmount,
        fullName: 'Chờ cập nhật',
        schoolClassOrDepartment: 'Chờ cập nhật',
        momoPhone: '',
        status: 'unclaimed',
        userId: user?.uid,
        userEmail: user?.email,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Thoughtful wish (0đ)
      const wishIndices = [1, 3, 5, 7];
      targetIndex = wishIndices[Math.floor(Math.random() * wishIndices.length)];
      prizeAmount = 0;
    }

    // Mark ticket as used atomically
    ticket.isUsed = true;
    ticket.usedAt = new Date().toISOString();
    ticket.usedBy = user?.email || user?.uid || 'Khách mời';
    ticket.prizeWon = prizeAmount;
    ticket.claimCode = claimCode;

    // Record audit log
    auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: prizeAmount > 0 ? 'Quay trúng giải MoMo' : 'Quay trúng lời chúc',
      details: `Vé [${cleanTicket}] đã quay trúng ${prizeAmount > 0 ? `${prizeAmount.toLocaleString('vi-VN')}đ (Mã nhận thưởng: ${claimCode})` : 'Lời chúc ý nghĩa'}.`,
      timestamp: new Date().toISOString(),
      adminUser: user?.email || 'Hệ thống quay thưởng',
    });

    saveDatabase();

    const chosenSlice = SLICES_DATA[targetIndex];
    return {
      segmentIndex: targetIndex,
      label: chosenSlice.label,
      subLabel: chosenSlice.subLabel,
      wishMessage: chosenSlice.wish,
      prizeAmount,
      claimCode,
      ticketCode: cleanTicket,
      isDemo: false,
    };
  });
}

// Load database on initialization
loadDatabase();
