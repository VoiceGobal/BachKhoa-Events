/**
 * API của website sự kiện – chạy như Vercel Function (và chạy local qua server.ts).
 * CSDL duy nhất: Cloud Firestore (database "(default)") qua Firebase Admin SDK.
 *
 * Collection do SERVER sở hữu (client không đọc/ghi được, rules mặc định chặn):
 *   ev_config/event      – cấu hình sự kiện, ngân sách, trạng thái
 *   ev_config/prizes     – { tiers: [...] } các mức giải
 *   ev_tickets/{code}    – vé quay
 *   ev_claims/{claimCode}– yêu cầu nhận thưởng
 *   ev_players/{uid_occ} – số lượt quay đã dùng của từng tài khoản theo dịp
 *   ev_logs/{id}         – nhật ký quản trị
 * Collection để client ĐỌC lịch sử cá nhân (chỉ server ghi):
 *   spins/{id}, claims/{id}
 */
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore, Transaction } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI, Type } from '@google/genai';

// ------------------------------------------------------------------
// Khởi tạo
// ------------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const handler =
  (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('[API] Lỗi không mong đợi:', err);
      res.status(500).json({ error: 'Lỗi máy chủ. Vui lòng thử lại sau giây lát.' });
    });
  };

function initAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const sa = JSON.parse(raw);
    if (typeof sa.private_key === 'string') {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }
    initializeApp({ credential: cert(sa) });
  } else {
    // Local: dùng GOOGLE_APPLICATION_CREDENTIALS nếu có
    initializeApp({ credential: applicationDefault() });
  }
}

let _db: Firestore | null = null;
function getDb(): Firestore {
  if (!_db) {
    initAdmin();
    const dbId = process.env.FIRESTORE_DATABASE_ID; // bỏ trống = database "(default)"
    _db = dbId && dbId !== '(default)' ? getFirestore(dbId) : getFirestore();
    _db.settings({ ignoreUndefinedProperties: true });
  }
  return _db;
}

const C = {
  config: 'ev_config',
  tickets: 'ev_tickets',
  claims: 'ev_claims',
  players: 'ev_players',
  logs: 'ev_logs',
  spinsHistory: 'spins',
  claimsHistory: 'claims',
};

// ------------------------------------------------------------------
// Giới hạn tốc độ (best-effort theo từng instance). Ngưỡng đặt khá rộng vì nhiều học sinh
// dùng chung một IP Wi-Fi của trường; chống lạm dụng thật sự dựa vào đăng nhập +
// hạn mức lượt quay/tài khoản lưu trong Firestore.
// ------------------------------------------------------------------
const rateMap = new Map<string, number[]>();
function checkRate(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (rateMap.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    rateMap.set(key, arr);
    return false;
  }
  arr.push(now);
  rateMap.set(key, arr);
  if (rateMap.size > 5000) rateMap.clear();
  return true;
}
const ipOf = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

// ------------------------------------------------------------------
// Xác thực
// ------------------------------------------------------------------
interface AuthUser {
  uid: string;
  email: string;
}

async function getUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.startsWith('adm.')) return null;
  try {
    getDb();
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || '' };
  } catch {
    return null;
  }
}

async function requireUser(req: Request): Promise<AuthUser> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, 'Vui lòng đăng nhập tài khoản để thực hiện thao tác này.');
  return user;
}

// Token admin không trạng thái: adm.<hết hạn>.<chữ ký HMAC>
const ADMIN_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest();

function adminSecret(): string {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
}
function signAdminToken(): string {
  const exp = String(Date.now() + ADMIN_TOKEN_TTL_MS);
  const sig = crypto.createHmac('sha256', adminSecret()).update(exp).digest('hex');
  return `adm.${exp}.${sig}`;
}
function verifyAdmin(req: Request): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'adm') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret).update(parts[1]).digest('hex');
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAdmin(req: Request) {
  if (!verifyAdmin(req)) throw new HttpError(401, 'Chưa đăng nhập quyền quản trị (hoặc phiên đã hết hạn).');
}

// ------------------------------------------------------------------
// Kiểu dữ liệu & cấu hình mặc định
// ------------------------------------------------------------------
interface PrizeTier {
  id: string;
  amount: number;
  label: string;
  totalQuantity: number;
  remainingQuantity: number;
  color: string;
  textColor: string;
}

interface EventConfig {
  eventName: string;
  organizer: string;
  authorName: string;
  authorUnit: string;
  authorEmail: string;
  year: number;
  status: 'active' | 'paused' | 'ended';
  minRewardAmount: number;
  maxRewardAmount: number;
  aiAttribution: string;
  totalBudget: number;
}

const DEFAULT_EVENT: EventConfig = {
  eventName: '20/10 – Trao Lời Yêu Thương',
  organizer: 'Trường Trung cấp Công nghiệp Bách Khoa',
  authorName: 'Trịnh Tuấn Cường',
  authorUnit: 'Trường Trung cấp Công nghiệp Bách Khoa',
  authorEmail: 'cuongtt.ptit@gmail.com',
  year: 2026,
  status: 'active',
  minRewardAmount: 10000,
  maxRewardAmount: 100000,
  aiAttribution:
    'Website có sử dụng công cụ AI hỗ trợ trong quá trình xây dựng. Nội dung và chức năng cần được người biên soạn kiểm tra trước khi sử dụng chính thức.',
  totalBudget: 500000,
};

const DEFAULT_TIERS: PrizeTier[] = [
  { id: 'tier-10k', amount: 10000, label: '10.000đ', totalQuantity: 10, remainingQuantity: 10, color: '#FEE2E2', textColor: '#991B1B' },
  { id: 'tier-20k', amount: 20000, label: '20.000đ', totalQuantity: 5, remainingQuantity: 5, color: '#FEF3C7', textColor: '#92400E' },
  { id: 'tier-50k', amount: 50000, label: '50.000đ', totalQuantity: 4, remainingQuantity: 4, color: '#EDE9FE', textColor: '#5B21B6' },
  { id: 'tier-100k', amount: 100000, label: '100.000đ', totalQuantity: 1, remainingQuantity: 1, color: '#FFEDD5', textColor: '#C2410C' },
];

