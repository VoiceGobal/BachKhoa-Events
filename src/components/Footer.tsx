import React from 'react';
import { Heart, ArrowUp, Sparkles, Info, School, Mail, Calendar } from 'lucide-react';
import { useEvent } from '../context/EventContext';

interface FooterProps {
  onOpenAuthorModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAuthorModal }) => {
  const { holidayConfig } = useEvent();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-12 border-t-2 border-purple-900/60 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-40 bg-gradient-to-b from-purple-900/20 via-rose-900/10 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-stone-800">
          
          {/* Brand & Vision */}
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-900/50">
                <Heart className="w-5 h-5 fill-white" />
              </div>
              <span className="font-serif text-2xl font-black text-white tracking-tight">
                {holidayConfig.shortDate} – Trao Lời Yêu Thương
              </span>
            </div>
            <p className="text-stone-400 text-xs sm:text-sm font-serif italic max-w-lg">
              "{holidayConfig.tagline}"
            </p>
          </div>

          {/* Quick Links & Author Trigger */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenAuthorModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-amber-300 border border-purple-600/50 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>Xem Thông Tin Tác Giả & Đơn Vị</span>
            </button>

            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              aria-label="Quay lại đầu trang"
            >
              <span>Lên đầu trang</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Mandatory Official Program Attribution Line (Section 2.A) */}
        <div className="py-6 border-b border-stone-800/80 text-center text-xs sm:text-sm text-stone-300 font-medium leading-relaxed">
          <p className="font-sans">
            <strong className="text-amber-300 font-bold">20/10 – Trao lời yêu thương</strong>
            {' · '}
            Biên soạn: <strong className="text-white font-bold">Trịnh Tuấn Cường</strong>
            {' · '}
            Đơn vị: <strong className="text-purple-300 font-bold">Trường Trung cấp Công nghiệp Bách Khoa</strong>
            {' · '}
            Năm biên soạn: <strong className="text-white font-mono">2026</strong>
          </p>
          <div className="mt-2 text-xs text-stone-400">
            Email liên hệ: <a href="mailto:cuongtt.ptit@gmail.com" className="text-rose-400 hover:underline font-mono">cuongtt.ptit@gmail.com</a>
          </div>
        </div>

        {/* Bottom AI Attribution & Disclaimers */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>
            © 2026 Bản quyền chương trình thuộc về tác giả & đơn vị biên soạn. Có sử dụng công cụ AI hỗ trợ phát triển.
          </p>
          
          <div className="flex items-center gap-2 text-stone-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tôn vinh vẻ đẹp và bản lĩnh người phụ nữ Việt Nam</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
