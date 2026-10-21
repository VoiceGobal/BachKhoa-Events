import React, { useState, useEffect } from 'react';
import { Flower2, Gift, Mail, Heart, Star, X, Copy, Check, Sparkles } from 'lucide-react';
import { InteractiveObject } from '../types';
import { playChime, playSoftPop } from '../utils/audio';
import { useEvent } from '../context/EventContext';

export const InteractiveItemsSection: React.FC = () => {
  const { holidayConfig, activeHoliday } = useEvent();
  const [selectedItem, setSelectedItem] = useState<InteractiveObject | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  const handleOpenItem = (item: InteractiveObject) => {
    playChime();
    setSelectedItem(item);
    setCopied(false);
  };

  const handleCopyWish = async () => {
    if (!selectedItem) return;
    try {
      await navigator.clipboard.writeText(selectedItem.wishContent);
      playSoftPop();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const renderIcon = (name: string, className = 'w-7 h-7') => {
    switch (name) {
      case 'flower':
        return <Flower2 className={className} />;
      case 'gift':
        return <Gift className={className} />;
      case 'envelope':
        return <Mail className={className} />;
      case 'heart':
        return <Heart className={className} />;
      case 'star':
        return <Star className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const currentItems = holidayConfig?.interactiveItems || [];

  return (
    <section id="interactive" className="py-16 bg-gradient-to-b from-white via-rose-50/40 to-white dark:from-stone-950 dark:via-stone-900/40 dark:to-stone-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 dark:bg-rose-950/60 border border-pink-200 dark:border-rose-900 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Khu Vườn Bất Ngờ · {holidayConfig.name}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Chạm Vào Yêu Thương, Nhận Quà Ý Nghĩa
          </h2>
          <p className="mt-3 text-stone-600 dark:text-stone-400 text-sm sm:text-base">
            Hãy chọn một biểu tượng bí mật bên dưới để đón nhận thông điệp tinh thần dành riêng cho dịp {holidayConfig.shortDate}.
          </p>
        </div>

        {/* 5 Interactive Objects Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {currentItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleOpenItem(item)}
              className={`group relative p-6 rounded-3xl bg-white dark:bg-stone-900 border-2 ${item.borderColor} shadow-md hover:shadow-2xl hover:shadow-purple-300/40 dark:hover:shadow-purple-950/40 transition-all duration-300 hover:-translate-y-2 hover:scale-105 text-center flex flex-col items-center justify-center cursor-pointer overflow-hidden focus:outline-none focus:ring-4 focus:ring-purple-400`}
            >
              {/* Subtle gradient hover wash */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${item.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Icon Container with glowing effect on hover */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-rose-100 dark:from-purple-950 dark:to-rose-950 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-115 group-hover:rotate-6 shadow-md group-hover:shadow-lg group-hover:shadow-rose-300/50">
                {renderIcon(item.iconName, 'w-8 h-8')}
              </div>

              {/* Title & subtitle */}
              <h3 className="relative z-10 font-serif font-black text-base text-stone-900 dark:text-stone-100 group-hover:text-purple-950 dark:group-hover:text-purple-200 transition-colors">
                {item.title}
              </h3>
              <p className="relative z-10 text-xs text-stone-600 dark:text-stone-400 font-medium mt-1 line-clamp-1">
                {item.subtitle}
              </p>

              {/* Tap affordance */}
              <span className="relative z-10 mt-3 text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 group-hover:underline">
                Chạm để mở ✨
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* Popup Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-100 overflow-hidden transform transition-all"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300" />

            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Đóng hộp thoại"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with icon */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                {renderIcon(selectedItem.iconName, 'w-6 h-6')}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                  {selectedItem.title}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-snug">
                  {selectedItem.wishTitle}
                </h3>
              </div>
            </div>

            {/* Message Content */}
            <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-rose-100/80 mb-5 text-stone-700 leading-relaxed font-serif text-sm sm:text-base">
              "{selectedItem.wishContent}"
            </div>

            {/* Practical Advice */}
            <div className="text-xs text-stone-500 italic mb-6">
              💡 {selectedItem.advice}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleCopyWish}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-xs rounded-xl shadow-sm hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép lời chúc</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};