// Xác suất trúng giải tiền mỗi lượt quay (khi còn giải & còn ngân sách) và hạn mức lượt/tài khoản
function winRate(): number {
  const v = Number(process.env.WIN_RATE);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.3;
}
function maxSpinsPerUser(): number {
  const v = Number(process.env.MAX_SPINS_PER_USER);
  return Number.isInteger(v) && v > 0 ? v : 3;
}

const mergeEvent = (data: Record<string, unknown> | undefined): EventConfig => ({
  ...DEFAULT_EVENT,
  ...(data || {}),
}) as EventConfig;

const mergeTiers = (data: Record<string, unknown> | undefined): PrizeTier[] =>
  Array.isArray(data?.tiers) && (data!.tiers as unknown[]).length > 0
    ? (data!.tiers as PrizeTier[])
    : DEFAULT_TIERS.map((t) => ({ ...t }));

const evRef = () => getDb().collection(C.config).doc('event');
const prizesRef = () => getDb().collection(C.config).doc('prizes');

async function loadEventAndTiers() {
  const [e, p] = await getDb().getAll(evRef(), prizesRef());
  return { ev: mergeEvent(e.data()), tiers: mergeTiers(p.data()) };
}

// Ngân sách: totalBudget lưu riêng; "đã phân bổ" là tổng các mức giải đã cấu hình
function budgetStats(ev: EventConfig, tiers: PrizeTier[]) {
  const allocated = tiers.reduce((a, t) => a + t.amount * t.totalQuantity, 0);
  const awarded = tiers.reduce((a, t) => a + t.amount * (t.totalQuantity - t.remainingQuantity), 0);
  const totalBudget = Number.isFinite(ev.totalBudget) ? ev.totalBudget : allocated;
  return { allocated, awarded, totalBudget, remaining: Math.max(0, totalBudget - awarded) };
}

const logDoc = (action: string, details: string, adminUser: string) => ({
  id: `log-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
  action,
  details,
  timestamp: new Date().toISOString(),
  adminUser,
});
async function writeLog(action: string, details: string, adminUser: string) {
  const l = logDoc(action, details, adminUser);
  await getDb().collection(C.logs).doc(l.id).set(l);
}

// ------------------------------------------------------------------
// Mã vé / dịp lễ
// ------------------------------------------------------------------
const OCCASION_PREFIX_MAP: Record<string, string> = {
  '20-10': 'PN', '20-11': 'NG', '08-03': 'Q8', tet: 'TT', valentine: 'VL',
  'BKS-2010': 'PN', 'BKS-2011': 'NG', 'BKS-0803': 'Q8', 'BKS-TET': 'TT', 'BKS-LOVE': 'VL',
  PN: 'PN', NG: 'NG', Q8: 'Q8', TT: 'TT', VL: 'VL',
};
function getOccasionPrefix(occasion: string): string {
  const clean = String(occasion || '').trim();
  return OCCASION_PREFIX_MAP[clean] || OCCASION_PREFIX_MAP[clean.toUpperCase()] || 'PN';
}
function getOccasionFromCode(code: string): string {
  const u = code.toUpperCase();
  if (u.startsWith('PN') || u.startsWith('BKS-2010')) return '20-10';
  if (u.startsWith('NG') || u.startsWith('BKS-2011')) return '20-11';
  if (u.startsWith('Q8') || u.startsWith('BKS-0803')) return '08-03';
  if (u.startsWith('TT') || u.startsWith('BKS-TET')) return 'tet';
  if (u.startsWith('VL') || u.startsWith('BKS-LOVE')) return 'valentine';
  return '20-10';
}
const occasionOf = (input: unknown) => getOccasionFromCode(getOccasionPrefix(String(input || '20-10')));

const SECURE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function randomChars(n: number): string {
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += SECURE_CHARS[bytes[i] % SECURE_CHARS.length];
  return s;
}
const generateTicketCode = (prefix: string) => `${(prefix || 'PN').slice(0, 2).toUpperCase()}${randomChars(6)}`;

function claimMeta(code: string) {
  const u = code.toUpperCase();
  if (u.startsWith('NG') || u.startsWith('BKS-2011')) return { label: 'Chương trình 20/11 – Tri Ân Thầy Cô', prefix: 'MOMO-2011' };
  if (u.startsWith('TT') || u.startsWith('BKS-TET')) return { label: 'Chương trình Tết Nguyên Đán – Rước Lộc Đầu Xuân', prefix: 'MOMO-TET' };
  if (u.startsWith('Q8') || u.startsWith('BKS-0803')) return { label: 'Chương trình 08/03 – Quốc Tế Phụ Nữ', prefix: 'MOMO-0803' };
  if (u.startsWith('VL') || u.startsWith('BKS-LOVE')) return { label: 'Chương trình 14/02 – Lễ Tình Nhân', prefix: 'MOMO-LOVE' };
  return { label: 'Chương trình 20/10 – Trao Lời Yêu Thương', prefix: 'MOMO-2010' };
}

const isAlreadyExists = (e: unknown) => (e as { code?: number })?.code === 6;
const maskPhone = (p: string) => (!p || p.length < 7 ? p : p.slice(0, 3) + '****' + p.slice(-3));
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // chống CSV injection
  return `"${s.replace(/"/g, '""')}"`;
};

