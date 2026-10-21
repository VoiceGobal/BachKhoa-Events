import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// Chạy sau reverse proxy (Cloud Run, Nginx...) để req.ip và rate limit đúng
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));

// Shared Gemini client utility
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve('firebase-applet-config.json'), 'utf-8')
) as { apiKey: string };

// Xác thực Firebase ID token qua REST (không cần firebase-admin)
async function verifyFirebaseUser(
  req: Request
): Promise<{ uid: string; email: string; emailVerified: boolean } | null> {
  const header = req.headers['x-firebase-id-token'];
  const idToken = typeof header === 'string' ? header.trim() : '';
  if (!idToken || idToken.length > 4096) return null;
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
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
    return { uid: String(u.localId), email: String(u.email || ''), emailVerified: Boolean(u.emailVerified) };
  } catch {
    return null;
  }
}

// Simple in-memory rate limiting map (IP -> timestamps)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

// Fallback curated wishes generator in case of AI unavailability
const fallbackWishes = [
  {
    title: 'Chúc mừng ngày Phụ nữ Việt Nam 20/10',
    message:
      'Nhân ngày 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống. Bạn luôn là đóa hoa ngát hương mang lại nguồn cảm hứng tuyệt vời cho mọi người xung quanh!',
  },
  {
    title: 'Gửi trọn yêu thương ngày 20 tháng 10',
    message:
      'Chúc người phụ nữ tuyệt vời ngày 20/10 thân tâm an lạc, vạn sự hanh thông, công việc thuận lợi và mỗi ngày đều tìm thấy những lý do ngọt ngào để mỉm cười an nhiên!',
  },
  {
    title: 'Rạng rỡ và tỏa sáng theo cách riêng',
    message:
      'Chúc bạn ngày 20/10 nhận được nhiều hoa tươi và những lời chúc tốt đẹp nhất. Hãy luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên hành trình của chính mình!',
  },
];

// POST /api/gemini/generate-wish
app.post('/api/gemini/generate-wish', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
      isAiGenerated: false,
      message: fallbackWishes[0].message,
      title: fallbackWishes[0].title,
      modelNote: 'Đã chọn từ kho lời chúc mẫu do bạn thao tác quá nhanh.',
    });
  }

  const {
    recipientName = '',
    ageGroup = '26-35',
    profession = '',
    relationship = 'Mẹ',
    pronoun = '',
    tone = 'refined',
    length = 'medium',
    theme = 'happiness',
    holiday = '20-10',
  } = req.body;

  const safeName = String(recipientName).slice(0, 50).trim();
  const safeProfession = String(profession).slice(0, 50).trim();
  const safeRelationship = String(relationship).slice(0, 50).trim();
  const safePronoun = String(pronoun).slice(0, 40).trim();
  const safeTone = String(tone).slice(0, 30);
  const safeLength = String(length).slice(0, 20);
  const safeTheme = String(theme).slice(0, 30);
  const safeHoliday = String(holiday).slice(0, 20);

  const holidayTitles: Record<string, string> = {
    '20-10': 'ngày Phụ Nữ Việt Nam 20/10',
    '20-11': 'ngày Nhà Giáo Việt Nam 20/11 (Tri ân Thầy Cô)',
    '08-03': 'ngày Quốc Tế Phụ Nữ 8/3',
    'tet': 'Tết Nguyên Đán & Mừng Xuân',
    'valentine': 'ngày Lễ Tình Nhân 14/2',
  };
  const holidayName = holidayTitles[safeHoliday] || 'ngày lễ đặc biệt 20/10';

  if (!aiClient) {
    const fallback = fallbackWishes[Math.floor(Math.random() * fallbackWishes.length)];
    let msg = fallback.message;
    if (safeName) {
      msg = `Gửi ${safeName}! ${msg}`;
    }
    return res.json({
      title: `${fallback.title} (${holidayName})`,
      message: msg,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: `Đã chọn từ kho lời chúc tuyển chọn cho ${holidayName}.`,
    });
  }

  try {
    const systemPrompt = `Bạn là chuyên gia ngôn ngữ văn hóa Việt Nam chuyên viết lời chúc mừng cho các dịp lễ truyền thống và sự kiện lớn: ${holidayName}.
Nhiệm vụ: Viết một lời chúc cho dịp "${holidayName}" chân thành, tinh tế, giàu cảm xúc, đúng chuẩn mực văn hóa và tự nhiên bằng tiếng Việt có dấu.
QUY TẮC:
1. Dành cho dịp lễ: ${holidayName}.
2. Tên người nhận: "${safeName || 'người nhận'}", xưng hô phù hợp: "${safePronoun || 'tự nhiên'}".
3. Mối quan hệ: ${safeRelationship}. Nghề nghiệp: ${safeProfession || 'không xác định'}.
4. Phong cách: ${safeTone}. Độ dài: ${safeLength}. Chủ đề: ${safeTheme}.
5. ĐẶC BIỆT NẾU LÀ 20/11: Tri ân công ơn Thầy Cô giáo, người lái đò thầm lặng, bục giảng phấn trắng, sự nghiệp trồng người cao quý.
6. ĐẶC BIỆT NẾU LÀ TẾT: Chúc an khang thịnh vượng, tài lộc dồi dào, vạn sự như ý, gia đạo bình an.
7. Không suy đoán tiêu cực, tử vi số phận. Giàu chất thơ mộng, ấm áp, văn phong chuẩn mực tiếng Việt.`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out')), 25000)
    );

    const generatePromise = aiClient.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: `Hãy tạo lời chúc cho dịp ${holidayName} theo các thông số đã cung cấp.`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề lời chúc' },
            message: { type: Type.STRING, description: 'Nội dung lời chúc' },
            tone: { type: Type.STRING, description: 'Phong cách lời chúc' },
            recipientType: { type: Type.STRING, description: 'Đối tượng người nhận' },
          },
          required: ['title', 'message'],
        },
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const text = response.text;
    if (!text) throw new Error('Empty response');

    const parsed = JSON.parse(text);
    return res.json({
      title: parsed.title || 'Chúc mừng ngày 20/10',
      message: parsed.message,
      tone: parsed.tone || safeTone,
      recipientType: parsed.recipientType || safeRelationship,
      isAiGenerated: true,
    });
  } catch (err: unknown) {
    console.error('Gemini call error:', err);
    const fallback = fallbackWishes[Math.floor(Math.random() * fallbackWishes.length)];
    let msg = fallback.message;
    if (safeName) msg = `Gửi ${safeName}! ${msg}`;
    return res.json({
      title: fallback.title,
      message: msg,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: 'Đã tự động chọn từ kho lời chúc tuyển chọn 20/10.',
    });
  }
});

