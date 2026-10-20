import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle,
  Clock,
  Send,
  AlertTriangle,
  Phone,
  User,
  School,
  FileText,
  Check,
  CreditCard,
  Building,
  Printer,
  Copy,
  Sparkles,
  Ticket
} from 'lucide-react';
import { playCelebration, playSoftPop } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ClaimRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimCode: string;
  prizeAmount: number;
  initialTicketCode?: string;
}

export const ClaimRewardModal: React.FC<ClaimRewardModalProps> = ({
  isOpen,
  onClose,
  claimCode,
  prizeAmount,
  initialTicketCode,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { holidayConfig } = useEvent();

  const [payoutMethod, setPayoutMethod] = useState<'momo' | 'bank' | 'in_person'>('momo');
  const [fullName, setFullName] = useState<string>(userProfile?.displayName || '');
  const [schoolClass, setSchoolClass] = useState<string>('');
  const [momoPhone, setMomoPhone] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [guardianNote, setGuardianNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [claimStatus, setClaimStatus] = useState<string>('unclaimed');
  const [momoRef, setMomoRef] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Set default full name from profile
  useEffect(() => {
    if (userProfile?.displayName && !fullName) {
      setFullName(userProfile.displayName);
    }
  }, [userProfile]);

  // Fetch claim status on open
  useEffect(() => {
    if (!isOpen || !claimCode) return;
    setErrorMsg('');
    setSuccessMsg('');

    fetch('/api/spin/claim-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.status) {
          setClaimStatus(data.status);
          if (data.fullName) setFullName(data.fullName);
          if (data.schoolClassOrDepartment) setSchoolClass(data.schoolClassOrDepartment);
          if (data.momoTransactionRef) setMomoRef(data.momoTransactionRef);
          if (data.status !== 'unclaimed' && data.fullName) {
            setHasSubmitted(true);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, claimCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const fullNote = [
        payoutMethod === 'bank' ? `Ngân hàng: ${bankName} - STK: ${bankAccount}` : '',
        payoutMethod === 'in_person' ? 'Đăng ký nhận quà trực tiếp tại trường' : '',
        guardianNote.trim(),
      ]
        .filter(Boolean)
        .join(' | ');

      // 1. Submit to Cloud Firestore if user is authenticated
      if (currentUser) {
        try {
          const claimId = `claim-${claimCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const claimDocRef = doc(db, 'claims', claimId);
          await setDoc(claimDocRef, {
            id: claimId,
            claimCode,
            ticketCode: initialTicketCode || '',
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            fullName: fullName.trim(),
            momoPhone: momoPhone.trim(),
            department: schoolClass.trim(),
            amount: prizeAmount,
            payoutMethod,
            note: fullNote,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (fErr) {
          console.warn('Firestore claim save warning:', fErr);
        }
      }

      // 2. Submit to server endpoint
      const res = await fetch('/api/spin/submit-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimCode,
          fullName: fullName.trim(),
          schoolClassOrDepartment: schoolClass.trim(),
          momoPhone: momoPhone.trim(),
          guardianNote: fullNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi nộp thông tin.');
      }

      // Save to local storage for offline retrieval
      try {
        const saved = JSON.parse(localStorage.getItem('my_event_claims') || '[]');
        saved.unshift({
          claimCode,
          ticketCode: initialTicketCode,
          amount: prizeAmount,
          fullName: fullName.trim(),
          momoPhone: momoPhone.trim(),
          department: schoolClass.trim(),
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('my_event_claims', JSON.stringify(saved.slice(0, 20)));
      } catch {}

      setClaimStatus(data.status || 'pending_verification');
      setSuccessMsg(data.message || 'Đã gửi thông tin nhận thưởng thành công!');
      setHasSubmitted(true);
      playCelebration();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Không thể gửi thông tin. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(claimCode);
      playSoftPop();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const renderStatusBadge = () => {
    switch (claimStatus) {
      case 'transferred':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã chuyển tiền qua MoMo
          </span>
        );
      case 'pending_transfer':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Chờ quản trị viên chuyển tiền
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã xác minh thông tin
          </span>
        );
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Chờ quản trị viên xác minh
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            Đã từ chối trao giải
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
            Chưa gửi thông tin nhận thưởng
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300 overflow-hidden my-auto"
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#A50064] via-rose-500 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-2.5 rounded-2xl bg-gradient-to-tr from-[#A50064] to-pink-500 text-white flex items-center justify-center shadow-md">
            <Phone className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A50064]">
            Hệ Thống Trao Thưởng Sự Kiện · {holidayConfig.shortDate}
          </span>
          <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
            Thông Tin Người Nhận Giải
          </h3>
          <p className="text-xs text-stone-600 mt-1">
            Vui lòng cung cấp chính xác để Ban Tổ Chức Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa tiến hành trao thưởng.
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Prize & Ticket Details Card */}
        <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-rose-200 mb-5">
          <div className="flex items-center justify-between pb-2 border-b border-rose-100">
            <span className="text-xs text-stone-500 font-medium">Trị giá giải thưởng:</span>
            <span className="font-serif font-black text-xl text-[#A50064]">
              {prizeAmount ? `${prizeAmount.toLocaleString('vi-VN')} VNĐ` : '10.000 VNĐ'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2.5 gap-2">
            <div>
              <span className="text-[11px] text-stone-500 block">Mã nhận thưởng duy nhất:</span>
              <span className="font-mono font-bold text-sm text-stone-800 tracking-wide">
                {claimCode}
              </span>
            </div>

            {initialTicketCode && (
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-stone-500 block">Vé quay đã dùng:</span>
                <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {initialTicketCode}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer self-start sm:self-center"
            >
              {copiedCode ? <span className="text-emerald-600">Đã chép</span> : 'Sao chép mã'}
            </button>
          </div>
        </div>

        {/* MoMo Security Warnings */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 mb-4 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-950 font-bold">BẢO MẬT & MINH BẠCH:</strong>
            Ban tổ chức KHÔNG BAO GIỜ yêu cầu mã OTP, mã PIN hay mật khẩu ví MoMo. Chúng tôi chỉ cần số điện thoại MoMo để thực hiện chuyển khoản trao giải.
          </div>
        </div>

        {/* State 1: Official Digital Prize Certificate when already submitted or transferred */}
        {hasSubmitted || claimStatus === 'transferred' ? (
          <div className="space-y-4">
            {/* Certificate Voucher Frame */}
            <div className="relative p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF5EE] to-[#FFF9F2] border-2 border-amber-400/90 shadow-lg text-stone-900 text-center overflow-hidden">
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 text-amber-500 text-xs">❖</div>
              <div className="absolute top-2 right-2 text-amber-500 text-xs">❖</div>
              <div className="absolute bottom-2 left-2 text-amber-500 text-xs">❖</div>
              <div className="absolute bottom-2 right-2 text-amber-500 text-xs">❖</div>

              {/* Top Seal & Heading */}
              <div className="mb-3">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-800 block">
                  Trường Trung Cấp Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa
                </span>
                <h4 className="font-serif text-lg sm:text-xl font-black text-rose-950 mt-1 uppercase tracking-tight">
                  Phiếu Xác Nhận Trao Thưởng Điện Tử
                </h4>
                <span className="text-[11px] text-stone-500 italic block mt-0.5">
                  Chương trình {holidayConfig.fullName}
                </span>
              </div>

              {/* Status Ribbon */}
              <div className="mb-4 inline-flex items-center justify-center">
                {renderStatusBadge()}
              </div>

              {/* Big Prize Callout */}
              <div className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-amber-300/80 mb-4 inline-block mx-auto">
                <span className="text-[11px] text-stone-600 block">Trị giá giải thưởng</span>
                <span className="font-serif font-black text-2xl text-[#A50064]">
                  {prizeAmount ? `${prizeAmount.toLocaleString('vi-VN')} VNĐ` : '10.000 VNĐ'}
                </span>
              </div>

              {/* Key Details Grid */}
              <div className="text-left text-xs space-y-2 bg-white/80 p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500">Người nhận giải:</span>
                  <strong className="text-stone-900 font-bold">{fullName || 'Chưa cập nhật'}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500">Đơn vị / Lớp học:</span>
                  <strong className="text-stone-800">{schoolClass || 'Khách mời'}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500">Hình thức nhận:</span>
                  <span className="font-medium text-stone-800">
                    {payoutMethod === 'momo'
                      ? `Ví MoMo (${momoPhone})`
                      : payoutMethod === 'bank'
                      ? `Ngân hàng: ${bankName} (${bankAccount})`
                      : 'Nhận trực tiếp tại Trường'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500">Mã nhận thưởng:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {claimCode}
                  </span>
                </div>
                {initialTicketCode && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500">Vé quay đã dùng:</span>
                    <span className="font-mono font-bold text-purple-700">
                      {initialTicketCode}
                    </span>
                  </div>
                )}
                {momoRef && (
                  <div className="flex justify-between items-center py-1 text-emerald-800 bg-emerald-50 px-2 rounded">
                    <span>Mã GD MoMo:</span>
                    <strong className="font-mono">{momoRef}</strong>
                  </div>
                )}
              </div>

              <div className="mt-3 text-[11px] text-stone-500 italic">
                * Quý vị có thể dùng Mã nhận thưởng để tra cứu tiến độ trao giải trên website bất kỳ lúc nào mà không cần tài khoản.
              </div>
            </div>

            {/* Actions for Certificate */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Lưu Phiếu</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Đã chép mã' : 'Chép mã'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {claimStatus !== 'transferred' && (
                  <button
                    type="button"
                    onClick={() => setHasSubmitted(false)}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    Chỉnh sửa lại
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gradient-to-r from-[#A50064] to-rose-600 text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-95 transition cursor-pointer"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Form for recipient input */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Mã nhận giải: <strong className="font-mono">{claimCode}</strong>. Ban tổ chức Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa sẽ đối soát và giải ngân sớm nhất.
                </p>
              </div>
            )}

            {/* Payout method choice */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Phương thức nhận thưởng <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('momo')}
                  className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                    payoutMethod === 'momo'
                      ? 'bg-rose-50 border-[#A50064] text-[#A50064]'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Ví MoMo
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                    payoutMethod === 'bank'
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Ngân hàng
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('in_person')}
                  className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                    payoutMethod === 'in_person'
                      ? 'bg-amber-50 border-amber-600 text-amber-800'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Tại trường
                </button>
              </div>
            </div>

            {/* Recipient Full Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Họ và tên người nhận giải <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Thị Lan / Thầy Lê Văn Hùng"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* Class / Department at School */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Lớp học / Phòng khoa / Đơn vị <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="VD: Lớp CNTT K26, Khoa Điện Tử, GVCN, Khách mời..."
                  value={schoolClass}
                  onChange={(e) => setSchoolClass(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* Phone Number / MoMo */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Số điện thoại liên hệ / Nhận MoMo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  maxLength={11}
                  placeholder="VD: 0987654321"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
                />
              </div>
            </div>

            {/* Bank details if bank selected */}
            {payoutMethod === 'bank' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngân hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Vietcombank, MB..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Số tài khoản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 1029384756..."
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Guardian Note for underage students */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ghi chú / Lời nhắn gửi BTC <span className="text-stone-400 font-normal">(tùy chọn)</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Em nhận qua ví MoMo của mẹ (Trần Thị Hoa) hoặc lời cảm ơn..."
                  value={guardianNote}
                  onChange={(e) => setGuardianNote(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrintCertificate}
                className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In biểu mẫu</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Để sau
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#A50064] via-rose-600 to-pink-600 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Đang gửi...' : 'Xác Nhận & Gửi Thông Tin'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