// ------------------------------------------------------------------
// Vòng quay: các ô cố định trên giao diện
// ------------------------------------------------------------------
const CASH_SLICES = [
  { index: 0, amount: 10000 },
  { index: 2, amount: 20000 },
  { index: 4, amount: 50000 },
  { index: 6, amount: 100000 },
];
const sliceForAmount = (amount: number) =>
  CASH_SLICES.reduce((best, s) => (Math.abs(s.amount - amount) < Math.abs(best.amount - amount) ? s : best)).index;

const UNIFIED_SLICES = [
  { index: 0, label: '10.000đ', wish: 'Chúc mừng bạn trúng giải thưởng 10.000đ qua ví MoMo!' },
  { index: 1, label: 'Bình An', wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!' },
  { index: 2, label: '20.000đ', wish: 'Chúc mừng bạn trúng lì xì 20.000đ ví MoMo từ chương trình 20/10!' },
  { index: 3, label: 'Tự Tin', wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!' },
  { index: 4, label: '50.000đ', wish: 'Tuyệt vời! Bạn đã trúng giải thưởng 50.000đ vào ví MoMo!' },
  { index: 5, label: 'Hạnh Phúc', wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!' },
  { index: 6, label: '100.000đ', wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ chuyển khoản ví MoMo!' },
  { index: 7, label: 'Tri Ân 20/10', wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến người phụ nữ tuyệt vời!' },
];
const NON_CASH_INDEXES = [1, 3, 5, 7];
const randInt = (max: number) => crypto.randomInt(0, Math.max(1, max));

// ------------------------------------------------------------------
// 1. Lời chúc bằng Gemini (khóa API chỉ nằm ở biến môi trường server)
// ------------------------------------------------------------------
const fallbackWishes = [
  { title: 'Chúc mừng ngày Phụ nữ Việt Nam 20/10', message: 'Nhân ngày 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống. Bạn luôn là đóa hoa ngát hương mang lại nguồn cảm hứng tuyệt vời cho mọi người xung quanh!' },
  { title: 'Gửi trọn yêu thương ngày 20 tháng 10', message: 'Chúc người phụ nữ tuyệt vời ngày 20/10 thân tâm an lạc, vạn sự hanh thông, công việc thuận lợi và mỗi ngày đều tìm thấy những lý do ngọt ngào để mỉm cười an nhiên!' },
  { title: 'Rạng rỡ và tỏa sáng theo cách riêng', message: 'Chúc bạn ngày 20/10 nhận được nhiều hoa tươi và những lời chúc tốt đẹp nhất. Hãy luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên hành trình của chính mình!' },
];

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim().length < 10) return null;
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey: key });
    } catch (err) {
      console.warn('Không khởi tạo được Gemini client:', err);
    }
  }
  return aiClient;
}

app.post('/api/gemini/generate-wish', handler(async (req, res) => {
  if (!checkRate(`wish:${ipOf(req)}`, 60)) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
      isAiGenerated: false,
      message: fallbackWishes[0].message,
      title: fallbackWishes[0].title,
      modelNote: 'Đã chọn từ kho lời chúc mẫu do bạn thao tác quá nhanh.',
    });
  }

  const b = req.body || {};
  const safeName = String(b.recipientName ?? '').slice(0, 50).trim();
  const safeProfession = String(b.profession ?? '').slice(0, 50).trim();
  const safeRelationship = String(b.relationship ?? 'Mẹ').slice(0, 50).trim();
  const safePronoun = String(b.pronoun ?? '').slice(0, 40).trim();
  const safeTone = String(b.tone ?? 'refined').slice(0, 30);
  const safeLength = String(b.length ?? 'medium').slice(0, 20);
  const safeTheme = String(b.theme ?? 'happiness').slice(0, 30);
  const safeHoliday = String(b.holiday ?? '20-10').slice(0, 20);

  const holidayTitles: Record<string, string> = {
    '20-10': 'ngày Phụ Nữ Việt Nam 20/10',
    '20-11': 'ngày Nhà Giáo Việt Nam 20/11 (Tri ân Thầy Cô)',
    '08-03': 'ngày Quốc Tế Phụ Nữ 8/3',
    tet: 'Tết Nguyên Đán & Mừng Xuân',
    valentine: 'ngày Lễ Tình Nhân 14/2',
  };
  const holidayName = holidayTitles[safeHoliday] || 'ngày lễ đặc biệt 20/10';

  const fallback = () => {
    const f = fallbackWishes[randInt(fallbackWishes.length)];
    return {
      title: `${f.title} (${holidayName})`,
      message: safeName ? `Gửi ${safeName}! ${f.message}` : f.message,
      tone: safeTone,
      recipientType: safeRelationship,
      isAiGenerated: false,
      modelNote: `Đã chọn từ kho lời chúc tuyển chọn cho ${holidayName}.`,
    };
  };

  const ai = getAi();
  if (!ai) return res.json(fallback());

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

    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 9000));
    const call = ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: `Hãy tạo lời chúc cho dịp ${holidayName} theo các thông số đã cung cấp.`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
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
    const response = await Promise.race([call, timeout]);
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
  } catch (err) {
    console.error('Gemini call error:', err);
    return res.json(fallback());
  }
}));

// ------------------------------------------------------------------
// 2. Thông tin công khai của sự kiện
// ------------------------------------------------------------------
let infoCache: { at: number; data: unknown } | null = null;

app.get('/api/event/info', handler(async (_req, res) => {
  if (infoCache && Date.now() - infoCache.at < 10_000) return res.json(infoCache.data);
  const { ev, tiers } = await loadEventAndTiers();
  const s = budgetStats(ev, tiers);
  const data = {
    ...ev,
    totalBudget: s.totalBudget,
    remainingBudget: s.remaining,
    awardedAmount: s.awarded,
    allocatedBudget: s.allocated,
    totalPrizes: tiers.reduce((a, t) => a + t.totalQuantity, 0),
    remainingPrizes: tiers.reduce((a, t) => a + t.remainingQuantity, 0),
    tiers,
  };
  infoCache = { at: Date.now(), data };
  res.json(data);
}));

