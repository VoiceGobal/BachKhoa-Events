import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Printer, Share2, Download, Sparkles, Heart, RefreshCw, MailOpen, Edit2 } from 'lucide-react';
import { CardThemeId, CardCustomization } from '../types';
import { playSoftPop, playCelebration } from '../utils/audio';
import lotusImg from '../assets/images/card_lotus_grace_1792461702480.jpg';
import roseImg from '../assets/images/card_rose_romance_1792461702379.jpg';
import teacherCardImg from '../assets/images/card_teachers_gratitude_1792477012977.jpg';

interface GreetingCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    title: string;
    message: string;
    recipient: string;
  };
}

const THEMES: {
  id: CardThemeId;
  name: string;
  desc: string;
  bgClass: string;
  borderClass: string;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
}[] = [
  {
    id: 'elegant',
    name: 'Thanh Lịch',
    desc: 'Champagne & Vàng ánh kim tao nhã',
    bgClass: 'bg-gradient-to-br from-[#FFFDF9] via-[#FAF5EE] to-[#F5ECE0]',
    borderClass: 'border-amber-300/80',
    titleColor: 'text-stone-900',
    bodyColor: 'text-stone-800',
    accentColor: '#D97706',
  },
  {
    id: 'teachers',
    name: 'Tri Ân Thầy Cô',
    desc: 'Hoa vàng, trang giấy & mực tím 20/11',
    bgClass: 'bg-gradient-to-br from-[#FFFDF0] via-[#FEFCE8] to-[#FEF3C7]',
    borderClass: 'border-amber-400',
    titleColor: 'text-amber-950',
    bodyColor: 'text-stone-800',
    accentColor: '#D97706',
  },
  {
    id: 'romantic',
    name: 'Lãng Mạn',
    desc: 'Hồng phấn & Cánh hoa dịu êm',
    bgClass: 'bg-gradient-to-br from-[#FFF5F7] via-[#FCE7F3] to-[#FDF2F8]',
    borderClass: 'border-pink-300',
    titleColor: 'text-rose-950',
    bodyColor: 'text-stone-800',
    accentColor: '#E11D48',
  },
  {
    id: 'vibrant',
    name: 'Trẻ Trung',
    desc: 'Cam đào & Tím Lavender hiện đại',
    bgClass: 'bg-gradient-to-br from-[#FFF7ED] via-[#FAF5FF] to-[#F3E8FF]',
    borderClass: 'border-purple-300',
    titleColor: 'text-purple-950',
    bodyColor: 'text-stone-800',
    accentColor: '#9333EA',
  },
  {
    id: 'regal',
    name: 'Trang Trọng',
    desc: 'Đỏ rượu vang & Hoa sen truyền thống',
    bgClass: 'bg-gradient-to-br from-[#4C0519] via-[#881337] to-[#4C0519]',
    borderClass: 'border-amber-400',
    titleColor: 'text-amber-200',
    bodyColor: 'text-rose-50',
    accentColor: '#F59E0B',
  },
];

