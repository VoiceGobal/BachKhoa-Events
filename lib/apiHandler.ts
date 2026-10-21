import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { getFirebaseAdmin, getUserFromRequest, requireAdmin } from './firebaseAdmin';

const DEFAULT_EVENT = { status: 'active', totalBudget: 500000, awardedAmount: 0, remainingBudget: 500000, remainingPrizes: 20 };
const DEFAULT_TIERS = [
  { id: 'tier-10k', amount: 10000, label: '10.000đ', totalQuantity: 10, remainingQuantity: 10, color: '#EDE9FE', textColor: '#5B21B6' },
  { id: 'tier-20k', amount: 20000, label: '20.000đ', totalQuantity: 6, remainingQuantity: 6, color: '#FEF3C7', textColor: '#92400E' },
  { id: 'tier-50k', amount: 50000, label: '50.000đ', totalQuantity: 3, remainingQuantity: 3, color: '#FEE2E2', textColor: '#991B1B' },
  { id: 'tier-100k', amount: 100000, label: '100.000đ', totalQuantity: 1, remainingQuantity: 1, color: '#FCE7F3', textColor: '#9D174D' },
];
const FREE_WISHES = [
  { index: 1, label: 'Bình An', wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!' },
  { index: 3, label: 'Tự Tin', wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!' },
  { index: 5, label: 'Hạnh Phúc', wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!' },
  { index: 7, label: 'Tri Ân', wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến bạn nhân dịp đặc biệt này!' },
];

class HttpError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

const clean = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const makeCode = (prefix: string, size = 6) => {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return prefix + Array.from(randomBytes(size), (byte) => alphabet[byte % alphabet.length]).join('');
};
const makeClaimCode = (ticketCode: string) => {
  const prefix = ticketCode.startsWith('NG') ? 'MOMO-2011' : ticketCode.startsWith('TT') ? 'MOMO-TET' : ticketCode.startsWith('Q8') ? 'MOMO-0803' : ticketCode.startsWith('VL') ? 'MOMO-LOVE' : 'MOMO-2010';
  return `${prefix}-${randomBytes(6).toString('hex').toUpperCase()}`;
};

function requestRoute(req: any) {
  const url = new URL(req.url || '/', 'http://localhost');
  const captured = req.query?.path;
  const path = Array.isArray(captured) ? captured.join('/') : captured;
  if (typeof path === 'string' && path.trim()) {
    url.searchParams.delete('path');
    return { pathname: `/api/${path.replace(/^\/+/, '')}`, query: url.searchParams };
  }
  return { pathname: url.pathname, query: url.searchParams };
}

function occasionPrefix(value: unknown) {
  const normalized = clean(value, 20).toUpperCase();
  const prefixes: Record<string, string> = { '20-10': 'PN', '20-11': 'NG', '08-03': 'Q8', TET: 'TT', VALENTINE: 'VL', PN: 'PN', NG: 'NG', Q8: 'Q8', TT: 'TT', VL: 'VL' };
  const prefix = prefixes[normalized] || normalized;
  if (!/^[A-Z0-9]{1,2}$/.test(prefix)) throw new HttpError(400, 'Dịp sự kiện không hợp lệ.');
  return prefix;
}

async function currentUser(req: any) {
  const user = await getUserFromRequest(req);
  if (!user) throw new HttpError(401, 'Vui lòng đăng nhập lại để tiếp tục.');
  return user;
}

async function adminUser(req: any) {
  const user = await requireAdmin(req);
  if (!user) throw new HttpError(403, 'Đăng nhập bằng tài khoản Firebase được cấp quyền quản trị.');
  return user;
}

function audit(tx: any, db: any, action: string, details: string, adminUser: string) {
  const ref = db.collection('audit_logs').doc();
  tx.create(ref, { id: ref.id, action, details, adminUser, timestamp: new Date().toISOString() });
}

function pickTier(tiers: any[]) {
  const available = tiers.filter((tier) => Number(tier.remainingQuantity) > 0);
  const total = available.reduce((sum, tier) => sum + Number(tier.remainingQuantity), 0);
  if (!total) return null;
  let roll = randomInt(total);
  for (const tier of available) {
    if (roll < Number(tier.remainingQuantity)) return tier;
    roll -= Number(tier.remainingQuantity);
  }
  return available[0];
}

async function handle(req: any, res: any) {
  const method = String(req.method || 'GET').toUpperCase();
  const body = req.body || {};
  const { pathname, query } = requestRoute(req);
  const { db } = getFirebaseAdmin();
  const configRef = db.collection('event_config').doc('main');

  if (method === 'GET' && pathname === '/api/health') {
    await db.collection('healthchecks').doc('vercel').get();
    return res.json({ ok: true, service: 'bachkhoa-events-api', database: 'firestore' });
  }

  if (method === 'GET' && pathname === '/api/event/info') {
    const [configSnap, tierSnap] = await Promise.all([configRef.get(), db.collection('prize_tiers').get()]);
    const tiers = tierSnap.empty ? DEFAULT_TIERS : tierSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    const config = { ...DEFAULT_EVENT, ...(configSnap.exists ? configSnap.data() : {}) };
    return res.json({ status: config.status, totalBudget: Number(config.totalBudget), awardedAmount: Number(config.awardedAmount || 0),
      remainingBudget: tiers.reduce((sum: number, tier: any) => sum + Number(tier.amount || 0) * Number(tier.remainingQuantity || 0), 0),
      remainingPrizes: tiers.reduce((sum: number, tier: any) => sum + Number(tier.remainingQuantity || 0), 0),
      tiers, totalPrizes: tiers.reduce((sum: number, tier: any) => sum + Number(tier.totalQuantity || 0), 0) });
  }

  if (method === 'GET' && pathname === '/api/spin/public-tickets') {
    const prefix = occasionPrefix(query.get('prefix') || '20-10');
    const tickets = await db.collection('tickets').get();
    const matching = tickets.docs.filter((doc: any) => doc.id.startsWith(prefix) || doc.get('occasion') === prefix);
    return res.json({ tickets: [], totalTickets: tickets.size, totalForOccasion: matching.length,
      remainingForOccasion: matching.filter((doc: any) => !doc.get('isUsed')).length,
      message: 'Mã vé dự thưởng được bảo mật riêng cho từng dịp lễ.' });
  }

  if (method === 'POST' && pathname === '/api/spin/check-ticket') {
    const code = clean(body.ticketCode, 20).toUpperCase();
    if (!code) throw new HttpError(400, 'Vui lòng nhập mã vé cần kiểm tra.');
    const ticket = await db.collection('tickets').doc(code).get();
    if (!ticket.exists) throw new HttpError(404, `Mã vé "${code}" không tồn tại trong hệ thống.`);
    if (ticket.get('isUsed')) throw new HttpError(409, `Mã vé "${code}" đã được sử dụng.`);
    return res.json({ valid: true, code, message: `Mã vé "${code}" hợp lệ! Bạn có thể sử dụng để quay ngay.` });
  }

  if (method === 'POST' && pathname === '/api/spin/claim-ticket') {
    const user = await currentUser(req);
    if (!user.email_verified) throw new HttpError(403, 'Email cần được xác minh trước khi nhận vé.');
    const prefix = occasionPrefix(body.occasion || '20-10');
    const ownerRef = db.collection('ticket_owners').doc(`${user.uid}_${prefix}`);
    const code = makeCode(prefix);
    const ticketRef = db.collection('tickets').doc(code);
    const result = await db.runTransaction(async (tx: any) => {
      const [owner, newTicket, config] = await Promise.all([tx.get(ownerRef), tx.get(ticketRef), tx.get(configRef)]);
      if (owner.exists) {
        const existingRef = db.collection('tickets').doc(String(owner.get('ticketCode')));
        const existing = await tx.get(existingRef);
        if (existing.exists && !existing.get('isUsed')) return { ticketCode: existing.id, isNew: false };
        throw new HttpError(409, 'Bạn đã sử dụng vé của dịp này. Mỗi tài khoản chỉ nhận một vé.');
      }
      if (newTicket.exists) throw new HttpError(409, 'Không tạo được mã vé, vui lòng thử lại.');
      if ((config.exists ? config.get('status') : 'active') !== 'active') throw new HttpError(403, 'Sự kiện đang tạm dừng hoặc đã kết thúc.');
      const createdAt = new Date().toISOString();
      tx.create(ticketRef, { code, occasion: prefix, isUsed: false, createdAt, issuedTo: user.uid });
      tx.create(ownerRef, { uid: user.uid, occasion: prefix, ticketCode: code, createdAt });
      audit(tx, db, 'Cấp vé cho tài khoản', `Vé ${code} cấp cho ${user.email || user.uid}`, 'Cổng sự kiện');
      return { ticketCode: code, isNew: true };
    });
    return res.json({ success: true, ...result });
  }

  if (method === 'POST' && pathname === '/api/spin/free') {
    const user = await currentUser(req);
    const userRef = db.collection('users').doc(user.uid);
    const spinRef = db.collection('spins').doc(randomUUID());
    const result = await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(userRef);
      const profile = snap.exists ? snap.data() : { uid: user.uid, email: user.email || '', spinsRemaining: 3, totalSpins: 0, createdAt: new Date().toISOString() };
      const remaining = Number(profile.spinsRemaining ?? 3);
      if (remaining < 1) throw new HttpError(400, 'Tài khoản đã dùng hết 3 lượt quay miễn phí.');
      const pick = FREE_WISHES[randomInt(FREE_WISHES.length)];
      const spinsRemaining = remaining - 1;
      const now = new Date().toISOString();
      tx.set(userRef, { ...profile, uid: user.uid, spinsRemaining, totalSpins: Number(profile.totalSpins || 0) + 1, lastSpinAt: now }, { merge: true });
      tx.create(spinRef, { id: spinRef.id, userId: user.uid, userEmail: user.email || '', segmentIndex: pick.index,
        label: pick.label, wishMessage: pick.wish, prizeAmount: 0, isCashPrize: false, claimed: false, createdAt: now });
      return { ...pick, spinsRemaining };
    });
    return res.json({ success: true, isDemo: false, isCashPrize: false, prizeAmount: 0,
      segmentIndex: result.index, ...result });
  }

  if (method === 'POST' && pathname === '/api/spin/play') {
    const ticketCode = clean(body.ticketCode, 20).toUpperCase();
    if (body.isDemo || ticketCode === 'DEMO-2010') {
      const pick = FREE_WISHES[randomInt(FREE_WISHES.length)];
      return res.json({ success: true, isDemo: true, isCashPrize: false, prizeAmount: 0, ...pick, note: 'Lượt quay thử nghiệm, không phát sinh giải thưởng.' });
    }
    if (!ticketCode) throw new HttpError(400, 'Vui lòng nhập mã vé dự thưởng hợp lệ.');
    const participant = await getUserFromRequest(req);
    const ticketRef = db.collection('tickets').doc(ticketCode);
    const claimCode = makeClaimCode(ticketCode);
    const claimRef = db.collection('claims').doc(claimCode);
    const spinRef = db.collection('spins').doc(randomUUID());
    const result = await db.runTransaction(async (tx: any) => {
      const [ticket, config, tierSnap, claimCollision] = await Promise.all([
        tx.get(ticketRef), tx.get(configRef), tx.get(db.collection('prize_tiers')), tx.get(claimRef),
      ]);
      if (!ticket.exists) throw new HttpError(404, `Mã vé "${ticketCode}" không tồn tại.`);
      if (ticket.get('isUsed')) throw new HttpError(409, `Mã vé "${ticketCode}" đã được sử dụng.`);
      const event = config.exists ? config.data() : DEFAULT_EVENT;
      if (event.status !== 'active') throw new HttpError(403, 'Vòng quay đang tạm dừng hoặc đã kết thúc.');
      if (claimCollision.exists) throw new HttpError(409, 'Mã nhận thưởng bị trùng, vui lòng quay lại.');
      const tiers: any[] = tierSnap.empty
        ? DEFAULT_TIERS.map((tier) => ({ ...tier, ref: db.collection('prize_tiers').doc(tier.id) }))
        : tierSnap.docs.map((doc: any) => ({ ...doc.data(), id: doc.id, ref: doc.ref }));
      const winner = pickTier(tiers);
      const now = new Date().toISOString();

      if (!winner) {
        if (tierSnap.empty) tiers.forEach((tier) => tx.create(tier.ref, {
          id: tier.id, amount: tier.amount, label: tier.label, totalQuantity: tier.totalQuantity,
          remainingQuantity: tier.remainingQuantity, color: tier.color, textColor: tier.textColor,
        }));
        tx.set(ticketRef, { isUsed: true, usedAt: now, prizeWon: 0 }, { merge: true });
        tx.create(spinRef, { id: spinRef.id, ticketCode, segmentIndex: 7, label: 'Tri Ân', wishMessage: 'Toàn bộ giải thưởng đã được trao. Cảm ơn bạn đã tham gia!', prizeAmount: 0, isCashPrize: false, createdAt: now });
        audit(tx, db, 'Lượt quay hết giải', `Vé ${ticketCode} quay khi giải thưởng đã hết.`, 'Người tham gia');
        return { success: true, isDemo: false, isCashPrize: false, prizeAmount: 0, segmentIndex: 7, label: 'Tri Ân',
          wishMessage: 'Toàn bộ giải thưởng đã được trao. Cảm ơn bạn đã tham gia!', ticketCode };
      }

      const segmentIndex = ({ 10000: 0, 20000: 2, 50000: 4, 100000: 6 } as Record<number, number>)[Number(winner.amount)] ?? 0;
      const amount = Number(winner.amount);
      if (tierSnap.empty) {
        tiers.forEach((tier) => tx.create(tier.ref, {
          id: tier.id, amount: tier.amount, label: tier.label, totalQuantity: tier.totalQuantity,
          remainingQuantity: tier.id === winner.id ? Number(tier.remainingQuantity) - 1 : tier.remainingQuantity,
          color: tier.color, textColor: tier.textColor,
        }));
      }
      tx.set(ticketRef, { isUsed: true, usedAt: now, prizeWon: amount, claimCode }, { merge: true });
      if (!tierSnap.empty) tx.update(winner.ref, { remainingQuantity: Number(winner.remainingQuantity) - 1, updatedAt: now });
      tx.create(claimRef, { id: claimCode, claimCode, ticketCode, userId: participant?.uid || 'guest', userEmail: participant?.email || '',
        occasion: ticket.get('occasion') || ticketCode.slice(0, 2), amount,
        fullName: '', schoolClassOrDepartment: '', momoPhone: '', status: 'unclaimed', createdAt: now, updatedAt: now });
      tx.create(spinRef, { id: spinRef.id, ticketCode, userId: participant?.uid || '', userEmail: participant?.email || '',
        segmentIndex, label: winner.label, wishMessage: `Chúc mừng bạn đã trúng ${winner.label} qua ví MoMo!`,
        prizeAmount: amount, isCashPrize: true, claimCode, claimed: false, createdAt: now });
      audit(tx, db, 'Trúng thưởng MoMo', `Vé ${ticketCode} trúng ${winner.label}. Mã nhận thưởng: ${claimCode}`, 'Người tham gia');
      return { success: true, isDemo: false, isCashPrize: true, prizeAmount: amount, label: winner.label, segmentIndex, claimCode, ticketCode,
        wishMessage: `Chúc mừng bạn đã trúng ${winner.label} qua ví MoMo! Vui lòng điền thông tin để ban tổ chức xác minh.` };
    });
    return res.json(result);
  }

  if (method === 'POST' && pathname === '/api/spin/claim-info') {
    const code = clean(body.claimCode, 80).toUpperCase();
    if (!code) throw new HttpError(400, 'Thiếu mã nhận thưởng.');
    let snap = await db.collection('claims').doc(code).get();
    if (!snap.exists) {
      const byTicket = await db.collection('claims').where('ticketCode', '==', code).limit(1).get();
      snap = byTicket.docs[0] as any;
    }
    if (!snap?.exists) throw new HttpError(404, 'Mã nhận thưởng không tồn tại.');
    const claim = snap.data()!;
    const claimStatus = claim.status === 'pending' ? 'pending_verification' : claim.status || 'unclaimed';
    const phone = String(claim.momoPhone || '');
    return res.json({ claimCode: claim.claimCode || snap.id, amount: Number(claim.amount || 0), status: claimStatus,
      createdAt: claim.createdAt, verifiedAt: claim.verifiedAt, transferredAt: claim.transferredAt,
      momoTransactionRef: claim.momoTransactionRef, rejectionReason: claim.rejectionReason,
      maskedPhone: phone ? `${phone.slice(0, 3)}******${phone.slice(-2)}` : '', fullName: claim.fullName || '',
      schoolClassOrDepartment: claim.schoolClassOrDepartment || '' });
  }

  if (method === 'POST' && pathname === '/api/spin/submit-claim') {
    const code = clean(body.claimCode, 80).toUpperCase();
    const fullName = clean(body.fullName, 100);
    const department = clean(body.schoolClassOrDepartment, 150);
    const phone = clean(body.momoPhone, 20).replace(/\D/g, '');
    if (!code) throw new HttpError(400, 'Thiếu mã nhận thưởng.');
    if (fullName.length < 2 || department.length < 2) throw new HttpError(400, 'Vui lòng nhập họ tên và lớp hoặc đơn vị công tác.');
    if (!/^(03|05|07|08|09)\d{8}$/.test(phone)) throw new HttpError(400, 'Số điện thoại MoMo không hợp lệ.');
    const claimRef = db.collection('claims').doc(code);
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(claimRef);
      if (!snap.exists) throw new HttpError(404, 'Mã nhận thưởng không hợp lệ.');
      const claim = snap.data();
      if (claim.status !== 'unclaimed') throw new HttpError(409, 'Yêu cầu nhận thưởng đã được gửi hoặc xử lý.');
      if (!claim.ticketCode) throw new HttpError(400, 'Mã nhận thưởng không hợp lệ.');
      const now = new Date().toISOString();
      tx.update(claimRef, { fullName, schoolClassOrDepartment: department, momoPhone: phone,
        guardianNote: clean(body.guardianNote, 500), status: 'pending_verification', updatedAt: now });
      audit(tx, db, 'Nộp yêu cầu nhận thưởng', `${fullName} (${department}) nộp thông tin nhận thưởng. Mã ${code}.`, 'Người nhận thưởng');
    });
    return res.json({ success: true, status: 'pending_verification' });
  }

  if (method === 'GET' && pathname === '/api/admin/event-data') {
    const admin = await adminUser(req);
    const [configSnap, tierSnap, ticketsSnap, claimsSnap, auditSnap] = await Promise.all([
      configRef.get(), db.collection('prize_tiers').get(), db.collection('tickets').orderBy('createdAt', 'desc').limit(500).get(),
      db.collection('claims').orderBy('createdAt', 'desc').limit(500).get(), db.collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get(),
    ]);
    const config = { ...DEFAULT_EVENT, ...(configSnap.exists ? configSnap.data() : {}) };
    const tiers = tierSnap.empty ? DEFAULT_TIERS : tierSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const claims = claimsSnap.docs.map((doc: any) => {
      const data = doc.data();
      return { id: doc.id, ...data, status: data.status === 'pending' ? 'pending_verification' : data.status };
    });
    const awardedAmount = claims.filter((claim: any) => claim.status === 'transferred').reduce((sum: number, claim: any) => sum + Number(claim.amount || 0), 0);
    return res.json({ totalBudget: Number(config.totalBudget), remainingBudget: Math.max(0, Number(config.totalBudget) - awardedAmount),
      awardedAmount, remainingPrizes: tiers.reduce((sum: number, tier: any) => sum + Number(tier.remainingQuantity || 0), 0),
      prizeTiers: tiers, tickets: ticketsSnap.docs.map((doc: any) => ({ code: doc.id, ...doc.data() })), claims,
      auditLogs: auditSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })), admin: admin.email });
  }

  if (method === 'POST' && pathname === '/api/admin/login') {
    throw new HttpError(410, 'Hãy đăng nhập bằng tài khoản Firebase được cấp quyền quản trị.');
  }

  if (method === 'POST' && pathname === '/api/admin/update-budget') {
    const admin = await adminUser(req);
    const totalBudget = Number(body.totalBudget);
    if (!Number.isSafeInteger(totalBudget) || totalBudget < 0) throw new HttpError(400, 'Ngân sách không hợp lệ.');
    await db.runTransaction(async (tx: any) => {
      const [configSnap, tiersSnap, claimsSnap] = await Promise.all([
        tx.get(configRef), tx.get(db.collection('prize_tiers')), tx.get(db.collection('claims')),
      ]);
      const awarded = claimsSnap.docs.filter((doc: any) => doc.get('status') === 'transferred')
        .reduce((sum: number, doc: any) => sum + Number(doc.get('amount') || 0), 0);
      const reserved = tiersSnap.docs.reduce((sum: number, doc: any) => sum + Number(doc.get('amount') || 0) * Number(doc.get('remainingQuantity') || 0), 0) +
        claimsSnap.docs.filter((doc: any) => doc.get('status') !== 'rejected')
          .reduce((sum: number, doc: any) => sum + Number(doc.get('amount') || 0), 0);
      if (totalBudget < Math.max(awarded, reserved)) throw new HttpError(409, 'Ngân sách không thể thấp hơn số tiền đã trao và giải thưởng còn phải chi trả.');
      tx.set(configRef, { ...DEFAULT_EVENT, ...(configSnap.exists ? configSnap.data() : {}), totalBudget, awardedAmount: awarded,
        remainingBudget: totalBudget - awarded, updatedAt: new Date().toISOString() }, { merge: true });
      audit(tx, db, 'Cập nhật ngân sách', `Ngân sách mới ${totalBudget.toLocaleString('vi-VN')}đ`, String(admin.email || admin.uid));
    });
    return res.json({ success: true, totalBudget });
  }

  if (method === 'POST' && pathname === '/api/admin/update-prize-pool') {
    const admin = await adminUser(req);
    if (!Array.isArray(body.tiers) || body.tiers.length > 100) throw new HttpError(400, 'Danh sách giải thưởng không hợp lệ.');
    const tiers = body.tiers.map((item: any) => ({
      id: clean(item.id, 80), amount: Number(item.amount), label: clean(item.label, 50),
      totalQuantity: Number(item.totalQuantity), remainingQuantity: Number(item.remainingQuantity),
      color: clean(item.color, 20), textColor: clean(item.textColor, 20),
    }));
    const wheelDenominations = new Set([10000, 20000, 50000, 100000]);
    if (tiers.some((tier: any) => !tier.id || !Number.isSafeInteger(tier.amount) || tier.amount <= 0 ||
      !wheelDenominations.has(tier.amount) ||
      !Number.isSafeInteger(tier.totalQuantity) || tier.totalQuantity < 0 || !Number.isSafeInteger(tier.remainingQuantity) ||
      tier.remainingQuantity < 0 || tier.remainingQuantity > tier.totalQuantity || !/^[a-zA-Z0-9_-]+$/.test(tier.id))) {
      throw new HttpError(400, 'Mức giải phải dùng mã hợp lệ và mệnh giá 10.000đ, 20.000đ, 50.000đ hoặc 100.000đ.');
    }
    if (new Set(tiers.map((tier: any) => tier.id)).size !== tiers.length) throw new HttpError(400, 'Mã mức giải bị trùng.');
    await db.runTransaction(async (tx: any) => {
      const [existing, configSnap, claimsSnap] = await Promise.all([
        tx.get(db.collection('prize_tiers')), tx.get(configRef), tx.get(db.collection('claims')),
      ]);
      const budget = Number(configSnap.exists ? configSnap.get('totalBudget') : DEFAULT_EVENT.totalBudget);
      const reserved = tiers.reduce((sum: number, tier: any) => sum + tier.amount * tier.remainingQuantity, 0) +
        claimsSnap.docs.filter((doc: any) => doc.get('status') !== 'rejected')
          .reduce((sum: number, doc: any) => sum + Number(doc.get('amount') || 0), 0);
      if (reserved > budget) throw new HttpError(409, 'Tổng giá trị giải còn lại vượt quá ngân sách sự kiện.');
      const ids = new Set(tiers.map((tier: any) => tier.id));
      existing.docs.forEach((doc: any) => { if (!ids.has(doc.id)) tx.delete(doc.ref); });
      tiers.forEach((tier: any) => tx.set(db.collection('prize_tiers').doc(tier.id), { ...tier, updatedAt: new Date().toISOString() }));
      audit(tx, db, 'Cập nhật cơ cấu giải', `Đã lưu ${tiers.length} mức giải.`, String(admin.email || admin.uid));
    });
    return res.json({ success: true, prizeTiers: tiers });
  }

  if (method === 'POST' && pathname === '/api/admin/generate-tickets') {
    const admin = await adminUser(req);
    const count = Number(body.count);
    const prefix = occasionPrefix(body.occasion || '20-10');
    if (!Number.isInteger(count) || count < 1 || count > 400) throw new HttpError(400, 'Số vé cần tạo phải từ 1 đến 400.');
    const codes = Array.from({ length: count }, () => makeCode(prefix));
    const refs = codes.map((code) => db.collection('tickets').doc(code));
    await db.runTransaction(async (tx: any) => {
      const existing = await Promise.all(refs.map((ref: any) => tx.get(ref)));
      if (existing.some((doc: any) => doc.exists)) throw new HttpError(409, 'Trùng mã vé, vui lòng thử lại.');
      const createdAt = new Date().toISOString();
      refs.forEach((ref: any, index: number) => tx.create(ref, { code: codes[index], occasion: prefix, isUsed: false, createdAt }));
      audit(tx, db, 'Phát hành vé', `Đã phát hành ${count} vé dịp ${prefix}.`, String(admin.email || admin.uid));
    });
    return res.json({ success: true, tickets: codes });
  }

  if (method === 'POST' && pathname === '/api/admin/delete-ticket') {
    const admin = await adminUser(req);
    const code = clean(body.code, 20).toUpperCase();
    if (!code) throw new HttpError(400, 'Thiếu mã vé.');
    const ref = db.collection('tickets').doc(code);
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'Không tìm thấy vé.');
      if (snap.get('isUsed')) throw new HttpError(409, 'Không thể thu hồi vé đã sử dụng.');
      tx.delete(ref);
      audit(tx, db, 'Thu hồi vé', `Đã thu hồi vé ${code}.`, String(admin.email || admin.uid));
    });
    return res.json({ success: true });
  }

  if (method === 'POST' && pathname === '/api/admin/update-claim') {
    const admin = await adminUser(req);
    const code = clean(body.claimCode, 80).toUpperCase();
    const status = clean(body.newStatus, 40);
    const allowed = ['unclaimed', 'pending_verification', 'verified', 'pending_transfer', 'transferred', 'rejected'];
    if (!code || !allowed.includes(status)) throw new HttpError(400, 'Trạng thái nhận thưởng không hợp lệ.');
    if (status === 'transferred' && !clean(body.momoTransactionRef, 100)) throw new HttpError(400, 'Cần mã giao dịch MoMo trước khi xác nhận đã chuyển.');
    const ref = db.collection('claims').doc(code);
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'Không tìm thấy yêu cầu nhận thưởng.');
      const rawStatus = String(snap.get('status') || 'unclaimed');
      const currentStatus = rawStatus === 'pending' ? 'pending_verification' : rawStatus;
      const allowedTransitions: Record<string, string[]> = {
        unclaimed: ['rejected'], pending_verification: ['verified', 'rejected'],
        verified: ['pending_transfer', 'rejected'], pending_transfer: ['transferred', 'rejected'],
        transferred: [], rejected: [],
      };
      if (status !== currentStatus && !allowedTransitions[currentStatus]?.includes(status)) {
        throw new HttpError(409, `Không thể chuyển trạng thái từ ${currentStatus} sang ${status}.`);
      }
      const now = new Date().toISOString();
      const update: Record<string, unknown> = { status, updatedAt: now };
      if (body.adminNote !== undefined) update.adminNote = clean(body.adminNote, 500);
      if (body.rejectionReason !== undefined) update.rejectionReason = clean(body.rejectionReason, 300);
      if (body.momoTransactionRef !== undefined) update.momoTransactionRef = clean(body.momoTransactionRef, 100);
      if (status === 'verified') update.verifiedAt = now;
      if (status === 'transferred') update.transferredAt = now;
      tx.update(ref, update);
      audit(tx, db, 'Xử lý yêu cầu nhận thưởng', `Mã ${code} chuyển sang ${status}.`, String(admin.email || admin.uid));
    });
    return res.json({ success: true });
  }

  if (method === 'GET' && ['/api/admin/export-csv', '/api/admin/export-tickets'].includes(pathname)) {
    await adminUser(req);
    const ticketsExport = pathname.endsWith('export-tickets');
    const snapshot = await db.collection(ticketsExport ? 'tickets' : 'claims').orderBy('createdAt', 'desc').limit(5000).get();
    const headings = ticketsExport ? ['Mã vé', 'Dịp', 'Trạng thái', 'Số tiền trúng', 'Mã nhận thưởng', 'Ngày tạo', 'Ngày quay']
      : ['Mã nhận thưởng', 'Mã vé', 'Số tiền', 'Họ tên', 'Lớp/Đơn vị', 'SĐT MoMo', 'Trạng thái', 'Ngày tạo'];
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return ticketsExport ? [doc.id, data.occasion, data.isUsed ? 'Đã quay' : 'Chưa sử dụng', data.prizeWon, data.claimCode, data.createdAt, data.usedAt]
        : [data.claimCode || doc.id, data.ticketCode, data.amount, data.fullName, data.schoolClassOrDepartment, data.momoPhone, data.status, data.createdAt];
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${ticketsExport ? 'danh-sach-ve' : 'danh-sach-nhan-thuong'}.csv"`);
    return res.send('\uFEFF' + [headings.map(cell).join(','), ...rows.map((row: any[]) => row.map(cell).join(','))].join('\r\n'));
  }

  if (method === 'POST' && pathname === '/api/gemini/generate-wish') {
    const name = clean(body.recipientName, 50);
    const holiday = clean(body.holiday, 20);
    const holidayLabels: Record<string, string> = { '20-10': 'ngày Phụ Nữ Việt Nam 20/10', '20-11': 'ngày Nhà Giáo Việt Nam 20/11', '08-03': 'ngày Quốc Tế Phụ Nữ 8/3', tet: 'Tết Nguyên Đán', valentine: 'ngày Lễ Tình Nhân 14/2' };
    const holidayName = holidayLabels[holiday] || 'ngày lễ đặc biệt';
    const tone = clean(body.tone, 30) || 'refined';
    const relationship = clean(body.relationship, 50);
    const fallback = () => ({ title: `Gửi lời yêu thương nhân ${holidayName}`,
      message: `${name ? `Gửi ${name}, ` : ''}chúc bạn luôn bình an, hạnh phúc và nhận được thật nhiều yêu thương trong ${holidayName}!`,
      tone, recipientType: relationship, isAiGenerated: false, modelNote: 'Lời chúc được tạo từ mẫu dự phòng.' });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.json(fallback());
    try {
      const ai = new GoogleGenAI({ apiKey });
      const generated = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: `Viết lời chúc tiếng Việt cho ${name || 'người nhận'}, dịp ${holidayName}; quan hệ ${relationship || 'thân thiết'}, xưng hô ${clean(body.pronoun, 40) || 'tự nhiên'}, phong cách ${tone}, độ dài ${clean(body.length, 20) || 'medium'}, chủ đề ${clean(body.theme, 30) || 'happiness'}.`,
        config: { temperature: 0.8, responseMimeType: 'application/json', responseSchema: {
          type: Type.OBJECT, properties: { title: { type: Type.STRING }, message: { type: Type.STRING } }, required: ['title', 'message'],
        } },
      });
      const parsed = JSON.parse(generated.text || '{}');
      return res.json({ title: clean(parsed.title, 120) || fallback().title, message: clean(parsed.message, 1500) || fallback().message,
        tone, recipientType: relationship, isAiGenerated: true });
    } catch (error) {
      console.error('[Gemini] Generation failed:', error);
      return res.json(fallback());
    }
  }

  return res.status(404).json({ error: 'Không tìm thấy API.' });
}

export default async function handler(req: any, res: any) {
  try {
    return await handle(req, res);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[API] Request failed:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ.';
    const isConfigurationError = message.includes('FIREBASE_SERVICE_ACCOUNT_JSON');
    return res.status(isConfigurationError ? 503 : 500).json({ error: isConfigurationError ? message : 'Có lỗi xảy ra khi xử lý yêu cầu.' });
  }
}