app.get('/api/spin/public-tickets', handler(async (req, res) => {
  const occ = occasionOf(req.query.prefix);
  const base = getDb().collection(C.tickets).where('occasion', '==', occ);
  const [total, remaining] = await Promise.all([
    base.count().get(),
    base.where('isUsed', '==', false).count().get(),
  ]);
  // Không bao giờ trả mã vé ra ngoài
  res.json({
    tickets: [],
    totalTickets: total.data().count,
    totalForOccasion: total.data().count,
    remainingForOccasion: remaining.data().count,
    message: 'Mã vé dự thưởng được bảo mật riêng cho từng dịp lễ.',
  });
}));

// ------------------------------------------------------------------
// 3. Vé & quay thưởng
// ------------------------------------------------------------------
// Cấp vé nhanh: BẮT BUỘC đăng nhập, tính vào hạn mức lượt quay của tài khoản
async function issueQuickTicket(user: AuthUser, occId: string): Promise<string> {
  const db = getDb();
  const limit = maxSpinsPerUser();
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = generateTicketCode(getOccasionPrefix(occId));
    try {
      await db.runTransaction(async (tx: Transaction) => {
        const playerRef = db.collection(C.players).doc(`${user.uid}_${occId}`);
        const [eSnap, pSnap] = await tx.getAll(evRef(), playerRef);
        const ev = mergeEvent(eSnap.data());
        if (ev.status !== 'active') throw new HttpError(403, 'Sự kiện hiện đang tạm dừng hoặc đã kết thúc.');
        const used = Number(pSnap.data()?.used || 0);
        if (used >= limit) {
          throw new HttpError(429, `Tài khoản đã dùng hết ${limit} lượt quay của dịp này.`);
        }
        const now = new Date().toISOString();
        tx.set(playerRef, { uid: user.uid, occasion: occId, used: used + 1, updatedAt: now }, { merge: true });
        tx.create(db.collection(C.tickets).doc(code), {
          code, occasion: occId, isUsed: false, uid: user.uid, userEmail: user.email, createdAt: now,
        });
        const l = logDoc('Cấp vé bảo mật', `Tạo vé ${code} (dịp ${occId})`, 'Cổng sự kiện tự động');
        tx.set(db.collection(C.logs).doc(l.id), l);
      });
      return code;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (!isAlreadyExists(err) || attempt === 3) throw err;
    }
  }
  throw new HttpError(500, 'Không thể cấp vé, vui lòng thử lại.');
}

app.post('/api/spin/generate-quick-ticket', handler(async (req, res) => {
  if (!checkRate(`qt:${ipOf(req)}`, 60)) throw new HttpError(429, 'Thao tác quá nhanh. Vui lòng thử lại sau.');
  const user = await requireUser(req);
  const occId = occasionOf(req.body?.prefix);
  const code = await issueQuickTicket(user, occId);
  res.json({ success: true, ticketCode: code, isNew: true });
}));

app.post('/api/spin/check-ticket', handler(async (req, res) => {
  if (!checkRate(`ct:${ipOf(req)}`, 120)) throw new HttpError(429, 'Thao tác quá nhanh. Vui lòng thử lại sau.');
  const code = String(req.body?.ticketCode || '').trim().toUpperCase();
  if (!code || code.length > 30 || code.includes('/')) {
    throw new HttpError(400, 'Vui lòng nhập mã vé cần kiểm tra.');
  }
  const snap = await getDb().collection(C.tickets).doc(code).get();
  if (!snap.exists) {
    return res.status(404).json({ valid: false, error: `Mã vé "${code}" không tồn tại trong hệ thống Trường Trung cấp Công nghiệp Bách Khoa.` });
  }
  const t = snap.data()!;
  if (t.isUsed) {
    return res.status(400).json({ valid: false, isUsed: true, error: `Mã vé "${code}" đã được sử dụng lúc ${new Date(t.usedAt || '').toLocaleString('vi-VN')}.` });
  }
  res.json({ valid: true, isUsed: false, code, message: `Mã vé "${code}" hợp lệ! Bạn có thể sử dụng để quay ngay bây giờ.` });
}));

interface SpinInput {
  ticketCode?: string; // quay bằng vé
  user: AuthUser | null;
  freeOccasion?: string; // quay miễn phí theo tài khoản (không có vé)
}

