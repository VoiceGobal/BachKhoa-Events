import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  eventConfig,
  prizeTiers,
  ticketsMap,
  claimsMap,
  freeSpinsUsed,
  auditLogs,
  executeBackendSpin,
  generateSecureTicketCode,
  saveDatabase,
  maskPhoneNumber,
  maskFullName,
  SLICES_DATA,
  runAtomicTransaction,
} from '../services/storage.ts';
import {
  spinRateLimiter,
  ticketCheckRateLimiter,
  claimSubmitRateLimiter,
} from '../middleware/rateLimiter.ts';
import {
  verifyFirebaseUser,
  requireVerifiedEmail,
} from '../middleware/authMiddleware.ts';

const router = Router();

// 1. GET /api/event/info and /api/spin/info
export function getEventInfoHandler(_req: Request, res: Response) {
  const awardedAmount = Array.from(claimsMap.values())
    .filter((c) => c.status === 'transferred')
    .reduce((acc, c) => acc + c.amount, 0);

  const remainingBudget = Math.max(0, eventConfig.totalBudget - awardedAmount);
  const remainingPrizes = prizeTiers.reduce((acc, t) => acc + t.remainingQuantity, 0);

  res.json({
    eventName: eventConfig.eventName,
    organizer: eventConfig.organizer,
    status: eventConfig.status,
    totalBudget: eventConfig.totalBudget,
    awardedAmount,
    remainingBudget,
    remainingPrizes,
    prizeTiers: prizeTiers.map((t) => ({
      id: t.id,
      amount: t.amount,
      label: t.label,
      remainingQuantity: t.remainingQuantity,
      totalQuantity: t.totalQuantity,
      color: t.color,
      textColor: t.textColor,
    })),
  });
}

router.get('/info', getEventInfoHandler);

// 2. GET /api/spin/public-tickets
router.get('/public-tickets', (req: Request, res: Response) => {
  const prefix = String(req.query.prefix || 'PN').toUpperCase();
  const available = Array.from(ticketsMap.values())
    .filter((t) => !t.isUsed && t.code.startsWith(prefix))
    .slice(0, 10)
    .map((t) => t.code);

  res.json({ tickets: available });
});

// 3. POST /api/spin/check-ticket (Rate-limited)
router.post('/check-ticket', ticketCheckRateLimiter, (req: Request, res: Response): void => {
  const ticketCode = String(req.body?.ticketCode || '').trim().toUpperCase();
  if (!ticketCode) {
    res.status(400).json({ valid: false, error: 'Vui lòng cung cấp mã vé.' });
    return;
  }

  const ticket = ticketsMap.get(ticketCode);
  if (!ticket) {
    const validPattern = /^(PN|NG|Q8|TT|VL)[A-Z0-9]{6}$/;
    if (validPattern.test(ticketCode)) {
      res.json({
        valid: true,
        message: `Mã vé "${ticketCode}" hợp lệ từ nhà trường! Hãy bấm "Quay Số Bằng Mã Vé".`,
        ticketCode,
      });
      return;
    }
    res.status(404).json({ valid: false, error: `Mã vé "${ticketCode}" không tồn tại trong hệ thống.` });
    return;
  }

  if (ticket.isUsed) {
    res.json({
      valid: false,
      error: `Mã vé "${ticketCode}" đã được sử dụng lúc ${new Date(ticket.usedAt || '').toLocaleString('vi-VN')}.`,
      ticketCode,
      isUsed: true,
    });
    return;
  }

  res.json({
    valid: true,
    message: `Mã vé "${ticketCode}" hợp lệ! Quý vị có thể tham gia quay số nhận thưởng.`,
    ticketCode,
  });
});

// 4. POST /api/spin/play (Backend Transactional Spin - Requirement 1)
router.post('/play', spinRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const { ticketCode, isDemo } = req.body || {};
  const user = await verifyFirebaseUser(req);

  try {
    const result = await executeBackendSpin(ticketCode, Boolean(isDemo), user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Lỗi khi thực hiện vòng quay.' });
  }
});

// 5. POST /api/spin/free
router.post('/free', spinRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const user = await verifyFirebaseUser(req);
  if (!user) {
    res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng lượt quay miễn phí.' });
    return;
  }

  const used = freeSpinsUsed.get(user.uid) || 0;
  if (used >= 3) {
    res.status(400).json({ error: 'Tài khoản đã dùng hết 3 lượt quay miễn phí chào mừng sự kiện!' });
    return;
  }

  freeSpinsUsed.set(user.uid, used + 1);
  saveDatabase();

  const wishIndices = [1, 3, 5, 7];
  const targetIndex = wishIndices[Math.floor(Math.random() * wishIndices.length)];
  const slice = SLICES_DATA[targetIndex];

  res.json({
    segmentIndex: targetIndex,
    label: slice.label,
    subLabel: slice.subLabel,
    wishMessage: slice.wish,
    prizeAmount: 0,
    freeSpinsLeft: Math.max(0, 3 - (used + 1)),
  });
});