// ==========================================
// MOMO PRIZE WHEEL & EVENT MANAGEMENT STORE
// ==========================================

interface PrizeTierInternal {
  id: string;
  amount: number;
  label: string;
  totalQuantity: number;
  remainingQuantity: number;
  color: string;
  textColor: string;
}

interface TicketInternal {
  code: string;
  occasion?: string;
  isUsed: boolean;
  usedAt?: string;
  usedBy?: string;
  prizeWon?: number;
  claimCode?: string;
  createdAt: string;
}

interface ClaimInternal {
  id: string;
  claimCode: string;
  ticketCode: string;
  amount: number;
  fullName: string;
  schoolClassOrDepartment: string;
  momoPhone: string;
  guardianNote?: string;
  status:
    | 'unclaimed'
    | 'pending_verification'
    | 'verified'
    | 'pending_transfer'
    | 'transferred'
    | 'rejected'
    | 'expired';
  createdAt: string;
  verifiedAt?: string;
  transferredAt?: string;
  momoTransactionRef?: string;
  rejectionReason?: string;
  adminNote?: string;
}

interface AuditLogInternal {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  adminUser: string;
}

// Event state
const eventConfig = {
  eventName: '20/10 – Trao Lời Yêu Thương',
  organizer: 'Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa',
  authorName: 'Trịnh Tuấn Cường',
  authorUnit: 'Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa',
  authorEmail: 'cuongtt.ptit@gmail.com',
  year: 2026,
  status: 'active' as 'active' | 'paused' | 'ended',
  minRewardAmount: 10000,
  maxRewardAmount: 100000,
  aiAttribution:
    'Website có sử dụng công cụ AI hỗ trợ trong quá trình xây dựng. Nội dung và chức năng cần được người biên soạn kiểm tra trước khi sử dụng chính thức.',
};

// Initial Prize Tiers
let prizeTiers: PrizeTierInternal[] = [
  {
    id: 'tier-10k',
    amount: 10000,
    label: '10.000đ',
    totalQuantity: 10,
    remainingQuantity: 10,
    color: '#FEE2E2',
    textColor: '#991B1B',
  },
  {
    id: 'tier-20k',
    amount: 20000,
    label: '20.000đ',
    totalQuantity: 5,
    remainingQuantity: 5,
    color: '#FEF3C7',
    textColor: '#92400E',
  },
  {
    id: 'tier-50k',
    amount: 50000,
    label: '50.000đ',
    totalQuantity: 4,
    remainingQuantity: 4,
    color: '#EDE9FE',
    textColor: '#5B21B6',
  },
  {
    id: 'tier-100k',
    amount: 100000,
    label: '100.000đ',
    totalQuantity: 1,
    remainingQuantity: 1,
    color: '#FFEDD5',
    textColor: '#C2410C',
  },
];

// Persistent Stores (In-memory cache with JSON DB backing)
const ticketsMap = new Map<string, TicketInternal>();
// uid:occasion -> mã vé đã cấp; uid -> số lượt quay miễn phí đã dùng
const ticketOwners = new Map<string, string>();
const freeSpinsUsed = new Map<string, number>();
const MAX_FREE_SPINS = 3;
const claimsMap = new Map<string, ClaimInternal>();
const auditLogs: AuditLogInternal[] = [];