async function executeSpin(input: SpinInput) {
  const db = getDb();
  const isFree = !input.ticketCode;
  if (isFree && !input.user) throw new HttpError(401, 'Vui lòng đăng nhập để dùng lượt quay miễn phí.');

  const occId = isFree ? occasionOf(input.freeOccasion) : getOccasionFromCode(input.ticketCode!);
  const ticketCode = input.ticketCode || generateTicketCode(getOccasionPrefix(occId));
  const limit = maxSpinsPerUser();

  return db.runTransaction(async (tx: Transaction) => {
    const ticketRef = db.collection(C.tickets).doc(ticketCode);
    const playerRef = input.user ? db.collection(C.players).doc(`${input.user.uid}_${occId}`) : null;
    const refs = [evRef(), prizesRef(), ticketRef];
    if (isFree && playerRef) refs.push(playerRef);
    const snaps = await tx.getAll(...refs);

    const ev = mergeEvent(snaps[0].data());
    const tiers = mergeTiers(snaps[1].data());
    const ticket = snaps[2].data();
    const player = isFree ? snaps[3]?.data() : undefined;

    if (ev.status !== 'active') throw new HttpError(403, 'Sự kiện vòng quay hiện đang tạm dừng hoặc đã kết thúc.');

    if (isFree) {
      if (ticket) throw new HttpError(500, 'Xung đột mã vé, vui lòng thử lại.');
      if (Number(player?.used || 0) >= limit) {
        throw new HttpError(429, `Tài khoản đã dùng hết ${limit} lượt quay của dịp này. Hãy nhập mã vé từ trường để tiếp tục.`);
      }
    } else {
      if (!snaps[2].exists) throw new HttpError(404, `Mã vé "${ticketCode}" không tồn tại trong danh sách phát hành của trường. Vui lòng kiểm tra lại.`);
      if (ticket!.isUsed) {
        throw new HttpError(400, `Mã vé "${ticketCode}" đã được sử dụng lúc ${new Date(ticket!.usedAt || '').toLocaleString('vi-VN')}. Mỗi vé chỉ được quay 1 lần.`);
      }
    }

    // ---- Chọn kết quả (trọng số theo số giải còn lại, tôn trọng ngân sách) ----
    const stats = budgetStats(ev, tiers);
    const eligible = tiers.filter((t) => t.remainingQuantity > 0 && t.amount <= stats.remaining);
    const now = new Date().toISOString();
    const uid = input.user?.uid || ticket?.uid || undefined;
    const userEmail = input.user?.email || ticket?.userEmail || undefined;

    let selected: PrizeTier | null = null;
    if (eligible.length > 0 && randInt(1_000_000) / 1_000_000 < winRate()) {
      const totalWeight = eligible.reduce((a, t) => a + t.remainingQuantity, 0);
      let r = randInt(totalWeight);
      for (const t of eligible) {
        if (r < t.remainingQuantity) { selected = t; break; }
        r -= t.remainingQuantity;
      }
      selected = selected || eligible[0];
    }

    const spinId = `spin-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    let result: Record<string, unknown>;
    let claimCode: string | undefined;

    if (selected) {
      const meta = claimMeta(ticketCode);
      claimCode = `${meta.prefix}-${randomChars(6)}`;
      const segmentIndex = sliceForAmount(selected.amount);
      selected.remainingQuantity -= 1;

      tx.set(prizesRef(), { tiers });
      tx.set(db.collection(C.claims).doc(claimCode), {
        id: `claim-${claimCode}`, claimCode, ticketCode, amount: selected.amount,
        fullName: '', schoolClassOrDepartment: '', momoPhone: '',
        status: 'unclaimed', createdAt: now, uid, userEmail, spinId: uid ? spinId : undefined,
      });
      result = {
        success: true, isDemo: false, isCashPrize: true, prizeAmount: selected.amount,
        label: selected.label, segmentIndex, claimCode, ticketCode,
        wishMessage: `Chúc mừng bạn đã trúng thưởng ${selected.label} qua ví MoMo từ ${meta.label}! Vui lòng điền thông tin để ban tổ chức kiểm tra và chuyển thưởng.`,
      };
      const l = logDoc('Trúng thưởng MoMo', `Vé ${ticketCode} trúng ${selected.label}. Mã nhận thưởng: ${claimCode}`, 'Người tham gia');
      tx.set(db.collection(C.logs).doc(l.id), l);
    } else {
      const outOfPrizes = eligible.length === 0;
      const idx = outOfPrizes ? 7 : NON_CASH_INDEXES[randInt(NON_CASH_INDEXES.length)];
      const slice = UNIFIED_SLICES[idx];
      result = {
        success: true, isDemo: false, isCashPrize: false, prizeAmount: 0,
        label: slice.label, segmentIndex: idx, ticketCode,
        wishMessage: outOfPrizes
          ? 'Toàn bộ ngân sách giải thưởng tiền mặt MoMo của sự kiện đã được trao hết. Bạn nhận được món quà tinh thần đặc biệt: Một lời tri ân chân thành nhất từ ban tổ chức!'
          : slice.wish,
      };
    }

    // ---- Ghi vé / lượt quay / lịch sử ----
    const ticketData = {
      code: ticketCode, occasion: occId, isUsed: true, usedAt: now,
      usedBy: uid || '', prizeWon: selected ? selected.amount : 0, claimCode,
      uid, userEmail, auto: isFree || undefined,
    };
    if (isFree) {
      tx.create(ticketRef, { ...ticketData, createdAt: now });
      tx.set(playerRef!, { uid: input.user!.uid, occasion: occId, used: Number(player?.used || 0) + 1, updatedAt: now }, { merge: true });
    } else {
      tx.update(ticketRef, ticketData);
    }
    if (uid) {
      tx.set(db.collection(C.spinsHistory).doc(spinId), {
        id: spinId, userId: uid, userEmail: userEmail || '',
        segmentIndex: result.segmentIndex, label: result.label, wishMessage: result.wishMessage,
        prizeAmount: result.prizeAmount, isCashPrize: result.isCashPrize,
        claimCode: claimCode || '', claimed: false, createdAt: now,
      });
    }
    return result;
  });
}

app.post('/api/spin/play', handler(async (req, res) => {
  if (!checkRate(`play:${ipOf(req)}`, 60)) throw new HttpError(429, 'Thao tác quá nhanh. Vui lòng thử lại sau 30 giây.');
  const { ticketCode, isDemo = false, useFreeSpin = false, occasion } = req.body || {};

  const { ev } = await loadEventAndTiers();
  if (ev.status !== 'active') throw new HttpError(403, 'Sự kiện vòng quay hiện đang tạm dừng hoặc đã kết thúc.');

  // Quay thử: không ghi dữ liệu, không trao thưởng
  if (isDemo || ticketCode === 'DEMO-2010') {
    const s = UNIFIED_SLICES[randInt(UNIFIED_SLICES.length)];
    return res.json({
      success: true, isDemo: true, segmentIndex: s.index, label: s.label, wishMessage: s.wish, prizeAmount: 0,
      note: 'Lượt quay thử nghiệm. Nhập mã vé chính thức hoặc đăng nhập để nhận thưởng MoMo.',
    });
  }

  const user = await getUser(req);
  const clean = String(ticketCode || '').trim().toUpperCase();
  if (clean) {
    if (clean.length > 30 || clean.includes('/')) throw new HttpError(404, `Mã vé "${clean}" không hợp lệ.`);
    return res.json(await executeSpin({ ticketCode: clean, user }));
  }
  if (useFreeSpin) return res.json(await executeSpin({ user, freeOccasion: occasion }));
  throw new HttpError(400, 'Vui lòng nhập mã vé dự thưởng hợp lệ hoặc chọn quay thử nghiệm.');
}));

// ------------------------------------------------------------------
// 4. Nhận thưởng
// ------------------------------------------------------------------
const toHistoryStatus = (s: string) =>
  s === 'verified' ? 'verified' : s === 'transferred' ? 'transferred' : s === 'rejected' || s === 'expired' ? 'rejected' : 'pending';

app.post('/api/spin/claim-info', handler(async (req, res) => {
  if (!checkRate(`ci:${ipOf(req)}`, 120)) throw new HttpError(429, 'Thao tác quá nhanh. Vui lòng thử lại sau.');
  const code = String(req.body?.claimCode || '').trim().toUpperCase();
  if (!code || code.length > 50 || code.includes('/')) throw new HttpError(400, 'Thiếu mã nhận thưởng.');
  const snap = await getDb().collection(C.claims).doc(code).get();
  if (!snap.exists) throw new HttpError(404, 'Mã nhận thưởng không tồn tại.');
  const c = snap.data()!;
  res.json({
    claimCode: c.claimCode, ticketCode: c.ticketCode, amount: c.amount, status: c.status,
    createdAt: c.createdAt, verifiedAt: c.verifiedAt, transferredAt: c.transferredAt,
    momoTransactionRef: c.momoTransactionRef, rejectionReason: c.rejectionReason,
    maskedPhone: maskPhone(c.momoPhone), fullName: c.fullName, schoolClassOrDepartment: c.schoolClassOrDepartment,
  });
}));

app.post('/api/spin/submit-claim', handler(async (req, res) => {
  if (!checkRate(`sc:${ipOf(req)}`, 60)) throw new HttpError(429, 'Thao tác quá nhanh. Vui lòng thử lại sau.');
  const { claimCode, fullName, schoolClassOrDepartment, momoPhone, guardianNote } = req.body || {};
  const code = String(claimCode || '').trim().toUpperCase();
  if (!code || code.length > 50 || code.includes('/')) throw new HttpError(400, 'Thiếu mã nhận thưởng.');

  const phone = String(momoPhone || '').trim().replace(/\D/g, '');
  if (!/^(03|05|07|08|09)\d{8}$/.test(phone)) {
    throw new HttpError(400, 'Số điện thoại ví MoMo không hợp lệ (Phải là số điện thoại Việt Nam 10 số, bắt đầu bằng 03, 05, 07, 08, 09).');
  }
  const name = String(fullName || '').trim().slice(0, 100);
  if (name.length < 2) throw new HttpError(400, 'Vui lòng nhập họ và tên đầy đủ của bạn.');
  const cls = String(schoolClassOrDepartment || '').trim().slice(0, 150);
  if (cls.length < 2) throw new HttpError(400, 'Vui lòng nhập Lớp học hoặc Phòng/Ban công tác tại trường.');
  const note = String(guardianNote || '').trim().slice(0, 500);

  const db = getDb();
  const ref = db.collection(C.claims).doc(code);
  const claim = await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Mã nhận thưởng không hợp lệ.');
    const c = snap.data()!;
    if (!['unclaimed', 'pending_verification'].includes(c.status)) {
      throw new HttpError(400, 'Yêu cầu nhận thưởng này đã được ban tổ chức xử lý, không thể chỉnh sửa.');
    }
    const upd = { fullName: name, schoolClassOrDepartment: cls, momoPhone: phone, guardianNote: note, status: 'pending_verification' };
    tx.update(ref, upd);
    const l = logDoc('Nộp yêu cầu nhận thưởng', `${name} (${cls}) yêu cầu nhận ${Number(c.amount).toLocaleString('vi-VN')}đ qua MoMo ${maskPhone(phone)}. Mã: ${code}`, 'Người nhận thưởng');
    tx.set(db.collection(C.logs).doc(l.id), l);
    return { ...c, ...upd };
  });

  // Đồng bộ lịch sử cá nhân (chỉ khi lượt quay gắn với tài khoản)
  if (claim.uid) {
    const now = new Date().toISOString();
    try {
      await db.collection(C.claimsHistory).doc(claim.id).set({
        id: claim.id, claimCode: code, userId: claim.uid, userEmail: claim.userEmail || '',
        fullName: name, momoPhone: phone, department: cls, amount: claim.amount,
        note, status: 'pending', createdAt: claim.createdAt, updatedAt: now,
      });
      if (claim.spinId) await db.collection(C.spinsHistory).doc(claim.spinId).update({ claimed: true });
    } catch (err) {
      console.warn('Không đồng bộ được lịch sử cá nhân:', err);
    }
  }

  res.json({
    success: true,
    message: 'Gửi thông tin nhận thưởng thành công! Quản trị viên sẽ xác minh và chuyển tiền qua MoMo sớm nhất.',
    claimCode: code,
    status: 'pending_verification',
  });
}));

// ------------------------------------------------------------------
// 5. Quản trị
// ------------------------------------------------------------------
app.post('/api/admin/login', handler(async (req, res) => {
  if (!checkRate(`login:${ipOf(req)}`, 5, 5 * 60_000)) {
    throw new HttpError(429, 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau vài phút.');
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new HttpError(503, 'Chưa cấu hình ADMIN_PASSWORD trên máy chủ.');
  const given = String(req.body?.password || '');
  const ok = crypto.timingSafeEqual(sha256(given), sha256(expected));
  if (!ok) throw new HttpError(401, 'Mật khẩu quản trị không đúng.');
  res.json({ success: true, token: signAdminToken(), user: 'Quản trị viên Trường Trung cấp Công nghiệp Bách Khoa' });
}));

app.get('/api/admin/event-data', handler(async (req, res) => {
  requireAdmin(req);
  const db = getDb();
  const [{ ev, tiers }, tSnap, cSnap, lSnap] = await Promise.all([
    loadEventAndTiers(),
    db.collection(C.tickets).orderBy('createdAt', 'desc').limit(500).get(),
    db.collection(C.claims).orderBy('createdAt', 'desc').limit(500).get(),
    db.collection(C.logs).orderBy('timestamp', 'desc').limit(50).get(),
  ]);
  const s = budgetStats(ev, tiers);
  res.json({
    eventConfig: ev,
    prizeTiers: tiers,
    totalBudget: s.totalBudget,
    remainingBudget: s.remaining,
    awardedAmount: s.awarded,
    allocatedBudget: s.allocated,
    tickets: tSnap.docs.map((d) => d.data()),
    claims: cSnap.docs.map((d) => d.data()),
    auditLogs: lSnap.docs.map((d) => d.data()),
  });
}));

const CLAIM_STATUSES = ['unclaimed', 'pending_verification', 'verified', 'pending_transfer', 'transferred', 'rejected', 'expired'];

app.post('/api/admin/update-claim', handler(async (req, res) => {
  requireAdmin(req);
  const { claimCode, newStatus, momoTransactionRef, rejectionReason, adminNote } = req.body || {};
  const code = String(claimCode || '').trim().toUpperCase();
  if (!CLAIM_STATUSES.includes(newStatus)) throw new HttpError(400, 'Trạng thái không hợp lệ.');
  if (newStatus === 'transferred' && !String(momoTransactionRef || '').trim()) {
    throw new HttpError(400, 'Vui lòng nhập Mã giao dịch chuyển tiền MoMo thực tế.');
  }
  const db = getDb();
  const ref = db.collection(C.claims).doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Không tìm thấy yêu cầu nhận thưởng này.');
  const c = snap.data()!;

  const now = new Date().toISOString();
  const upd: Record<string, unknown> = { status: newStatus };
  if (adminNote !== undefined) upd.adminNote = String(adminNote).slice(0, 500);
  if (newStatus === 'verified') upd.verifiedAt = now;
  if (newStatus === 'transferred') {
    upd.transferredAt = now;
    upd.momoTransactionRef = String(momoTransactionRef).trim().slice(0, 100);
  }
  if (newStatus === 'rejected') upd.rejectionReason = String(rejectionReason || 'Thông tin xác minh không phù hợp.').slice(0, 500);

  await ref.update(upd);
  if (c.uid) {
    try {
      await db.collection(C.claimsHistory).doc(c.id).set({
        status: toHistoryStatus(newStatus),
        adminNote: upd.adminNote ?? c.adminNote ?? '',
        transactionRef: upd.momoTransactionRef ?? c.momoTransactionRef ?? '',
        updatedAt: now,
      }, { merge: true });
    } catch (err) {
      console.warn('Không đồng bộ được lịch sử cá nhân:', err);
    }
  }
  await writeLog(
    `Cập nhật trạng thái nhận thưởng: ${newStatus}`,
    `Mã ${code} - Người nhận: ${c.fullName || 'Chưa cập nhật'} - Ghi chú: ${momoTransactionRef || rejectionReason || adminNote || ''}`,
    'Admin Bách Khoa',
  );
  res.json({ success: true, claim: { ...c, ...upd } });
}));

app.post('/api/admin/generate-tickets', handler(async (req, res) => {
  requireAdmin(req);
  const { count = 10, occasion = '20-10' } = req.body || {};
  const n = Math.min(Math.max(Number(count) || 10, 1), 100);
  const occId = occasionOf(occasion);
  const prefix = getOccasionPrefix(occId);
  const db = getDb();

  let codes: string[] = [];
  for (let attempt = 0; attempt < 5 && codes.length < n; attempt++) {
    const candidates = new Set<string>(codes);
    while (candidates.size < n) candidates.add(generateTicketCode(prefix));
    const list = Array.from(candidates);
    const snaps = await db.getAll(...list.map((c) => db.collection(C.tickets).doc(c)));
    codes = list.filter((_, i) => !snaps[i].exists);
  }
  if (codes.length < n) throw new HttpError(500, 'Không tạo đủ mã vé duy nhất, vui lòng thử lại.');

  const now = new Date().toISOString();
  const batch = db.batch();
  codes.forEach((code) => batch.set(db.collection(C.tickets).doc(code), { code, occasion: occId, isUsed: false, createdAt: now }));
  await batch.commit();
  await writeLog(`Phát hành ${n} vé bảo mật dịp ${occId}`, `Tạo ${n} vé 8 ký tự (VD: ${codes[0]} đến ${codes[codes.length - 1]})`, 'Admin Bách Khoa');
  res.json({ success: true, count: codes.length, tickets: codes });
}));

app.post('/api/admin/delete-ticket', handler(async (req, res) => {
  requireAdmin(req);
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code || code.includes('/')) throw new HttpError(404, 'Không tìm thấy vé trong hệ thống.');
  const db = getDb();
  await db.runTransaction(async (tx: Transaction) => {
    const ref = db.collection(C.tickets).doc(code);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Không tìm thấy vé trong hệ thống.');
    if (snap.data()!.isUsed) throw new HttpError(400, 'Không thể xóa vé đã qua sử dụng quay thưởng.');
    tx.delete(ref);
  });
  await writeLog('Hủy/Xóa vé dự thưởng', `Đã thu hồi mã vé ${code}`, 'Admin Bách Khoa');
  res.json({ success: true, message: `Đã thu hồi vé ${code}.` });
}));

app.post('/api/admin/update-prize-pool', handler(async (req, res) => {
  requireAdmin(req);
  const input = req.body?.tiers;
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
    throw new HttpError(400, 'Dữ liệu giải thưởng không hợp lệ.');
  }
  const db = getDb();
  const result = await db.runTransaction(async (tx: Transaction) => {
    const [eSnap, pSnap] = await tx.getAll(evRef(), prizesRef());
    const ev = mergeEvent(eSnap.data());
    const old = mergeTiers(pSnap.data());

    const tiers: PrizeTier[] = input.map((t: Partial<PrizeTier>) => {
      const amount = Number(t.amount);
      const total = Number(t.totalQuantity);
      if (!Number.isInteger(amount) || amount < ev.minRewardAmount) {
        throw new HttpError(400, `Mức thưởng "${t.label}" (${t.amount}đ) thấp hơn mức quy định tối thiểu ${ev.minRewardAmount.toLocaleString('vi-VN')}đ.`);
      }
      if (!Number.isInteger(total) || total < 0 || total > 10000) {
        throw new HttpError(400, `Số lượng giải của mức "${t.label}" không hợp lệ.`);
      }
      const id = String(t.id || `tier-${amount}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
      // Giữ nguyên số giải ĐÃ TRAO: còn lại = tổng mới − đã trao (tránh ghi đè lượt quay đang diễn ra)
      const prev = old.find((o) => o.id === id);
      const awarded = prev ? prev.totalQuantity - prev.remainingQuantity : 0;
      return {
        id,
        amount,
        label: String(t.label || `${amount.toLocaleString('vi-VN')}đ`).slice(0, 40),
        totalQuantity: total,
        remainingQuantity: Math.min(total, Math.max(0, total - awarded)),
        color: String(t.color || '#FEE2E2').slice(0, 20),
        textColor: String(t.textColor || '#991B1B').slice(0, 20),
      };
    });
    tx.set(prizesRef(), { tiers });
    const l = logDoc('Cập nhật cấu hình giải thưởng', 'Quản trị viên đã cập nhật lại danh sách và số lượng các mức thưởng MoMo', 'Admin Bách Khoa');
    tx.set(db.collection(C.logs).doc(l.id), l);
    return tiers;
  });
  infoCache = null;
  res.json({ success: true, prizeTiers: result });
}));