export const GreetingCardModal: React.FC<GreetingCardModalProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const [custom, setCustom] = useState<CardCustomization>({
    recipientName: initialData?.recipient || 'Người phụ nữ tôi yêu mến',
    title: initialData?.title || 'Chúc Mừng Ngày 20/10 Rực Rỡ',
    message:
      initialData?.message ||
      'Nhân ngày Phụ nữ Việt Nam 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống.',
    senderName: 'Người gửi yêu thương',
    themeId: 'elegant',
  });

  const [envelopeOpened, setEnvelopeOpened] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [exportingImg, setExportingImg] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sync initialData changes
  useEffect(() => {
    if (initialData) {
      setCustom((prev) => ({
        ...prev,
        recipientName: initialData.recipient || prev.recipientName,
        title: initialData.title || prev.title,
        message: initialData.message || prev.message,
      }));
    }
  }, [initialData]);

  // Handle ESC key
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

  const currentTheme = THEMES.find((t) => t.id === custom.themeId) || THEMES[0];

  const handleCopyText = async () => {
    const fullText = `💌 THIỆP CHÚC MỪNG 20/10\n\nKính gửi: ${custom.recipientName}\n\n${custom.title}\n\n${custom.message}\n\n— Thân ái: ${custom.senderName}\n(20/10 – Trao Lời Yêu Thương)`;
    try {
      await navigator.clipboard.writeText(fullText);
      playSoftPop();
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      //
    }
  };

  const handleCopyLink = async () => {
    try {
      // Encode card parameters in URL hash
      const params = new URLSearchParams();
      params.set('to', custom.recipientName);
      params.set('title', custom.title);
      params.set('msg', custom.message);
      params.set('from', custom.senderName);
      params.set('theme', custom.themeId);

      const shareUrl = `${window.location.origin}${window.location.pathname}#card?${params.toString()}`;
      await navigator.clipboard.writeText(shareUrl);
      playSoftPop();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      //
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export card as PNG using HTML5 Canvas drawing
  const handleDownloadImage = () => {
    setExportingImg(true);
    playSoftPop();

    try {
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background gradient
      const isDark = custom.themeId === 'regal';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (isDark) {
        grad.addColorStop(0, '#4C0519');
        grad.addColorStop(0.5, '#881337');
        grad.addColorStop(1, '#4C0519');
      } else if (custom.themeId === 'romantic') {
        grad.addColorStop(0, '#FFF5F7');
        grad.addColorStop(0.5, '#FCE7F3');
        grad.addColorStop(1, '#FDF2F8');
      } else if (custom.themeId === 'vibrant') {
        grad.addColorStop(0, '#FFF7ED');
        grad.addColorStop(0.5, '#FAF5FF');
        grad.addColorStop(1, '#F3E8FF');
      } else {
        grad.addColorStop(0, '#FFFDF9');
        grad.addColorStop(0.5, '#FAF5EE');
        grad.addColorStop(1, '#F5ECE0');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Gold ornamental border
      ctx.strokeStyle = isDark ? '#F59E0B' : '#D97706';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      ctx.lineWidth = 1;
      ctx.strokeRect(38, 38, width - 76, height - 76);

      // Corner flourishes
      const drawCorner = (cx: number, cy: number) => {
        ctx.fillStyle = isDark ? '#F59E0B' : '#D97706';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCorner(38, 38);
      drawCorner(width - 38, 38);
      drawCorner(38, height - 38);
      drawCorner(width - 38, height - 38);

      // Header Tagline
      ctx.fillStyle = isDark ? '#FDE68A' : '#BE123C';
      ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10', width / 2, 90);

      // Recipient
      ctx.fillStyle = isDark ? '#FED7AA' : '#92400E';
      ctx.font = 'italic 26px "Playfair Display", Georgia, serif';
      ctx.fillText(`Kính gửi: ${custom.recipientName}`, width / 2, 170);

      // Divider line
      ctx.strokeStyle = isDark ? 'rgba(254, 215, 170, 0.4)' : 'rgba(225, 29, 72, 0.2)';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, 205);
      ctx.lineTo(width / 2 + 120, 205);
      ctx.stroke();

      // Card Title
      ctx.fillStyle = isDark ? '#FFFFFF' : '#1C1917';
      ctx.font = 'bold 36px "Playfair Display", Georgia, serif';
      ctx.fillText(custom.title, width / 2, 270);

      // Wrapped Greeting Message
      ctx.fillStyle = isDark ? '#FFE4E6' : '#292524';
      ctx.font = '24px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';

      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let curY = y;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, curY);
            line = words[n] + ' ';
            curY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), x, curY);
        return curY;
      };

      const finalY = wrapText(`"${custom.message}"`, width / 2, 360, width - 160, 42);

      // Sender sign-off
      ctx.fillStyle = isDark ? '#FDE68A' : '#BE123C';
      ctx.font = 'italic bold 24px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'right';
      ctx.fillText(`— ${custom.senderName}`, width - 100, Math.min(finalY + 90, height - 120));

      // Footer brand mark
      ctx.fillStyle = isDark ? '#FDA4AF' : '#78716C';
      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('20/10 · Trao Lời Yêu Thương', width / 2, height - 55);

      // Download triggered
      const imgUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `thiep-20-10-${custom.recipientName.replace(/\s+/g, '-')}.png`;
      link.href = imgUrl;
      link.click();
      playCelebration();
    } catch {
      //
    } finally {
      setExportingImg(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-[#FFFDF9] shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
              Thiệp Chúc Mừng 20/10 Điện Tử
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ thiệp"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split Controls & Card Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Theme Picker & Text Editor (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Chọn phong cách mẫu thiệp:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCustom({ ...custom, themeId: theme.id })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      custom.themeId === theme.id
                        ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/50'
                        : 'border-stone-200 hover:border-rose-200 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-stone-900">{theme.name}</div>
                    <div className="text-[11px] text-stone-500 line-clamp-1">{theme.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customizer Inputs */}
            <div className="space-y-3 bg-[#FFFDF9] p-4 rounded-2xl border border-rose-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700">Tùy biến nội dung thiệp</span>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditing ? 'Thu gọn' : 'Chỉnh sửa'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1">
                  Tên người nhận (To):
                </label>
                <input
                  type="text"
                  value={custom.recipientName}
                  onChange={(e) => setCustom({ ...custom, recipientName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1">
                  Tiêu đề thiệp:
                </label>
                <input
                  type="text"
                  value={custom.title}
                  onChange={(e) => setCustom({ ...custom, title: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {isEditing && (
                <div>
                  <label className="block text-[11px] font-medium text-stone-500 mb-1">
                    Nội dung lời chúc:
                  </label>
                  <textarea
                    rows={4}
                    value={custom.message}
                    onChange={(e) => setCustom({ ...custom, message: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-400 font-serif"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1">
                  Người gửi (From):
                </label>
                <input
                  type="text"
                  value={custom.senderName}
                  onChange={(e) => setCustom({ ...custom, senderName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>
            </div>

            {/* Envelope Toggle Animation button */}
            <div className="flex items-center justify-between text-xs text-stone-600 px-1">
              <span>Hiệu ứng mở phong bì:</span>
              <button
                type="button"
                onClick={() => setEnvelopeOpened(!envelopeOpened)}
                className="font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <MailOpen className="w-3.5 h-3.5" />
                <span>{envelopeOpened ? 'Đóng phong bì' : 'Mở phong bì'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Interactive Card Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            {/* The Printable / Viewable Card */}
            <div
              id="printable-card"
              ref={cardRef}
              className={`w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-xl border-4 ${currentTheme.borderClass} ${currentTheme.bgClass} relative overflow-hidden transition-all duration-300 min-h-[460px] flex flex-col justify-between`}
            >
              {/* Corner Ornaments */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

              {/* Watermark / delicate motif in corner */}
              {custom.themeId === 'regal' && (
                <div className="absolute -bottom-8 -right-8 w-44 h-44 opacity-20 pointer-events-none overflow-hidden rounded-full">
                  <img src={lotusImg} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {custom.themeId === 'romantic' && (
                <div className="absolute -bottom-8 -right-8 w-44 h-44 opacity-15 pointer-events-none overflow-hidden rounded-full">
                  <img src={roseImg} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {custom.themeId === 'teachers' && (
                <div className="absolute -bottom-8 -right-8 w-48 h-48 opacity-25 pointer-events-none overflow-hidden rounded-full">
                  <img src={teacherCardImg} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Card Header */}
              <div className="text-center mb-4 relative z-10">
                <span className="text-[10px] sm:text-xs tracking-widest font-bold uppercase opacity-75 font-sans">
                  Kỷ Niệm Ngày Lễ · Trao Gửi Yêu Thương
                </span>
                <div className="text-xs sm:text-sm italic font-serif mt-1 opacity-90">
                  Thân gửi: <span className="font-bold underline">{custom.recipientName}</span>
                </div>
                <div className="w-12 h-0.5 bg-amber-400/60 mx-auto mt-2" />
              </div>

              {/* Main Greeting Content */}
              <div className="my-auto py-2 text-center relative z-10">
                <h4 className={`font-serif text-xl sm:text-2xl font-bold leading-snug mb-3 ${currentTheme.titleColor}`}>
                  {custom.title}
                </h4>
                <p className={`font-serif text-sm sm:text-base leading-relaxed ${currentTheme.bodyColor} italic`}>
                  "{custom.message}"
                </p>
              </div>

              {/* Card Footer: Signature & Brand */}
              <div className="pt-4 border-t border-amber-400/30 flex items-center justify-between text-xs relative z-10">
                <div className="text-[11px] opacity-70">
                  20/10 – Trao Lời Yêu Thương
                </div>
                <div className="text-right">
                  <span className="text-[11px] opacity-75 block">Thân ái,</span>
                  <span className="font-serif font-bold text-sm">{custom.senderName}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Action Bar */}
        <div className="px-6 py-4 bg-stone-50 border-t border-rose-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Copy full text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors cursor-pointer shadow-sm"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Đã sao chép' : 'Chép nội dung'}</span>
            </button>

            {/* Copy shareable link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors cursor-pointer shadow-sm"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Đã sao chép link!' : 'Lấy link thiệp'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Card button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In thiệp</span>
            </button>

            {/* Download Image button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={exportingImg}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-semibold rounded-xl shadow-sm shadow-rose-200 transition-all cursor-pointer disabled:opacity-70"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingImg ? 'Đang xuất ảnh...' : 'Lưu ảnh thiệp (PNG)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
