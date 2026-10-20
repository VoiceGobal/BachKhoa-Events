import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Menu,
  X,
  Sparkles,
  Heart,
  Shield,
  Info,
  LogIn,
  LogOut,
  User as UserIcon,
  History,
  Sun,
  Moon,
  Camera,
  Gift,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { toggleAmbientMusic, setMuted, getIsMuted, playSoftPop } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useEvent, HolidayId } from '../context/EventContext';

interface HeaderProps {
  onOpenCardModal: () => void;
  onOpenAuthorModal: () => void;
  onOpenAdminModal: () => void;
  onOpenAuthModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenProfileModal: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCardModal,
  onOpenAuthorModal,
  onOpenAdminModal,
  onOpenAuthModal,
  onOpenHistoryModal,
  onOpenProfileModal,
  reducedMotion,
  onToggleReducedMotion,
}) => {
  const { currentUser, userProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeHoliday, holidayConfig, setActiveHoliday, allHolidays } = useEvent();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [eventDropdownOpen, setEventDropdownOpen] = useState<boolean>(false);

  const handleAudioToggle = () => {
    if (getIsMuted()) {
      setMuted(false);
    }
    const playing = toggleAmbientMusic();
    setIsPlaying(playing);
  };

  const handleSelectHoliday = (id: HolidayId) => {
    setActiveHoliday(id);
    setEventDropdownOpen(false);
    playSoftPop();
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 dark:bg-[#15031A]/95 backdrop-blur-md border-b-2 border-rose-200 dark:border-rose-900/60 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-18">
          
          {/* Zone 1: Wordmark Logo (Trường Trung Cấp Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa) & Holiday Selector */}
          <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 sm:gap-2.5 group shrink min-w-0 cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-300 dark:shadow-rose-950 transition-transform group-hover:scale-105 shrink-0">
                <span className="text-base sm:text-lg">{holidayIcons[activeHoliday] || '🌸'}</span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="font-serif font-black text-xs sm:text-sm md:text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-950 via-rose-800 to-amber-700 dark:from-purple-200 dark:via-rose-200 dark:to-amber-200 leading-tight truncate">
                  <span className="hidden sm:inline">TRƯỜNG TRUNG CẤP CÔNG NGHIỆP BÁCH KHOA</span>
                  <span className="sm:hidden">TC CÔNG NGHIỆP BÁCH KHOA</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-rose-700 dark:text-rose-300 font-semibold tracking-wide">
                  <span className="hidden xs:inline">Cổng Sự Kiện</span>
                  <span className="hidden xs:inline text-stone-300 dark:text-stone-600">·</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[130px] sm:max-w-none">{holidayConfig.name}</span>
                </div>
              </div>
            </a>

            {/* Quick Holiday Dropdown Switcher (Compact, non-overflowing) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900/70 border border-rose-300 dark:border-rose-800 text-[11px] sm:text-xs font-bold text-rose-900 dark:text-rose-200 shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                title="Đổi sự kiện ngày lễ"
                aria-label="Đổi sự kiện ngày lễ"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="hidden md:inline text-stone-600 dark:text-stone-400 font-normal">Dịp:</span>
                <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{holidayConfig.shortDate}</span>
                <ChevronDown className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
              </button>

              {eventDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800">
                    Chọn sự kiện ngày lễ
                  </div>
                  <div className="space-y-1 mt-1">
                    {allHolidays.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleSelectHoliday(h.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                          activeHoliday === h.id
                            ? 'bg-rose-500 text-white font-bold shadow-sm'
                            : 'hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{holidayIcons[h.id]}</span>
                          <span>{h.name}</span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeHoliday === h.id ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                          {h.shortDate}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            <button
              onClick={() => scrollTo('hero')}
              className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trang chủ
            </button>
            <button
              onClick={() => scrollTo('spotlight')}
              className="text-amber-700 dark:text-amber-400 font-bold hover:text-amber-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Spotlight</span>
            </button>
            <button
              onClick={() => scrollTo('interactive')}
              className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Hộp quà bí mật
            </button>
            <button
              onClick={() => scrollTo('generator')}
              className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Tạo lời chúc AI
            </button>
            <button
              onClick={() => scrollTo('lucky-wheel')}
              className="text-purple-700 dark:text-purple-300 hover:text-purple-900 font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Gift className="w-3.5 h-3.5 text-rose-600" />
              <span>Quay Vé Trúng Quà</span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded-full font-mono">10k-100k</span>
            </button>
            <button
              onClick={() => scrollTo('library')}
              className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Kho lời chúc
            </button>
            <button
              onClick={onOpenCardModal}
              className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-rose-700 dark:text-rose-400 font-bold"
            >
              Thiệp của bạn
            </button>
            <button
              onClick={onOpenAuthorModal}
              className="text-stone-600 dark:text-stone-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Tác giả</span>
            </button>
          </nav>

          {/* Zone 3: Audio, Theme toggle, User & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
              aria-label="Đổi giao diện Sáng / Tối"
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-amber-400 hover:text-amber-500 transition-all cursor-pointer shadow-sm"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-purple-700" />
              )}
            </button>

            {/* Ambient Sound Toggle */}
            <button
              type="button"
              onClick={handleAudioToggle}
              title={isPlaying ? 'Tắt nhạc du dương' : 'Bật nhạc nền êm dịu'}
              aria-label={isPlaying ? 'Tắt nhạc du dương' : 'Bật nhạc nền êm dịu'}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-sm'
                  : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-stone-900 hover:border-rose-200'
              }`}
            >
              {isPlaying ? (
                <div className="relative flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                </div>
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Reduced motion toggle */}
            <button
              type="button"
              onClick={onToggleReducedMotion}
              title={reducedMotion ? 'Bật hiệu ứng chuyển động' : 'Tắt hiệu ứng chuyển động (tiết kiệm pin)'}
              aria-label="Tùy chỉnh hiệu ứng chuyển động"
              className={`hidden sm:flex p-2 rounded-xl border text-xs items-center gap-1.5 transition-all cursor-pointer ${
                reducedMotion
                  ? 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-100 border-stone-300 dark:border-stone-600'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:text-purple-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold">{reducedMotion ? 'Tĩnh' : 'Hiệu ứng'}</span>
            </button>

            {/* User Profile / Login State */}
            {currentUser ? (
              <div className="hidden lg:flex items-center gap-2 pl-1 border-l border-stone-200 dark:border-stone-700">
                {/* Zalo-style Profile Trigger */}
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition cursor-pointer"
                  title="Mở hồ sơ cá nhân"
                >
                  <span className="text-sm">🌸</span>
                  <span className="max-w-[100px] truncate">{userProfile?.displayName || currentUser.email?.split('@')[0]}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                    {userProfile?.spinsRemaining ?? 3}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onOpenHistoryModal}
                  title="Kho quà và lịch sử quay"
                  className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:text-purple-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  <History className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => signOut()}
                  title="Đăng xuất"
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md transition whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}

            {/* Admin Portal Button */}
            <button
              type="button"
              onClick={onOpenAdminModal}
              title="Cổng quản trị sự kiện trường học"
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-purple-900 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
              <span className="hidden md:inline">Quản trị</span>
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => scrollTo('generator')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 via-rose-600 to-pink-600 rounded-xl hover:opacity-95 shadow-md shadow-rose-300 dark:shadow-rose-950 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Gửi lời chúc ngay</span>
            </button>

            {/* Mobile menu hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-stone-700 dark:text-stone-300 hover:text-rose-600 rounded-lg cursor-pointer"
              aria-label="Mở menu di động"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#FFFDF9] dark:bg-[#1A0420] border-b-2 border-rose-200 dark:border-rose-900/60 px-5 pt-3 pb-6 space-y-3 shadow-xl">
          {/* Mobile User Profile Section */}
          {currentUser ? (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between">
              <div
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfileModal();
                }}
                className="cursor-pointer"
              >
                <p className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                  <span>🌸</span>
                  <span>{userProfile?.displayName || currentUser.email}</span>
                </p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  Lượt quay: <strong>{userProfile?.spinsRemaining ?? 3}</strong> • <span className="underline">Xem hồ sơ</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenHistoryModal();
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-bold text-purple-800 dark:text-purple-200"
                >
                  Kho quà
                </button>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuthModal();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập Gmail / Email nhận vé dự thưởng</span>
            </button>
          )}

          {/* Mobile Holiday Selector Grid */}
          <div className="p-3 bg-rose-50/70 dark:bg-stone-900/80 rounded-2xl border border-rose-200 dark:border-rose-900/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
              Chọn sự kiện ngày lễ
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {allHolidays.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    handleSelectHoliday(h.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition text-left cursor-pointer ${
                    activeHoliday === h.id
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <span className="text-sm shrink-0">{holidayIcons[h.id]}</span>
                  <span className="truncate">{h.shortDate} {h.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col space-y-2 text-stone-800 dark:text-stone-200 font-semibold text-sm">
            <button
              onClick={() => scrollTo('hero')}
              className="text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 cursor-pointer"
            >
              Trang chủ
            </button>
            <button
              onClick={() => scrollTo('spotlight')}
              className="text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-amber-700 dark:text-amber-400 font-bold cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Khoảnh khắc Spotlight {holidayConfig.shortDate}</span>
            </button>
            <button
              onClick={() => scrollTo('interactive')}
              className="text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 cursor-pointer"
            >
              Hộp quà bí mật
            </button>
            <button
              onClick={() => scrollTo('generator')}
              className="text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 cursor-pointer"
            >
              Tạo lời chúc cá nhân hóa
            </button>
            <button
              onClick={() => scrollTo('lucky-wheel')}
              className="text-left py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold cursor-pointer flex items-center justify-between"
            >
              <span>Vòng quay may mắn {holidayConfig.shortDate}</span>
              <span className="text-xs bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded-full font-mono">10k-100k</span>
            </button>
            <button
              onClick={() => scrollTo('library')}
              className="text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 cursor-pointer"
            >
              Kho lời chúc (120+ câu)
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCardModal();
              }}
              className="text-left py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold cursor-pointer"
            >
              Thiệp của bạn
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuthorModal();
              }}
              className="text-left py-2 px-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer flex items-center gap-2"
            >
              <Info className="w-4 h-4 text-purple-600" />
              <span>Thông tin tác giả & đơn vị</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdminModal();
              }}
              className="text-left py-2 px-3 rounded-xl bg-purple-900 text-white font-bold cursor-pointer flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-amber-300" />
              <span>Quản trị viên sự kiện MoMo</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
