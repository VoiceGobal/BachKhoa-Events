import React, { useEffect, useState } from 'react';
import { X, History, Gift, Trophy, Clock, CheckCircle2, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface SpinHistoryItem {
  id: string;
  label: string;
  wishMessage: string;
  prizeAmount?: number;
  isCashPrize?: boolean;
  claimCode?: string;
  createdAt: string;
}

interface ClaimItem {
  id: string;
  claimCode: string;
  amount: number;
  fullName: string;
  momoPhone: string;
  status: 'pending' | 'verified' | 'transferred' | 'rejected';
  adminNote?: string;
  transactionRef?: string;
  createdAt: string;
}

interface UserHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClaimModalForCode?: (claimCode: string, amount: number) => void;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenClaimModalForCode,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'spins' | 'claims'>('spins');
  const [spins, setSpins] = useState<SpinHistoryItem[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load user spins
        const spinsRef = collection(db, 'spins');
        const qSpins = query(
          spinsRef,
          where('userId', '==', currentUser.uid)
        );
        const spinSnap = await getDocs(qSpins);
        const fetchedSpins: SpinHistoryItem[] = [];
        spinSnap.forEach((doc) => {
          fetchedSpins.push(doc.data() as SpinHistoryItem);
        });
        // Sort descending by createdAt
        fetchedSpins.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSpins(fetchedSpins);

        // Load user claims
        const claimsRef = collection(db, 'claims');
        const qClaims = query(
          claimsRef,
          where('userId', '==', currentUser.uid)
        );
        const claimSnap = await getDocs(qClaims);
        const fetchedClaims: ClaimItem[] = [];
        claimSnap.forEach((doc) => {
          fetchedClaims.push(doc.data() as ClaimItem);
        });
        fetchedClaims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setClaims(fetchedClaims);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-2 border-rose-200 overflow-hidden flex flex-col max-h-[88vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-800 via-rose-700 to-amber-600 p-6 text-white flex justify-between items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-1">
              <History className="w-3.5 h-3.5 text-amber-300" />
              Lịch Sử Cá Nhân
            </div>
            <h3 className="text-2xl font-bold font-serif">Kho Quà & Lời Chúc Của Bạn</h3>
            <p className="text-xs text-rose-100">
              {currentUser?.email} • {spins.length} lượt quay đã thực hiện
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('spins')}
            className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'spins'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-4 h-4" />
            Lịch sử các vòng quay ({spins.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'claims'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Gift className="w-4 h-4" />
            Giải thưởng MoMo đã nhận ({claims.length})
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-stone-500">Đang tải lịch sử của bạn...</p>
            </div>
          ) : activeTab === 'spins' ? (
            spins.length === 0 ? (
              <div className="py-12 text-center text-stone-500">
                <History className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-sm font-semibold">Bạn chưa thực hiện lượt quay nào!</p>
                <p className="text-xs text-stone-400 mt-1">
                  Hãy trở lại Vòng quay may mắn và trải nghiệm ngay nhé.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {spins.map((spin) => (
                  <div
                    key={spin.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              spin.isCashPrize
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {spin.label}
                          </span>
                          {spin.isCashPrize && (
                            <span className="text-xs font-semibold text-emerald-600">
                              +{(spin.prizeAmount || 0).toLocaleString('vi-VN')}đ MoMo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-700 mt-2 italic leading-relaxed">
                          &ldquo;{spin.wishMessage}&rdquo;
                        </p>
                        {spin.claimCode && (
                          <div className="mt-2.5 flex items-center gap-2 text-xs text-stone-600">
                            <span>Mã nhận thưởng:</span>
                            <code className="px-2 py-0.5 bg-white border border-stone-300 rounded font-mono font-bold text-rose-600">
                              {spin.claimCode}
                            </code>
                            <button
                              onClick={() => handleCopy(spin.claimCode!)}
                              className="text-stone-400 hover:text-stone-700"
                              title="Sao chép mã"
                            >
                              {copiedCode === spin.claimCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {onOpenClaimModalForCode && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenClaimModalForCode(spin.claimCode!, spin.prizeAmount || 0);
                                }}
                                className="ml-auto text-xs font-semibold text-rose-600 hover:underline"
                              >
                                Nhập nhận MoMo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(spin.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : claims.length === 0 ? (
            <div className="py-12 text-center text-stone-500">
              <Gift className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Chưa có thông tin nhận thưởng MoMo nào</p>
              <p className="text-xs text-stone-400 mt-1">
                Khi trúng các ô tiền mặt MoMo, thông tin gửi nhận quà sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-2xl border border-stone-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-emerald-700 text-base">
                      {claim.amount.toLocaleString('vi-VN')} VNĐ
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        claim.status === 'transferred'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claim.status === 'verified'
                          ? 'bg-blue-100 text-blue-800'
                          : claim.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {claim.status === 'transferred' && '✓ Đã chuyển quà MoMo'}
                      {claim.status === 'verified' && '✓ Đã xác thực'}
                      {claim.status === 'rejected' && '✕ Từ chối'}
                      {claim.status === 'pending' && '⏳ Chờ ban tổ chức duyệt'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl">
                    <div>
                      <span className="text-stone-400">Người nhận:</span>{' '}
                      <span className="font-semibold">{claim.fullName}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Số MoMo:</span>{' '}
                      <span className="font-semibold">{claim.momoPhone}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Mã trúng thưởng:</span>{' '}
                      <span className="font-mono text-stone-800">{claim.claimCode}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Thời gian gửi:</span>{' '}
                      <span>{new Date(claim.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {claim.adminNote && (
                    <div className="mt-2 text-xs text-stone-600 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                      <span className="font-semibold text-amber-800">Ghi chú từ BTC:</span>{' '}
                      {claim.adminNote}
                    </div>
                  )}

                  {claim.transactionRef && (
                    <div className="mt-2 text-xs text-emerald-700 font-mono">
                      Mã giao dịch MoMo: {claim.transactionRef}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
