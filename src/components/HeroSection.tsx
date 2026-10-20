import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Dices, Heart, Quote, RefreshCw, Calendar, Gift } from 'lucide-react';
import { getRandomWish } from '../data/wishes';
import { WishItem } from '../types';
import { useEvent, HolidayId } from '../context/EventContext';
import { playSoftPop } from '../utils/audio';

interface HeroSectionProps {
  onSelectWishForCard: (wish: WishItem) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSelectWishForCard }) => {
  const { activeHoliday, holidayConfig, setActiveHoliday, allHolidays } = useEvent();
  const [featuredWish, setFeaturedWish] = useState<WishItem>(() => getRandomWish());
  const [imgError, setImgError] = useState(false);

  // When active holiday changes, reset img error and refresh featured quote
  useEffect(() => {
    setImgError(false);
    setFeaturedWish(getRandomWish());
  }, [activeHoliday]);

  const handleRefreshQuote = () => {
    setFeaturedWish(getRandomWish());
    playSoftPop();
  };

  const handleSelectHoliday = (id: HolidayId) => {
    setActiveHoliday(id);
    playSoftPop();
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const holidayIcons: Record<HolidayId, string> = {
    '20-10': '🌸',
    '20-11': '🎓',
    '08-03': '🌷',
    'tet': '🧧',
    'valentine': '💖',
  };

  return (
    <section id="hero" className="relative pt-4 pb-12 lg:py-16 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-rose-100/50 via-amber-50/30 to-transparent dark:from-purple-950/20 dark:via-rose-950/10 dark:to-transparent -z-10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Quick Holiday Switcher Bar */}
        <div className="mb-6 flex items-center justify-center lg:justify-start">
          <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 bg-white/90 dark:bg-stone-900/90 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs max-w-full">
            <div className="px-2.5 py-1 text-[11px] font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
              <span>Dịp Lễ:</span>
            </div>
            {allHolidays.map((h) => {
              const isActive = activeHoliday === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleSelectHoliday(h.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-sm scale-102'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-rose-50 dark:hover:bg-stone-800'
                  }`}
                >
                  <span>{holidayIcons[h.id]}</span>
                  <span>{h.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Elegant Tagline */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-purple-100 via-rose-100 to-amber-100 dark:from-purple-950 dark:via-rose-950 dark:to-amber-950 border border-purple-200 dark:border-purple-800 rounded-full text-xs font-bold text-purple-900 dark:text-purple-300 tracking-wide shadow-sm max-w-full text-left">
              <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
              <span className="truncate sm:whitespace-normal">Trường Trung Cấp Công Nghiệp Bách Khoa · {holidayConfig.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-5.5xl text-stone-900 dark:text-stone-100 font-black leading-tight tracking-tight text-balance">
              {activeHoliday === '20-11' ? (
                <>
                  Tri Ân Ngày{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-amber-600 to-emerald-600 dark:from-indigo-300 dark:via-amber-300 dark:to-emerald-300">
                    Nhà Giáo Việt Nam
                  </span>{' '}
                  20/11
                </>
              ) : activeHoliday === 'tet' ? (
                <>
                  Mừng Xuân Bính Ngọ{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-700 via-amber-500 to-yellow-500 dark:from-red-400 dark:via-amber-300 dark:to-yellow-300">
                    Tết Nguyên Đán
                  </span>
                </>
              ) : activeHoliday === '08-03' ? (
                <>
                  Chúc Mừng Ngày{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-purple-600 to-pink-500 dark:from-fuchsia-300 dark:via-purple-300 dark:to-pink-300">
                    Quốc Tế Phụ Nữ
                  </span>{' '}
                  8/3
                </>
              ) : activeHoliday === 'valentine' ? (
                <>
                  Ngọt Ngào Ngày{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-700 via-red-600 to-pink-500 dark:from-rose-400 dark:via-pink-300 dark:to-red-300">
                    Lễ Tình Nhân
                  </span>{' '}
                  14/02
                </>
              ) : (
                <>
                  Chúc mừng ngày{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-800 via-rose-600 to-amber-500 dark:from-purple-300 dark:via-rose-300 dark:to-amber-300">
                    Phụ Nữ Việt Nam
                  </span>{' '}
                  20/10
                </>
              )}
            </h1>

            {/* Emotional Subtitle */}
            <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {holidayConfig.tagline} Tham gia tạo lời chúc AI, mở thiệp điện tử tương tác và quay mã vé dự thưởng nhận lì xì MoMo hấp dẫn!
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                type="button"
                onClick={() => scrollTo('generator')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-purple-700 via-rose-600 to-amber-500 hover:from-purple-800 hover:to-amber-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-300 dark:shadow-rose-950/60 hover:shadow-xl hover:scale-105 active:scale-98 transition-all duration-200 cursor-pointer group"
              >
                <span>Tạo lời chúc AI ({holidayConfig.shortDate})</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
              </button>

              <button
                type="button"
                onClick={() => scrollTo('lucky-wheel')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold text-sm rounded-2xl border-2 border-rose-300 dark:border-rose-800 hover:border-rose-500 shadow-md hover:shadow-lg hover:scale-105 active:scale-98 transition-all duration-200 cursor-pointer"
              >
                <Dices className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Quay Mã Vé Dự Thưởng</span>
              </button>
            </div>

            {/* Featured Quote / Wish Highlight Card */}
            <div className="mt-8 pt-6 border-t-2 border-rose-100 dark:border-rose-900/40">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border-2 border-rose-200/80 dark:border-rose-900/60 shadow-md hover:border-purple-300 hover:shadow-lg transition-all duration-200 relative group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                    <Quote className="w-3.5 h-3.5 text-rose-500" />
                    <span>Gợi ý lời chúc dịp {holidayConfig.shortDate}</span>
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <span className="text-stone-500 dark:text-stone-400 font-normal">{featuredWish.recipient}</span>
                  </div>
                  <button
                    onClick={handleRefreshQuote}
                    className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Đổi lời chúc ngẫu nhiên"
                    aria-label="Đổi lời chúc ngẫu nhiên"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <p className="text-sm text-stone-700 dark:text-stone-300 italic font-serif leading-relaxed line-clamp-3">
                  "{featuredWish.content}"
                </p>

                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-rose-50 dark:border-stone-800">
                  <span className="text-rose-600 dark:text-rose-400 font-medium">#{holidayConfig.ticketPrefix.toLowerCase()}</span>
                  <button
                    onClick={() => onSelectWishForCard(featuredWish)}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                    <span>Dùng làm thiệp</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer decorative halo */}
              <div className="absolute -inset-2 bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 rounded-3xl blur-lg opacity-30 transform -rotate-1" />

              {/* Card Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-rose-100 dark:border-rose-900/60 bg-white dark:bg-stone-900">
                {!imgError ? (
                  <img
                    src={holidayConfig.heroImage}
                    alt={holidayConfig.fullName}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-80 sm:h-96 lg:h-[430px] object-cover object-center transition-transform duration-500 hover:scale-102"
                  />
                ) : (
                  <div className="w-full h-80 sm:h-96 lg:h-[430px] bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 dark:from-stone-900 dark:via-purple-950 dark:to-stone-900 flex flex-col items-center justify-center p-8 text-center">
                    <Heart className="w-16 h-16 text-rose-400 fill-rose-200 mb-4 animate-pulse-subtle" />
                    <h3 className="font-serif text-2xl font-bold text-rose-900 dark:text-rose-200 mb-2">
                      {holidayConfig.fullName}
                    </h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                      {holidayConfig.tagline}
                    </p>
                  </div>
                )}

                {/* Subtle overlay pill at bottom right */}
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-xl border border-rose-100 dark:border-rose-900/60 text-xs flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{holidayIcons[activeHoliday]}</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">{holidayConfig.name}</span>
                  </div>
                  <span className="text-rose-700 dark:text-rose-300 font-semibold">{holidayConfig.shortDate}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