// ==========================================
// SECURE 8-CHARACTER TICKET GENERATOR
// ==========================================
// Prefix: 2 uppercase letters representing the occasion
// Followed by 6 cryptographically random uppercase alphanumeric characters
// Total: Exactly 8 characters (e.g., PN7K9M3X, NG8B4K2Z, Q89L2T7K, TT6N2K9R, VL8K4R2Y)
const OCCASION_PREFIX_MAP: Record<string, string> = {
  '20-10': 'PN',
  '20-11': 'NG',
  '08-03': 'Q8',
  'tet': 'TT',
  'valentine': 'VL',
  'BKS-2010': 'PN',
  'BKS-2011': 'NG',
  'BKS-0803': 'Q8',
  'BKS-TET': 'TT',
  'BKS-LOVE': 'VL',
  'PN': 'PN',
  'NG': 'NG',
  'Q8': 'Q8',
  'TT': 'TT',
  'VL': 'VL',
};

function getOccasionPrefix(occasion: string): string {
  const clean = String(occasion || '').trim();
  return OCCASION_PREFIX_MAP[clean] || OCCASION_PREFIX_MAP[clean.toUpperCase()] || 'PN';
}

function getOccasionFromCode(code: string): string {
  const upper = code.toUpperCase();
  if (upper.startsWith('PN') || upper.startsWith('BKS-2010')) return '20-10';
  if (upper.startsWith('NG') || upper.startsWith('BKS-2011')) return '20-11';
  if (upper.startsWith('Q8') || upper.startsWith('BKS-0803')) return '08-03';
  if (upper.startsWith('TT') || upper.startsWith('BKS-TET')) return 'tet';
  if (upper.startsWith('VL') || upper.startsWith('BKS-LOVE')) return 'valentine';
  return '20-10';
}

const SECURE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 uppercase chars (no 0/O, 1/I)

function generateSecureTicketCode(prefix: string): string {
  const cleanPrefix = (prefix || 'PN').slice(0, 2).toUpperCase();
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
// PERSISTENT DATABASE ENGINE (CSDL)
// ==========================================
const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function saveDatabase() {
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
    fs.renameSync(tmp, DB_FILE); // ghi nguyên tử, tránh hỏng file khi sập giữa chừng
  } catch (err) {
    console.error('[DB] Failed to save database to disk:', err);
  }
}

function loadDatabase() {
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

// Load DB on startup
loadDatabase();

// ==========================================
// ADMIN AUTH: mật khẩu bắt buộc từ env, token ngẫu nhiên có hạn
// ==========================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (ADMIN_PASSWORD.length < 8) {
  console.warn('[SECURITY] ADMIN_PASSWORD chưa đặt hoặc < 8 ký tự: đăng nhập quản trị bị VÔ HIỆU HÓA.');
}
const ADMIN_TOKEN_TTL = 4 * 60 * 60 * 1000; // 4 giờ
const activeAdminTokens = new Map<string, number>(); // token -> expiresAt

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function verifyAdmin(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const exp = activeAdminTokens.get(token);
  if (!exp) return false;
  if (exp < Date.now()) {
    activeAdminTokens.delete(token);
    return false;
  }
  return true;
}

// Rate limit riêng cho đăng nhập admin: 5 lần / 15 phút / IP
const loginAttempts = new Map<string, number[]>();
function checkLoginRate(ip: string): boolean {
  const now = Date.now();
  const list = (loginAttempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (list.length >= 5) {
    loginAttempts.set(ip, list);
    return false;
  }
  list.push(now);
  loginAttempts.set(ip, list);
  return true;
}

function randomCode(len: number): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += SECURE_CHARS[bytes[i] % SECURE_CHARS.length];
  return out;
}

// Chống CSV/formula injection khi xuất báo cáo
function csvCell(v: unknown): string {
  let t = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
}

// Mask phone number for privacy (098****321)
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

// 1. GET /api/event/info - Public event & prize info
app.get('/api/event/info', (_req: Request, res: Response) => {
  const totalBudget = prizeTiers.reduce((acc, t) => acc + t.amount * t.totalQuantity, 0);
  const remainingBudget = prizeTiers.reduce(
    (acc, t) => acc + t.amount * t.remainingQuantity,
    0
  );
  const totalPrizes = prizeTiers.reduce((acc, t) => acc + t.totalQuantity, 0);
  const remainingPrizes = prizeTiers.reduce((acc, t) => acc + t.remainingQuantity, 0);

  res.json({
    ...eventConfig,
    totalBudget,
    remainingBudget,
    awardedAmount: totalBudget - remainingBudget,
    totalPrizes,
    remainingPrizes,
    tiers: prizeTiers.map((t) => ({
      id: t.id,
      amount: t.amount,
      label: t.label,
      totalQuantity: t.totalQuantity,
      remainingQuantity: t.remainingQuantity,
      color: t.color,
      textColor: t.textColor,
    })),
  });
});

