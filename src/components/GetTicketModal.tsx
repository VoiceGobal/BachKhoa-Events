import React, { useState } from 'react';
import { X, Mail, Phone, ShieldCheck, Ticket, Building, UserCheck, Copy, Check } from 'lucide-react';
import { playSoftPop } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';

interface GetTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: () => void;
  onSelectSampleTicket: (code: string) => void;
}

export const GetTicketModal: React.FC<GetTicketModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
  onSelectSampleTicket,
}) => {
  const { currentUser } = useAuth();
  const { holidayConfig } = useEvent();
  const [copiedContact, setCopiedContact] = useState<string>('');
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string>('');

  const handleClaimTicket = async () => {
    if (!currentUser) return;
    setClaiming(true);
    setClaimError('');
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/spin/claim-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Firebase-Id-Token': idToken },
        body: JSON.stringify({ occasion: holidayConfig.ticketPrefix }),
      });
      const data = await res.json();
      if (!res.ok || !data.ticketCode) {
        throw new Error(data.error || 'Máy chủ không thể cấp vé lúc này.');
      }
      const ticketCode = data.ticketCode;

      onSelectSampleTicket(ticketCode);
      playSoftPop();
      onClose();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      playSoftPop();
      setCopiedContact(label);
      setTimeout(() => setCopiedContact(''), 2000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 bg-stone-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300 dark:border-rose-900 overflow-hidden text-stone-900 dark:text-stone-100 my-auto"
      >
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-13 h-13 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-purple-700 via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-300 dark:shadow-rose-950">
            <Ticket className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
            Trường Trung Cấp Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa
          </span>
          <h3 className="font-serif text-2xl font-black text-stone-900 dark:text-white mt-1">
            Cách Nhận Mã Vé Dự Thưởng
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Quý Thầy Cô, Cán bộ, Sinh viên và Khách mời vui lòng lựa chọn 1 trong các hình thức bên dưới:
          </p>
        </div>

        <div className="space-y-4">
          
          {/* Method 1: Login with Gmail / Google */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50/80 to-purple-50/80 dark:from-stone-800/80 dark:to-stone-800/50 border-2 border-rose-200 dark:border-rose-900/60 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                    Cách 1: Đăng Nhập Bằng Gmail / Google
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                    Nhanh nhất
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  Dành cho Cán bộ, Giảng viên và Học sinh - Sinh viên. Khi đăng nhập qua Gmail, hệ thống sẽ tự động cấp vé và lưu trữ lịch sử trúng thưởng của bạn.
                </p>
                <div className="mt-3">
                  {currentUser ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span className="truncate">Đã đăng nhập: {currentUser.email}</span>
                    </div>
                  ) : null}
                  {currentUser ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleClaimTicket}
                        disabled={claiming}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>{claiming ? 'Đang cấp vé...' : 'Nhận mã vé của tôi'}</span>
                      </button>
                      {claimError && (
                        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-semibold">{claimError}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuthModal();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-700 hover:from-rose-700 hover:to-purple-800 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Đăng Nhập Bằng Gmail / Email Ngay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Method 2: Contact School BTC / Admin */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Building className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                  Cách 2: Liên Hệ Ban Tổ Chức / Quản Trị Viên
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Dành cho Khách mời hoặc cá nhân chưa nhận được vé mời dự thưởng. Vui lòng liên hệ Văn phòng Đoàn trường & Quản trị viên:
                </p>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700">
                    <span className="text-stone-600 dark:text-stone-400">Hotline / Zalo BTC:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('0988246810', 'phone')}
                      className="inline-flex items-center gap-1 font-mono font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                    >
                      <span>0988.246.810</span>
                      {copiedContact === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-700">
                    <span className="text-stone-600 dark:text-stone-400">Email tiếp nhận:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('btc.sukien@bachkhoa.edu.vn', 'email')}
                      className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
                    >
                      <span className="truncate max-w-[170px] sm:max-w-none">btc.sukien@bachkhoa.edu.vn</span>
                      {copiedContact === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                    </button>
                  </div>

                  <div className="text-[11px] text-stone-500 dark:text-stone-400 italic pt-0.5">
                    * Đơn vị: Phòng Quản lý Đào tạo & Công tác HSSV – Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Close */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
};