// 6. POST /api/spin/claim-ticket
router.post('/claim-ticket', async (req: Request, res: Response): Promise<void> => {
  const user = await verifyFirebaseUser(req);
  if (!user) {
    res.status(401).json({ error: 'Vui lòng đăng nhập để nhận mã vé dự thưởng.' });
    return;
  }

  const occasion = String(req.body?.occasion || 'PN').toUpperCase();
  const ticketCode = generateSecureTicketCode(occasion);

  ticketsMap.set(ticketCode, {
    code: ticketCode,
    occasion,
    isUsed: false,
    createdAt: new Date().toISOString(),
    usedBy: user.email,
  });

  saveDatabase();

  res.json({
    ticketCode,
    message: `Đã cấp thành công mã vé dự thưởng [${ticketCode}] cho tài khoản của bạn!`,
  });
});

// 7. POST /api/spin/submit-claim (Enforces Verified Email - Requirement 4)
router.post(
  '/submit-claim',
  claimSubmitRateLimiter,
  requireVerifiedEmail,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { claimCode, fullName, schoolClassOrDepartment, momoPhone, guardianNote } = req.body || {};

    const cleanClaim = String(claimCode || '').trim();
    const cleanName = String(fullName || '').trim();
    const cleanClass = String(schoolClassOrDepartment || '').trim();
    const cleanPhone = String(momoPhone || '').trim();
    const cleanNote = String(guardianNote || '').trim();

    if (!cleanClaim) {
      res.status(400).json({ error: 'Mã nhận thưởng không được để trống.' });
      return;
    }

    if (!cleanName || cleanName.length < 2) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ và tên người nhận.' });
      return;
    }

    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 15) {
      res.status(400).json({ error: 'Số điện thoại ví MoMo không hợp lệ.' });
      return;
    }

    try {
      await runAtomicTransaction(async () => {
        const claim = claimsMap.get(cleanClaim);
        if (!claim) {
          throw new Error(`Mã nhận thưởng "${cleanClaim}" không tồn tại.`);
        }

        if (claim.status === 'transferred') {
          throw new Error('Giải thưởng này đã được chuyển khoản MoMo thành công trước đó.');
        }

        // Update receiver info
        claim.fullName = cleanName;
        claim.schoolClassOrDepartment = cleanClass || 'Cán bộ / Học sinh';
        claim.momoPhone = cleanPhone;
        claim.guardianNote = cleanNote;
        claim.status = 'pending';
        claim.userId = user.uid;
        claim.userEmail = user.email;
        claim.updatedAt = new Date().toISOString();

        auditLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          action: 'Nộp hồ sơ nhận thưởng MoMo',
          details: `${cleanName} (${user.email}) đã nộp thông tin nhận giải [${claim.amount.toLocaleString('vi-VN')}đ] qua MoMo: ${maskPhoneNumber(cleanPhone)}.`,
          timestamp: new Date().toISOString(),
          adminUser: user.email,
        });

        saveDatabase();
      });

      res.json({
        success: true,
        message: 'Đã gửi thông tin nhận thưởng thành công! Ban Quản Trị sẽ xác minh và chuyển khoản MoMo.',
        claimCode: cleanClaim,
        status: 'pending',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi khi cập nhật hồ sơ nhận thưởng.' });
    }
  }
);

// 8. POST /api/spin/claim-info (PII Masked - Requirement 4)
router.post('/claim-info', (req: Request, res: Response): void => {
  const claimCode = String(req.body?.claimCode || '').trim();
  if (!claimCode) {
    res.status(400).json({ error: 'Vui lòng cung cấp mã nhận thưởng.' });
    return;
  }

  const claim = claimsMap.get(claimCode);
  if (!claim) {
    res.status(404).json({ error: 'Không tìm thấy thông tin mã nhận thưởng này.' });
    return;
  }

  // MASK PII FOR PRIVACY PROTECTION
  res.json({
    claimCode: claim.claimCode,
    amount: claim.amount,
    status: claim.status,
    fullName: maskFullName(claim.fullName),
    momoPhone: maskPhoneNumber(claim.momoPhone),
    schoolClassOrDepartment: claim.schoolClassOrDepartment,
    createdAt: claim.createdAt,
    transferredAt: claim.transferredAt,
    momoTransactionRef: claim.momoTransactionRef,
  });
});

export default router;