// Unified 8 Wheel Slices matching client LuckyWheel component
const UNIFIED_SLICES = [
  { index: 0, label: '10.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 10000, wish: 'Chúc mừng bạn trúng giải thưởng 10.000đ qua ví MoMo!' },
  { index: 1, label: 'Bình An', subLabel: 'Sức Khỏe', isCash: false, amount: 0, wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!' },
  { index: 2, label: '20.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 20000, wish: 'Chúc mừng bạn trúng lì xì 20.000đ ví MoMo từ chương trình 20/10!' },
  { index: 3, label: 'Tự Tin', subLabel: 'Tỏa Sáng', isCash: false, amount: 0, wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!' },
  { index: 4, label: '50.000đ', subLabel: 'Ví MoMo', isCash: true, amount: 50000, wish: 'Tuyệt vời! Bạn đã trúng giải thưởng 50.000đ vào ví MoMo!' },
  { index: 5, label: 'Hạnh Phúc', subLabel: 'Ngập Tràn', isCash: false, amount: 0, wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!' },
  { index: 6, label: '100.000đ', subLabel: 'Giải Đặc Biệt', isCash: true, amount: 100000, wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ chuyển khoản ví MoMo!' },
  { index: 7, label: 'Tri Ân 20/10', subLabel: 'Lời Chúc Vàng', isCash: false, amount: 0, wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến người phụ nữ tuyệt vời!' },
];

// GET /api/spin/public-tickets - Return ticket count without exposing secret codes
app.get('/api/spin/public-tickets', (req: Request, res: Response) => {
  const occasion = String(req.query.prefix || '20-10');
  const occPrefix = getOccasionPrefix(occasion);
  
  let totalForOccasion = 0;
  let remainingForOccasion = 0;

  for (const [code, ticket] of ticketsMap.entries()) {
    if (code.startsWith(occPrefix) || ticket.occasion === occasion) {
      totalForOccasion++;
      if (!ticket.isUsed) remainingForOccasion++;
    }
  }

  // Secrecy rule: NEVER return ticket codes in the public response!
  res.json({
    tickets: [],
    totalTickets: ticketsMap.size,
    totalForOccasion,
    remainingForOccasion,
    message: 'Mã vé dự thưởng được bảo mật riêng cho từng dịp lễ.',
  });
});

// POST /api/spin/claim-ticket - Cấp vé cho người dùng đã đăng nhập (email đã xác minh)
// Mỗi tài khoản chỉ nhận 1 vé / dịp lễ.
app.post('/api/spin/claim-ticket', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Thao tác quá nhanh. Vui lòng thử lại sau.' });
  }
  const user = await verifyFirebaseUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để nhận vé.' });
  }
  if (!user.uid) {
    return res.status(401).json({ error: 'Tài khoản không hợp lệ. Vui lòng đăng nhập lại.' });
  }

  const occasion = String(req.body?.occasion || '20-10');
  const occPrefix = getOccasionPrefix(occasion);
  const occId = getOccasionFromCode(occPrefix);
  const ownerKey = `${user.uid}:${occId}`;

  const existingCode = ticketOwners.get(ownerKey);
  if (existingCode) {
    const t = ticketsMap.get(existingCode);
    if (t && !t.isUsed) return res.json({ success: true, ticketCode: existingCode, isNew: false });
    return res.status(400).json({ error: 'Bạn đã sử dụng vé của dịp này. Mỗi tài khoản chỉ nhận 1 vé.' });
  }

  if (eventConfig.status !== 'active') {
    return res.status(403).json({ error: 'Sự kiện hiện đang tạm dừng hoặc đã kết thúc.' });
  }

  const newCode = generateSecureTicketCode(occPrefix);
  ticketsMap.set(newCode, { code: newCode, occasion: occId, isUsed: false, createdAt: new Date().toISOString() });
  ticketOwners.set(ownerKey, newCode);

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Cấp vé cho tài khoản',
    details: `Vé ${newCode} (dịp ${occId}) cấp cho ${user.email}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Cổng sự kiện tự động',
  });
  saveDatabase();
  return res.json({ success: true, ticketCode: newCode, isNew: true });
});

// POST /api/spin/free - 3 lượt quay may mắn miễn phí / tài khoản (chỉ trúng lời chúc, KHÔNG có tiền)
app.post('/api/spin/free', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Thao tác quá nhanh. Vui lòng thử lại sau.' });
  }
  const user = await verifyFirebaseUser(req);
  if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để quay miễn phí.' });

  const used = freeSpinsUsed.get(user.uid) || 0;
  if (used >= MAX_FREE_SPINS) {
    return res.status(400).json({ error: `Tài khoản đã dùng hết ${MAX_FREE_SPINS} lượt quay miễn phí.` });
  }
  freeSpinsUsed.set(user.uid, used + 1);
  saveDatabase();

  const wishSlices = UNIFIED_SLICES.filter((sl) => !sl.isCash);
  const pick = wishSlices[crypto.randomInt(wishSlices.length)];
  return res.json({
    success: true,
    isDemo: false,
    isCashPrize: false,
    prizeAmount: 0,
    segmentIndex: pick.index,
    label: pick.label,
    wishMessage: pick.wish,
    spinsRemaining: MAX_FREE_SPINS - (used + 1),
  });
});

// Check Ticket validity endpoint
app.post('/api/spin/check-ticket', (req: Request, res: Response) => {
  const { ticketCode } = req.body;
  const cleanCode = String(ticketCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return res.status(400).json({ error: 'Vui lòng nhập mã vé cần kiểm tra.' });
  }

  const ticket = ticketsMap.get(cleanCode);
  if (!ticket) {
    return res.status(404).json({
      valid: false,
      error: `Mã vé "${cleanCode}" không tồn tại trong hệ thống Trường Trung cấp Công nghiệp Bách Khoa.`,
    });
  }

  if (ticket.isUsed) {
    return res.status(400).json({
      valid: false,
      isUsed: true,
      error: `Mã vé "${cleanCode}" đã được sử dụng lúc ${new Date(ticket.usedAt || '').toLocaleString('vi-VN')}.`,
    });
  }

  return res.json({
    valid: true,
    isUsed: false,
    code: cleanCode,
    message: `Mã vé "${cleanCode}" hợp lệ! Bạn có thể sử dụng để quay ngay bây giờ.`,
  });
});

// 2. POST /api/spin/play - Server-authoritative spin execution
app.post('/api/spin/play', (req: Request, res: Response) => {
  const { ticketCode, isDemo = false } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Thao tác quá nhanh. Vui lòng thử lại sau 30 giây.' });
  }

  if (eventConfig.status !== 'active') {
    return res.status(403).json({ error: 'Sự kiện vòng quay hiện đang tạm dừng hoặc đã kết thúc.' });
  }

  // Handle DEMO Spin (Practice mode - exact slice alignment)
  if (isDemo || ticketCode === 'DEMO-2010') {
    const randomSlice = UNIFIED_SLICES[Math.floor(Math.random() * UNIFIED_SLICES.length)];

    return res.json({
      success: true,
      isDemo: true,
      segmentIndex: randomSlice.index,
      label: randomSlice.label,
      wishMessage: randomSlice.wish,
      prizeAmount: 0,
      note: 'Lượt quay thử nghiệm. Nhập mã vé chính thức hoặc đăng nhập để nhận thưởng MoMo.',
    });
  }

  // Official Event Ticket validation
  const cleanCode = String(ticketCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return res.status(400).json({
      error: 'Vui lòng nhập mã vé dự thưởng hợp lệ (Ví dụ: BKS-2010-001) hoặc chọn quay thử nghiệm.',
    });
  }

  const ticket = ticketsMap.get(cleanCode);
  if (!ticket) {
    return res.status(404).json({
      error: `Mã vé "${cleanCode}" không tồn tại trong danh sách phát hành của trường. Vui lòng kiểm tra lại.`,
    });
  }

  if (ticket.isUsed) {
    return res.status(400).json({
      error: `Mã vé "${cleanCode}" đã được sử dụng lúc ${new Date(ticket.usedAt || '').toLocaleString('vi-VN')}. Mỗi vé chỉ được quay 1 lần.`,
    });
  }

  // ATOMIC PRIZE SELECTION FROM INVENTORY
  // Filter tiers with remaining prizes
  const availableTiers = prizeTiers.filter((t) => t.remainingQuantity > 0);

  if (availableTiers.length === 0) {
    // All cash prizes have been awarded!
    ticket.isUsed = true;
    ticket.usedAt = new Date().toISOString();
    ticket.prizeWon = 0;
    saveDatabase();

    return res.json({
      success: true,
      isDemo: false,
      isCashPrize: false,
      prizeAmount: 0,
      label: 'Tri Ân 20/10',
      segmentIndex: 7,
      wishMessage:
        'Toàn bộ ngân sách giải thưởng tiền mặt MoMo của sự kiện đã được trao hết. Bạn nhận được món quà tinh thần đặc biệt: Một lời tri ân chân thành nhất từ ban tổ chức!',
      ticketCode: cleanCode,
    });
  }

  // Pick prize according to weighted availability
  // Chọn có trọng số theo số suất còn lại (giải ít suất thì khó trúng hơn)
  const totalRemaining = availableTiers.reduce((a, t) => a + t.remainingQuantity, 0);
  let roll = crypto.randomInt(totalRemaining);
  let selectedTier = availableTiers[0];
  for (const t of availableTiers) {
    if (roll < t.remainingQuantity) {
      selectedTier = t;
      break;
    }
    roll -= t.remainingQuantity;
  }

  // Atomically decrement remaining quantity
  selectedTier.remainingQuantity -= 1;

  // Generate unique claim code
  const randomSuffix = randomCode(10); // không đoán được
  let eventLabel = 'Chương trình 20/10 – Trao Lời Yêu Thương';
  let claimPrefix = 'MOMO-2010';
  if (cleanCode.startsWith('NG') || cleanCode.startsWith('BKS-2011')) {
    eventLabel = 'Chương trình 20/11 – Tri Ân Thầy Cô';
    claimPrefix = 'MOMO-2011';
  } else if (cleanCode.startsWith('TT') || cleanCode.startsWith('BKS-TET')) {
    eventLabel = 'Chương trình Tết Nguyên Đán – Rước Lộc Đầu Xuân';
    claimPrefix = 'MOMO-TET';
  } else if (cleanCode.startsWith('Q8') || cleanCode.startsWith('BKS-0803')) {
    eventLabel = 'Chương trình 08/03 – Quốc Tế Phụ Nữ';
    claimPrefix = 'MOMO-0803';
  } else if (cleanCode.startsWith('VL') || cleanCode.startsWith('BKS-LOVE')) {
    eventLabel = 'Chương trình 14/02 – Lễ Tình Nhân';
    claimPrefix = 'MOMO-LOVE';
  }

  const claimCode = `${claimPrefix}-${randomSuffix}`;

  // Update ticket
  ticket.isUsed = true;
  ticket.usedAt = new Date().toISOString();
  ticket.prizeWon = selectedTier.amount;
  ticket.claimCode = claimCode;

  // Create claim record
  const newClaim: ClaimInternal = {
    id: `claim-${Date.now()}-${randomSuffix}`,
    claimCode,
    ticketCode: cleanCode,
    amount: selectedTier.amount,
    fullName: '',
    schoolClassOrDepartment: '',
    momoPhone: '',
    status: 'unclaimed',
    createdAt: new Date().toISOString(),
  };
  claimsMap.set(claimCode, newClaim);

  // Map to wheel segment index for graphic alignment
  // 10.000đ -> index 0, 20.000đ -> index 2, 50.000đ -> index 4, 100.000đ -> index 6
  let segmentIndex = 0;
  if (selectedTier.amount === 10000) segmentIndex = 0;
  else if (selectedTier.amount === 20000) segmentIndex = 2;
  else if (selectedTier.amount === 50000) segmentIndex = 4;
  else if (selectedTier.amount === 100000) segmentIndex = 6;

  // Add audit log
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Trúng thưởng MoMo',
    details: `Vé ${cleanCode} trúng ${selectedTier.label}. Mã nhận thưởng: ${claimCode}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Người tham gia',
  });

  saveDatabase();

  return res.json({
    success: true,
    isCashPrize: true,
    prizeAmount: selectedTier.amount,
    label: selectedTier.label,
    segmentIndex,
    claimCode,
    ticketCode: cleanCode,
    wishMessage: `Chúc mừng bạn đã trúng thưởng ${selectedTier.label} qua ví MoMo từ ${eventLabel}! Vui lòng điền thông tin để ban tổ chức kiểm tra và chuyển thưởng.`,
  });
});

// 3. POST /api/spin/claim-info - Check claim status by claimCode
app.post('/api/spin/claim-info', (req: Request, res: Response) => {
  const { claimCode } = req.body;
  if (!claimCode) {
    return res.status(400).json({ error: 'Thiếu mã nhận thưởng.' });
  }

  const claim = claimsMap.get(String(claimCode).trim().toUpperCase());
  if (!claim) {
    return res.status(404).json({ error: 'Mã nhận thưởng không tồn tại.' });
  }

  res.json({
    claimCode: claim.claimCode,
    amount: claim.amount,
    status: claim.status,
    createdAt: claim.createdAt,
    verifiedAt: claim.verifiedAt,
    transferredAt: claim.transferredAt,
    momoTransactionRef: claim.momoTransactionRef,
    rejectionReason: claim.rejectionReason,
    maskedPhone: maskPhone(claim.momoPhone),
    fullName: claim.fullName,
    schoolClassOrDepartment: claim.schoolClassOrDepartment,
  });
});

// 4. POST /api/spin/submit-claim - Submit private receiver information
app.post('/api/spin/submit-claim', (req: Request, res: Response) => {
  const { claimCode, fullName, schoolClassOrDepartment, momoPhone, guardianNote } = req.body;

  if (!claimCode) {
    return res.status(400).json({ error: 'Thiếu mã nhận thưởng.' });
  }

  const cleanClaimCode = String(claimCode).trim().toUpperCase();
  const claim = claimsMap.get(cleanClaimCode);
  if (!claim) {
    return res.status(404).json({ error: 'Mã nhận thưởng không hợp lệ.' });
  }

  if (claim.status !== 'unclaimed' && claim.status !== 'pending_verification') {
    return res.status(400).json({
      error: 'Yêu cầu nhận thưởng này đã được xử lý, không thể chỉnh sửa. Vui lòng liên hệ Ban Tổ Chức nếu cần hỗ trợ.',
    });
  }
  if (!claim.ticketCode) {
    return res.status(400).json({ error: 'Mã nhận thưởng không hợp lệ.' });
  }

  // Validate MoMo phone number (10 digits Vietnamese phone format)
  const cleanPhone = String(momoPhone || '').trim().replace(/\D/g, '');
  if (!/^(03|05|07|08|09)\d{8}$/.test(cleanPhone)) {
    return res.status(400).json({
      error: 'Số điện thoại ví MoMo không hợp lệ (Phải là số điện thoại Việt Nam 10 số, bắt đầu bằng 03, 05, 07, 08, 09).',
    });
  }

  const cleanName = String(fullName || '').trim().slice(0, 100);
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập họ và tên đầy đủ của bạn.' });
  }

  const cleanClass = String(schoolClassOrDepartment || '').trim().slice(0, 150);
  if (cleanClass.length < 2) {
    return res.status(400).json({ error: 'Vui lòng nhập Lớp học hoặc Phòng/Ban công tác tại trường.' });
  }

  // Update claim to pending_verification
  claim.fullName = cleanName;
  claim.schoolClassOrDepartment = cleanClass;
  claim.momoPhone = cleanPhone;
  claim.guardianNote = String(guardianNote || '').trim().slice(0, 500);
  claim.status = 'pending_verification';

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Nộp yêu cầu nhận thưởng',
    details: `${cleanName} (${cleanClass}) yêu cầu nhận ${claim.amount.toLocaleString()}đ qua MoMo ${maskPhone(cleanPhone)}. Mã: ${cleanClaimCode}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Người nhận thưởng',
  });

  saveDatabase();

  return res.json({
    success: true,
    message: 'Gửi thông tin nhận thưởng thành công! Quản trị viên sẽ xác minh và chuyển tiền qua MoMo sớm nhất.',
    claimCode: cleanClaimCode,
    status: claim.status,
  });
});

// ==========================================
// ADMIN DASHBOARD ENDPOINTS
// ==========================================

// POST /api/admin/login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (ADMIN_PASSWORD.length < 8) {
    return res.status(503).json({ error: 'Quản trị chưa được cấu hình trên máy chủ (thiếu ADMIN_PASSWORD).' });
  }
  if (!checkLoginRate(clientIp)) {
    return res.status(429).json({ error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
  }
  const password = String(req.body?.password ?? '');
  if (safeEqual(password, ADMIN_PASSWORD)) {
    const token = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.set(token, Date.now() + ADMIN_TOKEN_TTL);
    return res.json({
      success: true,
      token,
      user: 'Quản trị viên Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa',
    });
  }
  return res.status(401).json({ error: 'Mật khẩu quản trị không đúng.' });
});

// GET /api/admin/event-data - Get full admin details
app.get('/api/admin/event-data', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const totalBudget = prizeTiers.reduce((acc, t) => acc + t.amount * t.totalQuantity, 0);
  const remainingBudget = prizeTiers.reduce(
    (acc, t) => acc + t.amount * t.remainingQuantity,
    0
  );

  const claimsList = Array.from(claimsMap.values()).map((c) => ({
    ...c,
    // Provide full phone only to authorized admin
    momoPhone: c.momoPhone,
  }));

  const ticketsList = Array.from(ticketsMap.values());

  res.json({
    eventConfig,
    prizeTiers,
    totalBudget,
    remainingBudget,
    awardedAmount: totalBudget - remainingBudget,
    tickets: ticketsList,
    claims: claimsList,
    auditLogs: auditLogs.slice(0, 50),
  });
});

// POST /api/admin/update-claim - Admin marks verification / transfer / rejection
app.post('/api/admin/update-claim', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { claimCode, newStatus, momoTransactionRef, rejectionReason, adminNote } = req.body;
  const claim = claimsMap.get(String(claimCode || ''));
  if (!claim) {
    return res.status(404).json({ error: 'Không tìm thấy yêu cầu nhận thưởng này.' });
  }
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    unclaimed: ['rejected', 'expired'],
    pending_verification: ['verified', 'rejected'],
    verified: ['pending_transfer', 'transferred', 'rejected'],
    pending_transfer: ['transferred', 'rejected'],
    transferred: [],
    rejected: ['pending_verification'],
    expired: [],
  };
  if (!ALLOWED_TRANSITIONS[claim.status]?.includes(String(newStatus))) {
    return res.status(400).json({
      error: `Không thể chuyển trạng thái từ "${claim.status}" sang "${newStatus}".`,
    });
  }
  if (newStatus === 'transferred' && !momoTransactionRef) {
    return res.status(400).json({ error: 'Vui lòng nhập Mã giao dịch chuyển tiền MoMo thực tế.' });
  }

  claim.status = newStatus;
  if (adminNote !== undefined) claim.adminNote = adminNote;

  if (newStatus === 'verified') {
    claim.verifiedAt = new Date().toISOString();
  } else if (newStatus === 'pending_transfer') {
    // Status updated to pending transfer
  } else if (newStatus === 'transferred') {
    if (!momoTransactionRef) {
      return res.status(400).json({ error: 'Vui lòng nhập Mã giao dịch chuyển tiền MoMo thực tế.' });
    }
    claim.transferredAt = new Date().toISOString();
    claim.momoTransactionRef = momoTransactionRef;
  } else if (newStatus === 'rejected') {
    claim.rejectionReason = rejectionReason || 'Thông tin xác minh không phù hợp.';
  }

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: `Cập nhật trạng thái nhận thưởng: ${newStatus}`,
    details: `Mã ${claimCode} - Người nhận: ${claim.fullName || 'Chưa cập nhật'} - Ghi chú: ${momoTransactionRef || rejectionReason || adminNote || ''}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();

  return res.json({ success: true, claim });
});

// POST /api/admin/generate-tickets - Generate secure 8-character ticket batch with occasion prefix
app.post('/api/admin/generate-tickets', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { count = 10, occasion = '20-10' } = req.body;
  const numCount = Math.min(Math.max(Number(count) || 10, 1), 100);
  const occPrefix = getOccasionPrefix(occasion);
  const occId = getOccasionFromCode(occPrefix);
  const generated: string[] = [];

  for (let i = 0; i < numCount; i++) {
    const code = generateSecureTicketCode(occPrefix);
    ticketsMap.set(code, {
      code,
      occasion: occId,
      isUsed: false,
      createdAt: new Date().toISOString(),
    });
    generated.push(code);
  }

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: `Phát hành ${numCount} vé bảo mật dịp ${occId}`,
    details: `Tạo ${numCount} vé 8 ký tự (VD: ${generated[0]} đến ${generated[generated.length - 1]})`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();

  res.json({ success: true, count: generated.length, tickets: generated });
});

