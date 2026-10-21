import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  ChevronRight,
  Wand2,
  BookOpen,
  Send,
  HelpCircle
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
  
  // Desktop expandable menus (multi-level)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Mobile expandable accordion sections
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>('holidays');

  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAudioToggle = () => {
    if (getIsMuted()) {
      setMuted(false);
    }
    const playing = toggleAmbientMusic();
    setIsPlaying(playing);
  };

  const handleSelectHoliday = (id: HolidayId) => {
    setActiveHoliday(id);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    playSoftPop();
  };

  const scrollTo = (id: string) => {
    setActiveDropdown(null);
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
    <header ref={navRef} className="sticky top-0 z-40 bg-[#FFFDF9]/95 dark:bg-[#15031A]/95 backdrop-blur-md border-b-2 border-rose-200 dark:border-rose-900/60 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-18">
          
          {/* ZONE 1: BRAND LOGO */}
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
                  <span className="hidden sm:inline">TRƯỜNG TC CÔNG NGHIỆP BÁCH KHOA</span>
                  <span className="sm:hidden">TC BÁCH KHOA</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-rose-700 dark:text-rose-300 font-semibold tracking-wide">
                  <span className="truncate max-w-[140px] sm:max-w-none text-amber-600 dark:text-amber-400 font-bold">{holidayConfig.name}</span>
                </div>
              </div>
            </a>
          </div>

          {/* ZONE 2: DESKTOP MULTI-LEVEL EXPANDABLE NAVIGATION MENU */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
            
            {/* Level 1 Item: Trang chủ */}
            <button
              type="button"
              onClick={() => scrollTo('hero')}
              className="px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-stone-800 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
            >
              Trang chủ
            </button>

            {/* Level 1 Submenu: Tương tác & Quà tặng (Auto expandable dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'interactive' ? null : 'interactive')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition cursor-pointer ${
                  activeDropdown === 'interactive'
                    ? 'bg-rose-100/80 dark:bg-stone-800 text-rose-700 dark:text-rose-300 shadow-2xs'
                    : 'hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Trải Nghiệm</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'interactive' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'interactive' && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800">
                    Trải nghiệm & Nhận quà
                  </div>
                  <div className="space-y-1 mt-1">
                    <button
                      type="button"
                      onClick={() => scrollTo('lucky-wheel')}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left cursor-pointer transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>Vòng Quay MoMo</span>
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 px-1.5 py-0.2 rounded-full font-mono">10k-100k</span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Quay số nhận thưởng ví MoMo chính thức</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollTo('interactive')}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left cursor-pointer transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Hộp Quà Bí Mật</div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Mở lời nhắn và biểu tượng may mắn</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollTo('spotlight')}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left cursor-pointer transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Khoảnh Khắc Spotlight</div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Góc ảnh kỷ niệm & tôn vinh rực rỡ</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Level 1 Submenu: Lời chúc & Thiệp Mừng (Auto expandable dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'wishes' ? null : 'wishes')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition cursor-pointer ${
                  activeDropdown === 'wishes'
                    ? 'bg-rose-100/80 dark:bg-stone-800 text-rose-700 dark:text-rose-300 shadow-2xs'
                    : 'hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Lời Chúc & Thiệp</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'wishes' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'wishes' && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800">
                    Lời chúc & Thiệp điện tử
                  </div>
                  <div className="space-y-1 mt-1">
                    <button
                      type="button"
                      onClick={() => scrollTo('generator')}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left cursor-pointer transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Wand2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Tạo Lời Chúc AI</div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Tùy biến ngắn gọn, vừa vặn, sâu sắc</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => scrollTo('library')}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-left cursor-pointer transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Kho Lời Chúc 120+</div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Tuyển tập chọn lọc theo đối tượng</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        onOpenCardModal();
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left cursor-pointer transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">Thiệp Điện Tử Cao Cấp</div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Mở và tải thiệp tương tác tức thì</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Level 1 Submenu: Đổi Sự Kiện Ngày Lễ (Expandable Multi-Holiday Dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'holidays' ? null : 'holidays')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs xl:text-sm font-bold border transition cursor-pointer ${
                  activeDropdown === 'holidays'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900/70 hover:bg-rose-100'
                }`}
              >
                <span>{holidayIcons[activeHoliday]}</span>
                <span className="font-mono">{holidayConfig.shortDate}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'holidays' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'holidays' && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800">
                    Chọn sự kiện ngày lễ
                  </div>
                  <div className="space-y-1 mt-1">
                    {allHolidays.map((h) => {
                      const isSel = activeHoliday === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => handleSelectHoliday(h.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                            isSel
                              ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-xs'
                              : 'hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base">{holidayIcons[h.id]}</span>
                            <span>{h.name}</span>
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSel ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'}`}>
                            {h.shortDate}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Level 1 Submenu: Thông Tin & Quản Trị */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'info' ? null : 'info')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition cursor-pointer ${
                  activeDropdown === 'info'
                    ? 'bg-rose-100/80 dark:bg-stone-800 text-rose-700 dark:text-rose-300'
                    : 'hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-stone-500" />
                <span>Hệ Thống</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'info' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'info' && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        onOpenAuthorModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 text-left cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-purple-600" />
                      <span>Thông tin Tác giả & Đơn vị</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        onOpenAdminModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-bold text-purple-900 dark:text-purple-200 text-left cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                      <span>Cổng Quản Trị MoMo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </nav>

          {/* ZONE 3: ACTIONS & CONTROLS */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
              aria-label="Đổi giao diện Sáng / Tối"
              className="p-2 sm:p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-amber-400 hover:text-amber-500 transition cursor-pointer shadow-2xs"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
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
              className={`p-2 sm:p-2.5 rounded-xl border transition cursor-pointer shadow-2xs ${
                isPlaying
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-stone-900'
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

            {/* User Profile / Auth State */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-stone-200 dark:border-stone-700">
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 text-xs font-bold transition cursor-pointer"
                  title="Mở hồ sơ cá nhân"
                >
                  <span>🌸</span>
                  <span className="max-w-[80px] md:max-w-[110px] truncate">{userProfile?.displayName || currentUser.email?.split('@')[0]}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono">
                    {userProfile?.spinsRemaining ?? 3}
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md transition whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-700 dark:text-stone-300 hover:text-rose-600 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              aria-label="Mở menu di động"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE EXPANDABLE DRAWER WITH BACKDROP CLICK-TO-CLOSE */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop click to close */}
          <div
            className="fixed inset-0 top-18 bg-black/60 backdrop-blur-xs z-30 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative z-40 lg:hidden bg-[#FFFDF9] dark:bg-[#1A0420] border-b-2 border-rose-200 dark:border-rose-900/60 px-4 pt-3 pb-6 max-h-[82vh] overflow-y-auto space-y-3 shadow-2xl">
            
            {/* User card if logged in */}
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
                    <span className="truncate max-w-[160px]">{userProfile?.displayName || currentUser.email}</span>
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
                    className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-bold text-purple-800 dark:text-purple-200 cursor-pointer"
                  >
                    Kho quà
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
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
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập nhận vé dự thưởng MoMo</span>
              </button>
            )}

            {/* Accordion 1: Chọn Sự Kiện Ngày Lễ (Expandable) */}
            <div className="border border-rose-200 dark:border-rose-900/60 rounded-2xl overflow-hidden bg-rose-50/50 dark:bg-stone-900/60">
              <button
                type="button"
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'holidays' ? null : 'holidays')}
                className="w-full flex items-center justify-between p-3 text-xs font-bold text-rose-900 dark:text-rose-200 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span>Sự Kiện Ngày Lễ (Đang chọn: {holidayConfig.shortDate})</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'holidays' ? 'rotate-180' : ''}`} />
              </button>

              {mobileExpandedSection === 'holidays' && (
                <div className="p-2 pt-0 grid grid-cols-2 gap-1.5 border-t border-rose-100 dark:border-rose-900/40">
                  {allHolidays.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => handleSelectHoliday(h.id)}
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
              )}
            </div>

            {/* Accordion 2: Trải Nghiệm & Vòng Quay (Expandable) */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900">
              <button
                type="button"
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'experience' ? null : 'experience')}
                className="w-full flex items-center justify-between p-3 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <span>Trải Nghiệm & Nhận Quà</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'experience' ? 'rotate-180' : ''}`} />
              </button>

              {mobileExpandedSection === 'experience' && (
                <div className="p-2 pt-0 space-y-1 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => scrollTo('lucky-wheel')}
                    className="w-full text-left py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>Vòng quay may mắn {holidayConfig.shortDate}</span>
                    <span className="text-[10px] bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded-full font-mono">10k-100k</span>
                  </button>
                  <button
                    onClick={() => scrollTo('interactive')}
                    className="w-full text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Hộp quà bí mật
                  </button>
                  <button
                    onClick={() => scrollTo('spotlight')}
                    className="w-full text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-stone-800 text-amber-700 dark:text-amber-400 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Khoảnh khắc Spotlight {holidayConfig.shortDate}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Accordion 3: Lời Chúc & Thiệp Mừng (Expandable) */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900">
              <button
                type="button"
                onClick={() => setMobileExpandedSection(mobileExpandedSection === 'wishes' ? null : 'wishes')}
                className="w-full flex items-center justify-between p-3 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-600" />
                  <span>Lời Chúc & Thiệp Điện Tử</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'wishes' ? 'rotate-180' : ''}`} />
              </button>

              {mobileExpandedSection === 'wishes' && (
                <div className="p-2 pt-0 space-y-1 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => scrollTo('generator')}
                    className="w-full text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Tạo lời chúc AI cá nhân hóa
                  </button>
                  <button
                    onClick={() => scrollTo('library')}
                    className="w-full text-left py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Kho lời chúc 120+ mẫu tuyển chọn
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCardModal();
                    }}
                    className="w-full text-left py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Thiệp chúc mừng điện tử
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons: Tác giả & Quản trị */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthorModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Info className="w-4 h-4 text-purple-600" />
                <span>Thông tin Tác giả & Nhà trường</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminModal();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-900 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span>Cổng Quản Trị Hệ Thống MoMo</span>
              </button>
            </div>

          </div>
        </>
      )}
    </header>
  );
};
