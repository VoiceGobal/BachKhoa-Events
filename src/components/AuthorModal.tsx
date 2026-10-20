import React, { useEffect } from 'react';
import { X, Mail, School, User, Calendar, Cpu, Heart, Sparkles } from 'lucide-react';

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthorModal: React.FC<AuthorModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-gradient-to-br from-white via-[#FFF8F8] to-[#FFF0F3] rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300/80 overflow-hidden"
      >
        {/* Top vibrant gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
          aria-label="Đóng hộp thoại"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
            <School className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Hồ Sơ Chương Trình
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-1">
              Thông Tin Tác Giả & Đơn Vị Biên Soạn
            </h3>
          </div>
        </div>

        {/* Program Goal & Mission intro */}
        <div className="p-4 rounded-2xl bg-white/90 border border-rose-200/90 shadow-sm text-stone-700 font-serif text-sm leading-relaxed mb-6">
          <p className="italic">
            "Chương trình <strong className="text-rose-700 not-italic">20/10 – Trao lời yêu thương</strong> được xây dựng nhằm tạo không khí vui tươi, gửi lời chúc tốt đẹp và tổ chức hoạt động tương tác trong các sự kiện, lớp học. Website hướng tới việc tôn vinh phụ nữ, khuyến khích sự quan tâm, lòng biết ơn và những lời chúc chân thành."
          </p>
        </div>

        {/* Metadata Cards Grid */}
        <div className="space-y-3.5 mb-6">
          
          {/* Author */}
          <div className="p-3.5 rounded-xl bg-white border border-rose-100 flex items-start gap-3.5 hover:border-rose-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Người biên soạn
              </span>
              <span className="text-base font-bold text-stone-900 font-serif">
                Trịnh Tuấn Cường
              </span>
            </div>
          </div>

          {/* Unit / School */}
          <div className="p-3.5 rounded-xl bg-white border border-purple-100 flex items-start gap-3.5 hover:border-purple-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Đơn vị biên soạn
              </span>
              <span className="text-sm sm:text-base font-bold text-stone-900">
                Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa
              </span>
            </div>
          </div>

          {/* Year & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl bg-white border border-amber-100 flex items-start gap-3 hover:border-amber-300 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Năm biên soạn
                </span>
                <span className="text-sm font-bold text-stone-900">
                  2026
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-rose-100 flex items-start gap-3 hover:border-rose-300 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Email liên hệ
                </span>
                <a
                  href="mailto:cuongtt.ptit@gmail.com"
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline truncate block"
                >
                  cuongtt.ptit@gmail.com
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* AI Attribution Box (Mandatory exact wording) */}
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 mb-6 flex items-start gap-3 text-xs text-purple-900 leading-relaxed">
          <Cpu className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p>
            <strong>Ghi nhận AI:</strong> Website có sử dụng công cụ AI hỗ trợ trong quá trình xây dựng. Nội dung và chức năng cần được người biên soạn kiểm tra trước khi sử dụng chính thức.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-rose-600 to-pink-500 text-white font-semibold text-xs rounded-xl shadow-md hover:from-purple-700 hover:to-pink-600 transition-all cursor-pointer"
          >
            Đóng thông tin
          </button>
        </div>

      </div>
    </div>
  );
};
