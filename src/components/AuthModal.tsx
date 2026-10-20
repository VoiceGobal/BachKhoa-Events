import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle, Sparkles, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  onSuccess,
}) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        setSuccessMsg('Đăng nhập thành công! Chào mừng bạn tham gia vòng quay 20/10.');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1000);
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
        }
        await signUpWithEmail(email, password, displayName);
        setSuccessMsg('Đăng ký tài khoản thành công! Bạn nhận được 3 lượt quay may mắn.');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1200);
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setSuccessMsg('Email hướng dẫn khôi phục mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư.');
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      let msg = 'Đã có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.';
      if (err instanceof Error) {
        if (err.message.includes('user-not-found') || err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
          msg = 'Email hoặc mật khẩu không chính xác.';
        } else if (err.message.includes('email-already-in-use')) {
          msg = 'Email này đã được đăng ký. Vui lòng chọn Đăng nhập.';
        } else if (err.message.includes('invalid-email')) {
          msg = 'Định dạng email không hợp lệ.';
        } else if (err.message.includes('weak-password')) {
          msg = 'Mật khẩu quá yếu. Vui lòng nhập từ 6 ký tự trở lên.';
        } else {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      setSuccessMsg('Đăng nhập Google thành công!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: unknown) {
      console.error('Google login error:', err);
      if (err instanceof Error && !err.message.includes('popup-closed-by-user')) {
        setError('Không thể đăng nhập bằng Google. Vui lòng thử đăng nhập bằng Email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border-2 border-rose-200 dark:border-rose-900 overflow-hidden text-stone-900 dark:text-stone-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header gradient banner */}
        <div className="relative bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Trường Trung Cấp Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa
          </div>

          <h3 className="text-2xl font-bold font-serif">
            {mode === 'login' && 'Đăng Nhập Tài Khoản'}
            {mode === 'register' && 'Đăng Ký Tài Khoản'}
            {mode === 'forgot' && 'Khôi Phục Mật Khẩu'}
          </h3>
          <p className="text-xs text-rose-100 mt-1">
            {mode === 'login' && 'Đăng nhập Gmail / Email để nhận vé và lưu trữ phần thưởng.'}
            {mode === 'register' && 'Tạo tài khoản tham gia sự kiện và lưu trữ lịch sử nhận thưởng.'}
            {mode === 'forgot' && 'Nhập email để nhận liên kết đặt lại mật khẩu của bạn.'}
          </p>
        </div>

        {/* Content body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Họ và tên hoặc Biệt danh
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nguyễn Thị Mai"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-stone-800 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-stone-800 transition"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Mật khẩu
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setMode('forgot');
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-stone-800 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập ngay</span>
                    </>
                  )}
                  {mode === 'register' && (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Tạo tài khoản & nhận lượt quay</span>
                    </>
                  )}
                  {mode === 'forgot' && (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Gửi email đặt lại mật khẩu</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Social or alternative */}
          {mode !== 'forgot' && (
            <div className="mt-4">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="shrink mx-3 text-xs text-stone-400">hoặc</span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 border border-stone-300 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm hover:shadow cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.2C.7 9.6 0 12.2 0 15s.7 5.4 1.9 7.8l3.7-2.9c-.2-.7-.3-1.4-.3-2.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.2 7.5 23 12 23z"
                  />
                </svg>
                <span>Đăng nhập nhanh với Google</span>
              </button>
            </div>
          )}

          {/* Switch mode */}
          <div className="mt-5 text-center text-xs text-stone-600 dark:text-stone-400">
            {mode === 'login' && (
              <p>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('register');
                  }}
                  className="font-bold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Đăng ký ngay
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="font-bold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Đăng nhập
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                Nhớ mật khẩu?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center justify-center gap-1 mx-auto mt-1"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" /> Quay lại đăng nhập
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
