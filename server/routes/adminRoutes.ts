import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  eventConfig,
  prizeTiers,
  ticketsMap,
  claimsMap,
  auditLogs,
  generateSecureTicketCode,
  saveDatabase,
} from '../services/storage.ts';
import {
  requireAdmin,
  generateAdminSession,
  checkAdminPassword,
} from '../middleware/authMiddleware.ts';
import { adminLoginLimiter } from '../middleware/rateLimiter.ts';
import type { MomoPrizeTier } from '../types.ts';

const router = Router();

// 1. POST /api/admin/login
router.post('/login', adminLoginLimiter, (req: Request, res: Response): void => {
  const { password } = req.body || {};
  if (!checkAdminPassword(String(password || ''))) {
    res.status(401).json({ error: 'Mật khẩu quản trị không chính xác.' });
    return;
  }

  const token = generateAdminSession();
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Đăng nhập cổng quản trị',
    details: `Quản trị viên đã đăng nhập từ IP ${req.ip}.`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });
  saveDatabase();

  res.json({ token, message: 'Đăng nhập thành công.' });
});

// 2. GET /api/admin/event-data
router.get('/event-data', requireAdmin, (_req: Request, res: Response) => {
  const awardedAmount = Array.from(claimsMap.values())
    .filter((c) => c.status === 'transferred')
    .reduce((acc, c) => acc + c.amount, 0);

  const remainingBudget = Math.max(0, eventConfig.totalBudget - awardedAmount);

  res.json({
    totalBudget: eventConfig.totalBudget,
    remainingBudget,
    awardedAmount,
    status: eventConfig.status,
    prizeTiers,
    tickets: Array.from(ticketsMap.values()),
    claims: Array.from(claimsMap.values()),
    auditLogs: auditLogs.slice(0, 100),
  });
});

// 3. POST /api/admin/update-prize-pool
router.post('/update-prize-pool', requireAdmin, (req: Request, res: Response): void => {
  const { tiers } = req.body || {};
  if (!Array.isArray(tiers) || tiers.length === 0) {
    res.status(400).json({ error: 'Danh sách giải thưởng không hợp lệ.' });
    return;
  }

  prizeTiers.length = 0;
  tiers.forEach((t: MomoPrizeTier) => {
    prizeTiers.push({
      id: String(t.id || `tier-${Date.now()}`),
      amount: Number(t.amount) || 0,
      label: String(t.label || `${Number(t.amount).toLocaleString('vi-VN')}đ`),
      totalQuantity: Number(t.totalQuantity) || 0,
      remainingQuantity: Number(t.remainingQuantity) || 0,
      color: String(t.color || '#EDE9FE'),
      textColor: String(t.textColor || '#5B21B6'),
    });
  });

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Cập nhật cơ cấu giải thưởng MoMo',
    details: `Đã cập nhật ${prizeTiers.length} mức giải thưởng.`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();
  res.json({ success: true, message: 'Đã lưu cấu hình các mức giải thưởng thành công.' });
});

// 4. POST /api/admin/update-budget
router.post('/update-budget', requireAdmin, (req: Request, res: Response): void => {
  const { totalBudget } = req.body || {};
  const budget = Number(totalBudget);
  if (isNaN(budget) || budget < 0) {
    res.status(400).json({ error: 'Ngân sách không hợp lệ.' });
    return;
  }

  eventConfig.totalBudget = budget;
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Điều chỉnh ngân sách sự kiện',
    details: `Ngân sách được điều chỉnh thành ${budget.toLocaleString('vi-VN')}đ.`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();
  res.json({ success: true, message: `Đã cập nhật ngân sách thành ${budget.toLocaleString('vi-VN')}đ.` });
});