// Sửa lỗi ngân sách: lưu totalBudget vào CSDL thay vì chỉ ghi nhật ký
app.post('/api/admin/update-budget', handler(async (req, res) => {
  requireAdmin(req);
  const { totalBudget, status } = req.body || {};
  const patch: Record<string, unknown> = {};

  if (totalBudget !== undefined) {
    const n = Number(totalBudget);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) throw new HttpError(400, 'Ngân sách không hợp lệ.');
    patch.totalBudget = Math.round(n);
  }
  if (status !== undefined) {
    if (!['active', 'paused', 'ended'].includes(status)) throw new HttpError(400, 'Trạng thái sự kiện không hợp lệ.');
    patch.status = status;
  }
  if (Object.keys(patch).length === 0) throw new HttpError(400, 'Không có dữ liệu để cập nhật.');

  await evRef().set(patch, { merge: true });
  infoCache = null;
  if (patch.totalBudget !== undefined) {
    await writeLog('Cập nhật ngân sách sự kiện', `Ngân sách được điều chỉnh thành ${Number(patch.totalBudget).toLocaleString('vi-VN')} VNĐ`, 'Admin Bách Khoa');
  }
  if (patch.status !== undefined) {
    await writeLog('Cập nhật trạng thái sự kiện', `Trạng thái: ${patch.status}`, 'Admin Bách Khoa');
  }
  const { ev, tiers } = await loadEventAndTiers();
  const s = budgetStats(ev, tiers);
  res.json({ success: true, totalBudget: s.totalBudget, remainingBudget: s.remaining, allocatedBudget: s.allocated, status: ev.status });
}));

