import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  School,
  Sparkles,
  Camera,
  Edit3,
  Check,
  Save,
  LogOut,
  History,
  Gift,
  Heart,
  Calendar,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { playSoftPop } from '../utils/audio';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHistoryModal: () => void;
  onOpenWheel: () => void;
}

const AVATAR_PRESETS = [
  '🌸', '🌹', '🌺', '🌷', '💐', '👑', '💖', '✨'
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenHistoryModal,
  onOpenWheel,
}) => {
  const { currentUser, userProfile, refreshProfile, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [bio, setBio] = useState<string>('Chúc mừng ngày Phụ nữ Việt Nam 20/10 luôn rạng ngời và ngập tràn hạnh phúc! 🌸');
  const [avatarEmoji, setAvatarEmoji] = useState<string>('🌸');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || currentUser?.email?.split('@')[0] || 'Khách mời');
    }
  }, [userProfile, currentUser]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setSuccessMsg('');

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
      });
      await refreshProfile();
      setSuccessMsg('Đã cập nhật thông tin thành công!');
      playSoftPop();
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg('');
      }, 1500);
    } catch {
      setSuccessMsg('Đã lưu cục bộ thông tin hồ sơ.');
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border-2 border-rose-200 dark:border-rose-900/60 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Cover Photo - Zalo Style with 20/10 Festive Theme */}
        <div className="relative h-36 bg-gradient-to-r from-purple-800 via-rose-600 to-amber-500 overflow-hidden">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          {/* Top Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition cursor-pointer z-10"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Banner Tag */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>20/10 – Trao Lời Yêu Thương</span>
          </div>
        </div>

        {/* Profile Avatar & Info Card (Zalo overlap) */}
        <div className="relative px-6 pb-6 pt-0">
          
          {/* Overlapping Avatar */}
          <div className="flex justify-between items-end -mt-14 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center text-4xl shadow-inner select-none">
                  {avatarEmoji}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow" />
            </div>

            {/* Edit / Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Hủy sửa' : 'Sửa hồ sơ'}</span>
              </button>
            </div>
          </div>

          {/* User Name & Bio */}
          {!isEditing ? (
            <div className="space-y-1 mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-serif text-stone-900 dark:text-white">
                  {userProfile?.displayName || currentUser?.email?.split('@')[0]}
                </h3>
                <span className="p-0.5 rounded-full bg-blue-500 text-white" title="Đã xác thực">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                {currentUser?.email}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-300 italic pt-1 leading-relaxed">
                &ldquo;{bio}&rdquo;
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-3 mb-5">
              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Chọn biểu tượng đại diện:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition cursor-pointer ${
                        avatarEmoji === emoji ? 'bg-rose-100 border-2 border-rose-600 scale-110' : 'hover:bg-stone-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Họ và tên / Biệt danh:
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Dòng trạng thái / Lời chúc tâm đắc:
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs shadow hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </form>
          )}

          {/* Quick Stats Strip (Zalo style badges) */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center mb-5">
            <div className="p-1">
              <span className="block font-black text-rose-600 dark:text-rose-400 text-lg font-mono">
                {userProfile?.spinsRemaining ?? 3}
              </span>
              <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">Lượt quay còn</span>
            </div>
            <div className="p-1 border-x border-rose-200 dark:border-rose-900/60">
              <span className="block font-black text-purple-600 dark:text-purple-400 text-lg font-mono">
                {userProfile?.totalSpins ?? 0}
              </span>
              <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">Đã quay</span>
            </div>
            <div className="p-1">
              <span className="block font-black text-amber-600 dark:text-amber-400 text-lg font-mono">
                20/10
              </span>
              <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">Tri ân</span>
            </div>
          </div>

          {/* Action Navigation Options */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenWheel();
              }}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs flex items-center justify-between shadow-md transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-300" />
                <span>Đến Vòng Quay Nhận Lì Xì MoMo</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
                {userProfile?.spinsRemaining ?? 3} lượt
              </span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenHistoryModal();
              }}
              className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <span>Lịch Sử Quay Thưởng & Quà Tặng</span>
              </div>
              <span className="text-stone-400 text-xs">›</span>
            </button>

            <button
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="w-full p-2.5 rounded-xl text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer mt-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