// 5. POST /api/admin/update-claim
router.post('/update-claim', requireAdmin, (req: Request, res: Response): void => {
  const { claimCode, newStatus, momoTransactionRef, rejectionReason, adminNote } = req.body || {};
  const claim = claimsMap.get(String(claimCode || ''));

  if (!claim) {
    res.status(404).json({ error: 'Không tìm thấy hồ sơ nhận thưởng này.' });
    return;
  }

  if (newStatus) claim.status = newStatus;
  if (momoTransactionRef) claim.momoTransactionRef = String(momoTransactionRef).trim();
  if (rejectionReason) claim.rejectionReason = String(rejectionReason).trim();
  if (adminNote) claim.adminNote = String(adminNote).trim();
  if (newStatus === 'transferred') claim.transferredAt = new Date().toISOString();
  claim.updatedAt = new Date().toISOString();

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: `Cập nhật trạng thái nhận thưởng: ${newStatus}`,
    details: `Mã [${claim.claimCode}] (${claim.fullName}) chuyển sang [${newStatus}]. ${momoTransactionRef ? `Mã GD: ${momoTransactionRef}` : ''}`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();
  res.json({ success: true, message: `Đã cập nhật hồ sơ [${claimCode}] thành công.` });
});

// 6. POST /api/admin/generate-tickets
router.post('/generate-tickets', requireAdmin, (req: Request, res: Response): void => {
  const count = Math.min(100, Math.max(1, Number(req.body?.count || 10)));
  const occasion = String(req.body?.occasion || '20-10');
  const prefixMap: Record<string, string> = {
    '20-10': 'PN',
    '20-11': 'NG',
    '08-03': 'Q8',
    tet: 'TT',
    valentine: 'VL',
  };
  const prefix = prefixMap[occasion] || 'PN';

  const generated: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateSecureTicketCode(prefix);
    ticketsMap.set(code, {
      code,
      occasion,
      isUsed: false,
      createdAt: new Date().toISOString(),
    });
    generated.push(code);
  }

  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Tạo mã vé dự thưởng hàng loạt',
    details: `Đã tạo ${count} vé mới dịp [${occasion}] với tiền tố [${prefix}].`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();
  res.json({ success: true, count, tickets: generated });
});

// 7. POST /api/admin/delete-ticket
router.post('/delete-ticket', requireAdmin, (req: Request, res: Response): void => {
  const { code } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();

  if (!ticketsMap.has(cleanCode)) {
    res.status(404).json({ error: 'Mã vé không tồn tại.' });
    return;
  }

  ticketsMap.delete(cleanCode);
  auditLogs.unshift({
    id: `log-${Date.now()}`,
    action: 'Thu hồi vé dự thưởng',
    details: `Vé [${cleanCode}] đã bị thu hồi khỏi hệ thống.`,
    timestamp: new Date().toISOString(),
    adminUser: 'Admin Bách Khoa',
  });

  saveDatabase();
  res.json({ success: true, message: `Đã thu hồi vé [${cleanCode}].` });
});

// 8. CSV Exports
router.get('/export-csv', requireAdmin, (_req: Request, res: Response) => {
  const claims = Array.from(claimsMap.values());
  let csv = 'Mã nhận thưởng,Mã vé,Họ và tên,Lớp/Đơn vị,SĐT MoMo,Số tiền,Trạng thái,Mã GD MoMo,Ngày nộp\n';
  claims.forEach((c) => {
    csv += `"${c.claimCode}","${c.ticketCode}","${c.fullName}","${c.schoolClassOrDepartment}","${c.momoPhone}",${c.amount},"${c.status}","${c.momoTransactionRef || ''}","${c.createdAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=danh-sach-trao-thuong-momo.csv');
  res.send('\uFEFF' + csv);
});

router.get('/export-tickets', requireAdmin, (_req: Request, res: Response) => {
  const tickets = Array.from(ticketsMap.values());
  let csv = 'Mã vé,Dịp lễ,Đã sử dụng,Người dùng,Giải trúng,Mã nhận thưởng,Ngày tạo\n';
  tickets.forEach((t) => {
    csv += `"${t.code}","${t.occasion}",${t.isUsed ? 'Đã dùng' : 'Chưa dùng'},"${t.usedBy || ''}",${t.prizeWon || 0},"${t.claimCode || ''}","${t.createdAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=danh-sach-ve-du-thuong.csv');
  res.send('\uFEFF' + csv);
});

export default router;