// POST /api/admin/delete-ticket - Revoke/Delete unused ticket
app.post('/api/admin/delete-ticket', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { code } = req.body;
  const cleanCode = String(code || '').trim().toUpperCase();
  const ticket = ticketsMap.get(cleanCode);
  if (!ticket) {
    return res.status(404).json({ error: 'Không tìm thấy vé trong hệ thống.' });
  }
  if (ticket.isUsed) {
    return res.status(400).json({ error: 'Không thể xóa vé đã qua sử dụng quay thưởng.' });
  }

  ticketsMap.delete(cleanCode);

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Hủy/Xóa vé dự thưởng',
    details: `Đã thu hồi mã vé ${cleanCode}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();

  res.json({ success: true, message: `Đã thu hồi vé ${cleanCode}.` });
});

// POST /api/admin/update-prize-pool - Update prize tiers
app.post('/api/admin/update-prize-pool', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { tiers } = req.body;
  if (!Array.isArray(tiers)) {
    return res.status(400).json({ error: 'Dữ liệu giải thưởng không hợp lệ.' });
  }

  // Validate: min 10.000đ rule!
  for (const t of tiers) {
    const amt = Number(t.amount);
    const qty = Number(t.totalQuantity);
    if (!Number.isInteger(amt) || !Number.isInteger(qty) || qty < 0 || qty > 1000 || amt > 1000000) {
      return res.status(400).json({ error: 'Mức thưởng hoặc số lượng không hợp lệ.' });
    }
    if (Number(t.amount) < 10000) {
      return res.status(400).json({
        error: `Mức thưởng "${t.label}" (${t.amount}đ) thấp hơn mức quy định tối thiểu 10.000đ.`,
      });
    }
  }

  prizeTiers = tiers.map((t) => ({
    id: t.id || `tier-${t.amount}`,
    amount: Number(t.amount),
    label: t.label || `${Number(t.amount).toLocaleString('vi-VN')}đ`,
    totalQuantity: Number(t.totalQuantity) || 0,
    remainingQuantity: Math.min(Number(t.remainingQuantity) || 0, Number(t.totalQuantity) || 0),
    color: t.color || '#FEE2E2',
    textColor: t.textColor || '#991B1B',
  }));

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Cập nhật cấu hình giải thưởng',
    details: `Quản trị viên đã cập nhật lại danh sách và số lượng các mức thưởng MoMo`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();

  res.json({ success: true, prizeTiers });
});

// POST /api/admin/update-budget - Update event total budget and event status
app.post('/api/admin/update-budget', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const { totalBudget, status } = req.body;
  if (typeof totalBudget === 'number' && totalBudget >= 0) {
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'Cập nhật ngân sách sự kiện',
      details: `Ngân sách được điều chỉnh thành ${totalBudget.toLocaleString('vi-VN')} VNĐ`,
      timestamp: new Date().toISOString(),
      adminUser: 'Admin Bách Khoa',
    });
  }
  if (status && ['active', 'paused', 'ended'].includes(status)) {
    eventConfig.status = status;
  }

  saveDatabase();

  res.json({ success: true, totalBudget, status: eventConfig.status });
});

// GET /api/admin/export-csv - Export claims to CSV
app.get('/api/admin/export-csv', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const claimsList = Array.from(claimsMap.values());
  const headers = [
    'Mã nhận thưởng',
    'Mã vé',
    'Số tiền (VNĐ)',
    'Họ và tên',
    'Lớp / Đơn vị',
    'Số điện thoại MoMo',
    'Trạng thái',
    'Mã GD MoMo',
    'Ghi chú phụ huynh',
    'Ghi chú Admin',
    'Thời gian tạo',
    'Thời gian chuyển',
  ];

  const rows = claimsList.map((c) => [
    csvCell(c.claimCode),
    csvCell(c.ticketCode),
    c.amount,
    csvCell(c.fullName || ''),
    csvCell(c.schoolClassOrDepartment || ''),
    csvCell(c.momoPhone || ''),
    csvCell(c.status),
    csvCell(c.momoTransactionRef || ''),
    csvCell(c.guardianNote || ''),
    csvCell(c.adminNote || ''),
    csvCell(c.createdAt),
    csvCell(c.transferredAt || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-thuong-momo-2010.csv"');
  res.send(csvContent);
});

// GET /api/admin/export-tickets - Export tickets list to CSV
app.get('/api/admin/export-tickets', (req: Request, res: Response) => {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị.' });
  }

  const ticketsList = Array.from(ticketsMap.values());
  const headers = ['Mã vé (8 ký tự)', 'Dịp sự kiện', 'Trạng thái', 'Số tiền trúng (VNĐ)', 'Mã nhận thưởng', 'Ngày tạo', 'Ngày quay'];
  const rows = ticketsList.map((t) => [
    csvCell(t.code),
    csvCell(t.occasion || 'Khác'),
    csvCell(t.isUsed ? 'Đã quay' : 'Chưa sử dụng'),
    t.prizeWon || 0,
    csvCell(t.claimCode || ''),
    csvCell(t.createdAt),
    csvCell(t.usedAt || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="danh-sach-ve-quay-8-ky-tu.csv"');
  res.send(csvContent);
});

// Setup Vite in Dev or Static files in Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