app.get('/api/admin/export-csv', handler(async (req, res) => {
  requireAdmin(req);
  const snap = await getDb().collection(C.claims).orderBy('createdAt', 'desc').get();
  const headers = ['Mã nhận thưởng', 'Mã vé', 'Số tiền (VNĐ)', 'Họ và tên', 'Lớp / Đơn vị', 'Số điện thoại MoMo', 'Trạng thái', 'Mã GD MoMo', 'Ghi chú phụ huynh', 'Ghi chú Admin', 'Thời gian tạo', 'Thời gian chuyển'];
  const rows = snap.docs.map((d) => {
    const c = d.data();
    return [c.claimCode, c.ticketCode, c.amount, c.fullName, c.schoolClassOrDepartment, c.momoPhone, c.status, c.momoTransactionRef, c.guardianNote, c.adminNote, c.createdAt, c.transferredAt].map(csvCell).join(',');
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-thuong-momo.csv"');
  res.send('\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\n'));
}));

app.get('/api/admin/export-tickets', handler(async (req, res) => {
  requireAdmin(req);
  const snap = await getDb().collection(C.tickets).orderBy('createdAt', 'desc').get();
  const headers = ['Mã vé (8 ký tự)', 'Dịp sự kiện', 'Trạng thái', 'Số tiền trúng (VNĐ)', 'Mã nhận thưởng', 'Ngày tạo', 'Ngày quay'];
  const rows = snap.docs.map((d) => {
    const t = d.data();
    return [t.code, t.occasion || 'Khác', t.isUsed ? 'Đã quay' : 'Chưa sử dụng', t.prizeWon || 0, t.claimCode, t.createdAt, t.usedAt].map(csvCell).join(',');
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="danh-sach-ve-quay.csv"');
  res.send('\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\n'));
}));

// Không khớp route API nào
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Không tìm thấy đường dẫn API.' });
});

export default app;
