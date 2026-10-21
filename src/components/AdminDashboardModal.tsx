import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  DollarSign,
  Ticket,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  LogOut,
  Shield,
  FileSpreadsheet,
  Check,
  Search,
  Trash2,
  Copy,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { MomoPrizeTier, RewardClaim, SpinTicket, AdminAuditLog } from '../types';
import { playSoftPop, playCelebration } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  loadFirestoreAdminDashboard,
  saveFirestorePrizeTiers,
  saveFirestoreEventConfig,
  updateFirestoreClaimStatus,
  generateTicketCode,
  addFirestoreAuditLog,
} from '../services/firestoreService';
import { safeSessionStorage } from '../utils/storage';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin } = useAuth();

  const [token, setToken] = useState<string>(() => {
    return safeSessionStorage.getItem('bks_admin_token') || '';
  });

  // Auto-authenticate if logged in with Admin email
  useEffect(() => {
    if (
      isOpen &&
      (isAdmin ||
        currentUser?.email === 'tuancuongnx@gmail.com' ||
        currentUser?.email === 'tuancuong241298@gmail.com' ||
        currentUser?.email === 'admin@bachkhoa.edu.vn')
    ) {
      if (!token) {
        const adminSessionToken = 'admin-auth-session';
        setToken(adminSessionToken);
        safeSessionStorage.setItem('bks_admin_token', adminSessionToken);
      }
    }
  }, [isOpen, isAdmin, currentUser, token]);

  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Event & Store Data
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [remainingBudget, setRemainingBudget] = useState<number>(0);
  const [awardedAmount, setAwardedAmount] = useState<number>(0);
  const [prizeTiers, setPrizeTiers] = useState<MomoPrizeTier[]>([]);
  const [tickets, setTickets] = useState<SpinTicket[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Action states
  const [activeTab, setActiveTab] = useState<'claims' | 'prizes' | 'tickets' | 'logs'>('claims');
  const [selectedClaim, setSelectedClaim] = useState<RewardClaim | null>(null);
  const [momoRefInput, setMomoRefInput] = useState<string>('');
  const [rejectionInput, setRejectionInput] = useState<string>('');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Ticket Management State
  const [newTicketCount, setNewTicketCount] = useState<number>(10);
  const [newTicketOccasion, setNewTicketOccasion] = useState<string>('20-10');
  const [recentlyGenerated, setRecentlyGenerated] = useState<string[]>([]);
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [ticketOccasionFilter, setTicketOccasionFilter] = useState<string>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'used' | 'unused'>('all');

  // Claim Filters
  const [claimSearch, setClaimSearch] = useState<string>('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('all');

  // Editable settings
  const [editableBudget, setEditableBudget] = useState<number>(500000);
  const [editableTiers, setEditableTiers] = useState<MomoPrizeTier[]>([]);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  const fetchAdminData = async (adminToken: string) => {
    setLoading(true);
    let loadedFromApi = false;
    try {
      const res = await fetch('/api/admin/event-data', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTotalBudget(data.totalBudget || 0);
        setRemainingBudget(data.remainingBudget || 0);
        setAwardedAmount(data.awardedAmount || 0);
        setPrizeTiers(data.prizeTiers || []);
        setTickets(data.tickets || []);
        setClaims(data.claims || []);
        setAuditLogs(data.auditLogs || []);

        setEditableBudget(data.totalBudget || 500000);
        setEditableTiers(data.prizeTiers || []);
        loadedFromApi = true;
      }
    } catch {
      // Backend not running (e.g. deployed on Vercel)
    }

    if (!loadedFromApi) {
      // Direct Cloud Firestore retrieval
      try {
        const data = await loadFirestoreAdminDashboard();
        setTotalBudget(data.totalBudget);
        setRemainingBudget(data.remainingBudget);
        setAwardedAmount(data.awardedAmount);
        setPrizeTiers(data.prizeTiers);
        setTickets(data.tickets);
        setClaims(data.claims);
        setAuditLogs(data.auditLogs);

        setEditableBudget(data.totalBudget);
        setEditableTiers(data.prizeTiers);
      } catch (err) {
        console.error('Failed to load admin data from Firestore:', err);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchAdminData(token);
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    const isMatchKnownPass =
      password.trim() === 'BachKhoa2026@MoMo' ||
      password.trim() === 'BKSamsong2010@2026' ||
      password.trim() === 'Admin@2026';

    try {
      let loggedIn = false;
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.token);
          safeSessionStorage.setItem('bks_admin_token', data.token);
          fetchAdminData(data.token);
          playCelebration();
          loggedIn = true;
        }
      } catch {
        // Server unavailable
      }

      if (!loggedIn && isMatchKnownPass) {
        const clientToken = `admin-token-${Date.now()}`;
        setToken(clientToken);
        safeSessionStorage.setItem('bks_admin_token', clientToken);
        fetchAdminData(clientToken);
        playCelebration();
        loggedIn = true;
      }

      if (!loggedIn) {
        throw new Error('Mật khẩu quản trị không đúng hoặc chưa được cấp phép.');
      }
    } catch (err: unknown) {
      setLoginError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    safeSessionStorage.removeItem('bks_admin_token');
  };

  const handleUpdateClaimStatus = async (
    claimCode: string,
    newStatus: string,
    extra: { momoTransactionRef?: string; rejectionReason?: string; adminNote?: string } = {}
  ) => {
    setActionSuccess('');
    setActionError('');
    try {
      // 1. Always update directly in Cloud Firestore
      await updateFirestoreClaimStatus(claimCode, newStatus, extra);

      // 2. Also try server endpoint if available
      try {
        await fetch('/api/admin/update-claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            claimCode,
            newStatus,
            ...extra,
          }),
        });
      } catch {
        // Optional on Vercel
      }

      setActionSuccess(`Đã cập nhật trạng thái mã ${claimCode} thành công!`);
      setSelectedClaim(null);
      setMomoRefInput('');
      setRejectionInput('');
      setAdminNoteInput('');
      fetchAdminData(token || 'admin');
      playSoftPop();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleGenerateTickets = async () => {
    setActionSuccess('');
    setActionError('');
    try {
      const createdCodes: string[] = [];
      const prefix = newTicketOccasion === '20-11' ? 'NG' : newTicketOccasion === 'tet' ? 'TT' : 'PN';

      // 1. Write tickets directly to Cloud Firestore
      for (let i = 0; i < newTicketCount; i++) {
        const code = generateTicketCode(prefix);
        createdCodes.push(code);
        const ticketRef = doc(db, 'tickets', code);
        await setDoc(ticketRef, {
          code,
          occasion: newTicketOccasion,
          isUsed: false,
          createdAt: new Date().toISOString(),
        });
      }

      await addFirestoreAuditLog({
        action: 'Tạo vé dự thưởng mới',
        details: `Quản trị viên đã tạo ${newTicketCount} vé mới dịp ${newTicketOccasion}`,
        adminUser: currentUser?.email || 'Admin Bách Khoa',
      });

      // 2. Also try server endpoint if available
      try {
        await fetch('/api/admin/generate-tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ count: newTicketCount, occasion: newTicketOccasion }),
        });
      } catch {
        // Optional on Vercel
      }

      setActionSuccess(`Đã tạo thành công ${createdCodes.length} vé dự thưởng bảo mật 8 ký tự cho dịp ${newTicketOccasion}!`);
      setRecentlyGenerated(createdCodes);
      fetchAdminData(token || 'admin');
      playCelebration();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleDeleteTicket = async (code: string) => {
    if (!window.confirm(`Xác nhận xóa/thu hồi vé ${code}?`)) return;
    setActionSuccess('');
    setActionError('');
    try {
      // 1. Delete from Cloud Firestore
      try {
        await deleteDoc(doc(db, 'tickets', code));
      } catch (fErr) {
        console.warn('Firestore ticket delete warning:', fErr);
      }

      // 2. Also call server endpoint if available
      try {
        await fetch('/api/admin/delete-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        });
      } catch {
        // Optional on Vercel
      }

      setActionSuccess(`Đã thu hồi vé ${code} thành công.`);
      fetchAdminData(token || 'admin');
      playSoftPop();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    }
  };

  const handleCopyRecentlyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(recentlyGenerated.join('\n'));
      setActionSuccess('Đã sao chép danh sách vé mới vào bộ nhớ tạm!');
      playSoftPop();
      setTimeout(() => setActionSuccess(''), 3000);
    } catch {}
  };

  const handleSaveBudget = async () => {
    setActionSuccess('');
    setActionError('');
    setSavingSettings(true);
    try {
      // 1. Save directly to Cloud Firestore
      await saveFirestoreEventConfig({ totalBudget: Number(editableBudget) });

      // 2. Also sync to server endpoint if running
      try {
        await fetch('/api/admin/update-budget', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ totalBudget: Number(editableBudget) }),
        });
      } catch {
        // Optional on Vercel
      }

      setActionSuccess(`Đã cập nhật ngân sách sự kiện thành ${Number(editableBudget).toLocaleString('vi-VN')}đ vào Cloud Firestore!`);
      fetchAdminData(token || 'admin');
      playSoftPop();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveTiers = async () => {
    setActionSuccess('');
    setActionError('');
    setSavingSettings(true);
    try {
      // 1. Save directly to Cloud Firestore
      await saveFirestorePrizeTiers(editableTiers);

      // 2. Also sync to server endpoint if running
      try {
        await fetch('/api/admin/update-prize-pool', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tiers: editableTiers }),
        });
      } catch {
        // Optional on Vercel
      }

      setActionSuccess('Đã lưu cấu hình các mức giải thưởng MoMo vào Cloud Firestore thành công!');
      fetchAdminData(token || 'admin');
      playCelebration();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTierChange = (index: number, field: keyof MomoPrizeTier, val: any) => {
    setEditableTiers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddNewTier = () => {
    setEditableTiers((prev) => [
      ...prev,
      {
        id: `tier-custom-${Date.now()}`,
        amount: 30000,
        label: '30.000đ',
        totalQuantity: 5,
        remainingQuantity: 5,
        color: '#FDF2F8',
        textColor: '#9D174D',
      },
    ]);
  };

  const handleDeleteTier = (id: string) => {
    setEditableTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExportClaimsCSV = () => {
    window.open('/api/admin/export-csv', '_blank');
  };

  const handleExportTicketsCSV = () => {
    window.open('/api/admin/export-tickets', '_blank');
  };

  // Filtered Claims
  const filteredClaims = claims.filter((c) => {
    if (claimStatusFilter !== 'all' && c.status !== claimStatusFilter) return false;
    if (!claimSearch.trim()) return true;
    const q = claimSearch.toLowerCase();
    return (
      c.claimCode.toLowerCase().includes(q) ||
      c.ticketCode.toLowerCase().includes(q) ||
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.momoPhone && c.momoPhone.includes(q)) ||
      (c.schoolClassOrDepartment && c.schoolClassOrDepartment.toLowerCase().includes(q))
    );
  });

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    if (ticketStatusFilter === 'used' && !t.isUsed) return false;
    if (ticketStatusFilter === 'unused' && t.isUsed) return false;
    if (ticketOccasionFilter !== 'all') {
      const prefixMap: Record<string, string> = {
        '20-10': 'PN',
        '20-11': 'NG',
        '08-03': 'Q8',
        tet: 'TT',
        valentine: 'VL',
      };
      const p = prefixMap[ticketOccasionFilter] || ticketOccasionFilter;
      if (!t.code.startsWith(p) && t.occasion !== ticketOccasionFilter) return false;
    }
    if (!ticketSearch.trim()) return true;
    const q = ticketSearch.toUpperCase();
    return t.code.includes(q) || (t.claimCode && t.claimCode.includes(q));
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-rose-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-black text-base sm:text-lg tracking-tight">
                  Cổng Quản Trị Hệ Thống Trao Thưởng MoMo
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  CSDL Đồng Bộ
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa · Quản lý vé bảo mật & trao thưởng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {token && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-purple-200 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Đăng xuất quản trị"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-red-600 hover:text-red-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auth Gate: Password Screen */}
        {!token ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-14 h-14 rounded-3xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-4 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
              Xác Thực Quyền Quản Trị
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">
              Khu vực bảo mật dành riêng cho Ban Giám Hiệu và Ban Tổ Chức Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu quản trị"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}
              </button>
            </form>
          </div>
        ) : (
          /* Main Admin Panel */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-950/40 dark:to-pink-900/40 border border-rose-200 dark:border-rose-900">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                  Ngân Sách MoMo
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-950 dark:text-rose-100 mt-1 font-mono">
                  {totalBudget.toLocaleString('vi-VN')}đ
                </div>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 block">
                  Còn lại: {remainingBudget.toLocaleString('vi-VN')}đ (Đã trao: {awardedAmount.toLocaleString('vi-VN')}đ)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-900/40 border border-amber-200 dark:border-amber-900">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                  Yêu Cầu Chờ Chuyển
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-100 mt-1 font-mono">
                  {claims.filter((c) => c.status === 'pending_verification' || c.status === 'pending_transfer').length}
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 block">
                  Cần xử lý chuyển tiền MoMo
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/40 dark:to-indigo-900/40 border border-purple-200 dark:border-purple-900">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                  Vé Bảo Mật (8 ký tự)
                </span>
                <div className="text-xl sm:text-2xl font-black text-purple-950 dark:text-purple-100 mt-1 font-mono">
                  {tickets.filter((t) => t.isUsed).length} / {tickets.length}
                </div>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 block">
                  Đã quay thưởng (Còn lại: {tickets.filter((t) => !t.isUsed).length} vé)
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('claims')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'claims'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  Danh Sách Nhận Thưởng ({claims.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'tickets'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  Quản Lý Vé Quay ({tickets.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('prizes')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'prizes'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  Cấu Hình Mức Thưởng
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    activeTab === 'logs'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  Nhật Ký Thao Tác
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchAdminData(token)}
                  className="p-2 text-stone-600 dark:text-stone-300 hover:text-purple-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  title="Tải lại dữ liệu từ CSDL"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* TAB 1: CLAIMS PROCESSING */}
            {activeTab === 'claims' && (
              <div className="space-y-4">
                
                {/* Claims Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm theo mã, tên, SĐT, lớp..."
                        value={claimSearch}
                        onChange={(e) => setClaimSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <select
                      value={claimStatusFilter}
                      onChange={(e) => setClaimStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="pending_verification">Chờ xác minh</option>
                      <option value="pending_transfer">Chờ chuyển tiền</option>
                      <option value="transferred">Đã chuyển tiền</option>
                      <option value="verified">Đã xác minh</option>
                      <option value="rejected">Từ chối</option>
                      <option value="unclaimed">Chưa nộp thông tin</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportClaimsCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất CSV Nhận Thưởng</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Mã Nhận Thưởng</th>
                        <th className="p-3">Mã Vé</th>
                        <th className="p-3">Số Tiền</th>
                        <th className="p-3">Người Nhận</th>
                        <th className="p-3">Lớp / Đơn Vị</th>
                        <th className="p-3">SĐT MoMo</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-sans">
                      {filteredClaims.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-stone-400">
                            Không có bản ghi nhận thưởng phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredClaims.map((c) => (
                          <tr key={c.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-purple-900 dark:text-purple-300">{c.claimCode}</td>
                            <td className="p-3 font-mono font-bold text-stone-700 dark:text-stone-300">{c.ticketCode}</td>
                            <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                              {c.amount.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="p-3 font-medium text-stone-900 dark:text-stone-100">{c.fullName || '—'}</td>
                            <td className="p-3 text-stone-600 dark:text-stone-400">{c.schoolClassOrDepartment || '—'}</td>
                            <td className="p-3 font-mono text-stone-800 dark:text-stone-200">{c.momoPhone || '—'}</td>
                            <td className="p-3">
                              {c.status === 'transferred' && (
                                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded font-bold">
                                  Đã chuyển tiền
                                </span>
                              )}
                              {c.status === 'pending_transfer' && (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded font-bold">
                                  Chờ chuyển tiền
                                </span>
                              )}
                              {c.status === 'pending_verification' && (
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded font-bold">
                                  Chờ xác minh
                                </span>
                              )}
                              {c.status === 'verified' && (
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 rounded font-bold">
                                  Đã xác minh
                                </span>
                              )}
                              {c.status === 'rejected' && (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 rounded font-bold">
                                  Từ chối
                                </span>
                              )}
                              {c.status === 'unclaimed' && (
                                <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded font-bold">
                                  Chưa nộp thông tin
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClaim(c);
                                  setAdminNoteInput(c.adminNote || '');
                                }}
                                className="px-3 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-lg font-semibold transition-colors cursor-pointer"
                              >
                                Xử lý
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Claim Processing Sub-Modal */}
                {selectedClaim && (
                  <div className="p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200">
                        Xử lý giải thưởng: {selectedClaim.claimCode} ({selectedClaim.amount.toLocaleString()}đ)
                      </h4>
                      <button
                        onClick={() => setSelectedClaim(null)}
                        className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-white dark:bg-stone-900 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900">
                      <div>
                        <span className="text-stone-400 block">Họ và tên:</span>
                        <strong className="text-stone-900 dark:text-stone-100">{selectedClaim.fullName || 'Chưa cung cấp'}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Lớp / Phòng:</span>
                        <strong className="text-stone-900 dark:text-stone-100">{selectedClaim.schoolClassOrDepartment || 'Chưa cung cấp'}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">SĐT MoMo:</span>
                        <strong className="text-rose-600 font-mono text-sm">{selectedClaim.momoPhone || 'Chưa cung cấp'}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Mã vé gốc:</span>
                        <strong className="text-purple-700 font-mono">{selectedClaim.ticketCode}</strong>
                      </div>
                      {selectedClaim.guardianNote && (
                        <div className="sm:col-span-4 pt-2 border-t border-stone-100 dark:border-stone-800">
                          <span className="text-stone-400 block">Ghi chú người tham gia:</span>
                          <span className="italic text-stone-700 dark:text-stone-300">{selectedClaim.guardianNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Step-by-step MoMo manual action */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateClaimStatus(selectedClaim.claimCode, 'verified')}
                          className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 cursor-pointer"
                        >
                          1. Xác minh thông tin hợp lệ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateClaimStatus(selectedClaim.claimCode, 'pending_transfer')}
                          className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                          2. Đặt trạng thái chờ chuyển tiền
                        </button>
                      </div>

                      {/* Final step: Confirm MoMo Transfer with Transaction Reference ID */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-800 space-y-2">
                        <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          3. Xác nhận đã chuyển tiền MoMo thực tế:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nhập Mã giao dịch MoMo thực tế (VD: 12345678901)"
                            value={momoRefInput}
                            onChange={(e) => setMomoRefInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 font-mono bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateClaimStatus(selectedClaim.claimCode, 'transferred', {
                                momoTransactionRef: momoRefInput,
                              })
                            }
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg cursor-pointer"
                          >
                            Đánh dấu "Đã chuyển tiền"
                          </button>
                        </div>
                      </div>

                      {/* Admin Internal Note */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ghi chú nội bộ admin (VD: Đã đối chiếu mã sinh viên, đã gọi điện xác nhận)..."
                          value={adminNoteInput}
                          onChange={(e) => setAdminNoteInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateClaimStatus(selectedClaim.claimCode, selectedClaim.status, {
                              adminNote: adminNoteInput,
                            })
                          }
                          className="px-3.5 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Lưu ghi chú
                        </button>
                      </div>

                      {/* Reject option */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Lý do từ chối trao giải (nếu có gian lận / thông tin sai)..."
                          value={rejectionInput}
                          onChange={(e) => setRejectionInput(e.target.value)}
                          className="flex-1 px-3 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateClaimStatus(selectedClaim.claimCode, 'rejected', {
                              rejectionReason: rejectionInput,
                            })
                          }
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Từ chối trao giải
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TICKETS MANAGEMENT (SECURE 8-CHARACTER TICKETS) */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                
                {/* Issue New 8-Character Tickets Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-rose-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-rose-950/40 border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-purple-700" />
                        <span>Phát Hành Vé Dự Thưởng Bảo Mật (8 Ký Tự)</span>
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        Mã vé gồm 8 ký tự in hoa và số, có tiền tố định danh từng dịp lễ (PN: 20/10, NG: 20/11, Q8: 08/03, TT: Tết, VL: Valentine).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={newTicketOccasion}
                        onChange={(e) => setNewTicketOccasion(e.target.value)}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-stone-800 text-purple-950 dark:text-purple-200"
                      >
                        <option value="20-10">Dịp 20/10 (Tiền tố PN)</option>
                        <option value="20-11">Dịp 20/11 (Tiền tố NG)</option>
                        <option value="08-03">Dịp 08/03 (Tiền tố Q8)</option>
                        <option value="tet">Tết Nguyên Đán (Tiền tố TT)</option>
                        <option value="valentine">Valentine 14/02 (Tiền tố VL)</option>
                      </select>

                      <select
                        value={newTicketCount}
                        onChange={(e) => setNewTicketCount(Number(e.target.value))}
                        className="px-2.5 py-2 text-xs font-bold rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-stone-800 text-purple-950 dark:text-purple-200"
                      >
                        <option value={5}>5 vé</option>
                        <option value={10}>10 vé</option>
                        <option value={20}>20 vé</option>
                        <option value={50}>50 vé</option>
                        <option value={100}>100 vé</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleGenerateTickets}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tạo vé ngay</span>
                      </button>
                    </div>
                  </div>

                  {/* Recently generated tickets banner */}
                  {recentlyGenerated.length > 0 && (
                    <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Vừa tạo thành công {recentlyGenerated.length} mã vé mới:</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyRecentlyGenerated}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Sao chép toàn bộ mã</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto font-mono text-xs font-bold text-purple-800 dark:text-purple-200">
                        {recentlyGenerated.map((code) => (
                          <span key={code} className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar for Tickets */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm mã vé..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono"
                      />
                    </div>

                    <select
                      value={ticketOccasionFilter}
                      onChange={(e) => setTicketOccasionFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    >
                      <option value="all">Tất cả dịp lễ</option>
                      <option value="20-10">20/10 (PN)</option>
                      <option value="20-11">20/11 (NG)</option>
                      <option value="08-03">08/03 (Q8)</option>
                      <option value="tet">Tết (TT)</option>
                      <option value="valentine">Valentine (VL)</option>
                    </select>

                    <select
                      value={ticketStatusFilter}
                      onChange={(e) => setTicketStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="unused">Chưa sử dụng</option>
                      <option value="used">Đã quay</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportTicketsCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất File Vé (CSV)</span>
                  </button>
                </div>

                {/* Tickets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-80 overflow-y-auto p-1">
                  {filteredTickets.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-xs text-stone-400">
                      Không tìm thấy vé dự thưởng nào theo bộ lọc.
                    </div>
                  ) : (
                    filteredTickets.map((t) => (
                      <div
                        key={t.code}
                        className={`p-2.5 rounded-2xl text-xs border relative group transition-all ${
                          t.isUsed
                            ? 'bg-stone-100 dark:bg-stone-800/80 text-stone-400 border-stone-200 dark:border-stone-700'
                            : 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm tracking-wide">{t.code}</span>
                          {!t.isUsed && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(t.code)}
                              className="text-stone-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition opacity-0 group-hover:opacity-100"
                              title="Thu hồi/xóa vé này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="px-1.5 py-0.2 rounded bg-stone-200/60 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-medium">
                            {t.occasion || (t.code.startsWith('PN') ? '20-10' : t.code.startsWith('NG') ? '20-11' : 'Chung')}
                          </span>
                          <span className={t.isUsed ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                            {t.isUsed ? (t.prizeWon ? `${t.prizeWon.toLocaleString()}đ` : 'Đã quay') : 'Khả dụng'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: PRIZE TIERS & BUDGET CONFIG */}
            {activeTab === 'prizes' && (
              <div className="space-y-6">
                
                {/* 1. Budget Configuration Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-amber-50 dark:from-purple-950/40 dark:to-amber-950/40 border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-purple-700" />
                        <span>Cài Đặt Ngân Sách Tổng Giải Thưởng MoMo</span>
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        Tổng ngân sách ban tổ chức trường dành cho các phần lì xì/thưởng chuyển khoản MoMo.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={100000}
                        step={50000}
                        value={editableBudget}
                        onChange={(e) => setEditableBudget(Number(e.target.value) || 0)}
                        className="w-40 px-3 py-2 text-sm font-mono font-bold rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-stone-800 text-purple-950 dark:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveBudget}
                        disabled={savingSettings}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50"
                      >
                        {savingSettings ? 'Đang lưu...' : 'Lưu ngân sách'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 pt-2 border-t border-purple-200/60 dark:border-purple-800/60">
                    <div>
                      Đã trao: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{awardedAmount.toLocaleString('vi-VN')}đ</strong>
                    </div>
                    <div>
                      Còn lại: <strong className="text-rose-700 dark:text-rose-400 font-mono">{remainingBudget.toLocaleString('vi-VN')}đ</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Prize Tiers Customization */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        Cấu hình các mức giải thưởng MoMo (Tối thiểu 10.000 VNĐ)
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Có thể chỉnh sửa mệnh giá, số lượng giải, hoặc thêm mức giải thưởng mới.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewTier}
                        className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm mức giải</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTiers}
                        disabled={savingSettings}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingSettings ? 'Đang lưu...' : 'Lưu thay đổi giải'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Editable Tiers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {editableTiers.map((tier, idx) => (
                      <div
                        key={tier.id || idx}
                        className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 space-y-3 shadow-sm hover:border-purple-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) => handleTierChange(idx, 'label', e.target.value)}
                            placeholder="Nhãn (VD: 20.000đ)"
                            className="font-bold text-sm text-stone-900 dark:text-stone-100 border-b border-stone-300 dark:border-stone-600 bg-transparent focus:outline-none focus:border-purple-600 w-28 px-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteTier(tier.id)}
                            className="text-stone-400 hover:text-red-600 text-xs cursor-pointer p-1"
                            title="Xóa giải này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-stone-500 block text-[10px] uppercase font-bold">Mệnh giá (VNĐ)</label>
                            <input
                              type="number"
                              min={10000}
                              step={5000}
                              value={tier.amount}
                              onChange={(e) => handleTierChange(idx, 'amount', Number(e.target.value) || 10000)}
                              className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                            />
                          </div>
                          <div>
                            <label className="text-stone-500 block text-[10px] uppercase font-bold">Tổng số giải</label>
                            <input
                              type="number"
                              min={1}
                              value={tier.totalQuantity}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 1;
                                handleTierChange(idx, 'totalQuantity', val);
                                if (tier.remainingQuantity > val) {
                                  handleTierChange(idx, 'remainingQuantity', val);
                                }
                              }}
                              className="w-full px-2 py-1 text-xs font-mono font-bold rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-700">
                          <span>Còn lại: <strong>{tier.remainingQuantity}</strong> giải</span>
                          <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                            {(tier.amount * tier.totalQuantity).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: AUDIT LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <strong className="text-purple-900 dark:text-purple-300 block">{log.action}</strong>
                      <span className="text-stone-600 dark:text-stone-400">{log.details}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleString('vi-VN')} ({log.adminUser})
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
