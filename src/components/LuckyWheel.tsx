import React, { useState, useRef, useEffect } from 'react';
import {
  Dices,
  Sparkles,
  X,
  Copy,
  Check,
  RotateCw,
  Trophy,
  Ticket,
  ShieldCheck,
  Phone,
  AlertCircle,
  LogIn,
  History,
  Gift,
  Flame,
  UserCheck,
  SearchCheck,
  CheckCircle2,
  Sparkle,
  Search
} from 'lucide-react';
import { playWheelTick, playSuspensePulse, playCelebration, playSoftPop } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import { useAuth } from '../context/AuthContext';
import { useEvent, HolidayId } from '../context/EventContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GetTicketModal } from './GetTicketModal';

interface LuckyWheelProps {
  onOpenCardWithWish: (title: string, message: string, recipient: string) => void;
  onOpenClaimModal: (claimCode: string, amount: number, ticketCode?: string) => void;
  onOpenAuthModal: () => void;
  onOpenHistoryModal: () => void;
}

export interface WheelSlice {
  id: number;
  label: string;
  subLabel: string;
  badge: string;
  color: string;
  textColor: string;
  isCash: boolean;
  amount: number;
  wish: string;
}

// Event-specific slices
export const getHolidaySlices = (holiday: HolidayId): WheelSlice[] => {
  if (holiday === '20-11') {
    return [
      { id: 0, label: '10.000đ', subLabel: 'Ví MoMo', badge: '💵', color: '#4338CA', textColor: '#FFFFFF', isCash: true, amount: 10000, wish: 'Chúc mừng bạn trúng giải thưởng 10.000đ ví MoMo từ sự kiện Tri Ân Thầy Cô 20/11!' },
      { id: 1, label: 'Bụi Phấn', subLabel: 'Kỷ Niệm', badge: '📖', color: '#D97706', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Bụi phấn rơi trên bục giảng, kính chúc Thầy Cô luôn dồi dào sức khỏe và ngập tràn niềm vui trồng người!' },
      { id: 2, label: '20.000đ', subLabel: 'Ví MoMo', badge: '💵', color: '#059669', textColor: '#FFFFFF', isCash: true, amount: 20000, wish: 'Tuyệt vời! Bạn trúng lì xì 20.000đ ví MoMo nhân ngày Nhà Giáo Việt Nam 20/11!' },
      { id: 3, label: 'Tri Thức', subLabel: 'Ươm Mầm', badge: '✨', color: '#7C3AED', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Kính chúc quý Thầy Cô luôn giữ trọn ngọn lửa đam mê, dẫn lối bao thế hệ học trò đến bến bờ thành công!' },
      { id: 4, label: '50.000đ', subLabel: 'Ví MoMo', badge: '💵', color: '#DC2626', textColor: '#FFFFFF', isCash: true, amount: 50000, wish: 'Chúc mừng bạn đã trúng giải thưởng 50.000đ vào ví MoMo từ chương trình 20/11!' },
      { id: 5, label: 'Điểm 10', subLabel: 'Tri Ân', badge: '💯', color: '#EA580C', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Đóa hoa điểm 10 rực rỡ nhất dâng tặng công ơn dưỡng dục của Thầy Cô kính yêu!' },
      { id: 6, label: '100.000đ', subLabel: 'Giải Đặc Biệt', badge: '👑', color: '#BE123C', textColor: '#FFFFFF', isCash: true, amount: 100000, wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ ví MoMo từ sự kiện 20/11!' },
      { id: 7, label: 'Kính Chúc', subLabel: 'Thầy Cô', badge: '💐', color: '#1E40AF', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Tri ân sâu sắc đến những người lái đò thầm lặng đưa bao thế hệ học sinh cập bến vinh quang!' },
    ];
  }

  if (holiday === 'tet') {
    return [
      { id: 0, label: '10.000đ', subLabel: 'Lì Xì Xuân', badge: '🧧', color: '#DC2626', textColor: '#FFFFFF', isCash: true, amount: 10000, wish: 'Khai xuân như ý! Bạn trúng lì xì 10.000đ ví MoMo đầu năm mới!' },
      { id: 1, label: 'Bình An', subLabel: 'An Khang', badge: '🌸', color: '#EA580C', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Cầu chúc gia quyến năm mới dồi dào sức khỏe, vạn sự hanh thông, thân tâm an lạc!' },
      { id: 2, label: '20.000đ', subLabel: 'Lì Xì Xuân', badge: '🧧', color: '#D97706', textColor: '#FFFFFF', isCash: true, amount: 20000, wish: 'Chúc mừng bạn trúng lộc xuân 20.000đ chuyển khoản qua ví MoMo!' },
      { id: 3, label: 'Tài Lộc', subLabel: 'Phát Tài', badge: '💰', color: '#16A34A', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Năm mới tiền vào như nước, kinh doanh tấn tới, thuận buồm xuôi gió mọi nẻo đường!' },
      { id: 4, label: '50.000đ', subLabel: 'Lì Xì Xuân', badge: '🧧', color: '#BE123C', textColor: '#FFFFFF', isCash: true, amount: 50000, wish: 'Đại cát đại lợi! Bạn đã trúng lộc Tết 50.000đ vào ví MoMo!' },
      { id: 5, label: 'Thịnh Vượng', subLabel: 'Sum Vầy', badge: '🏮', color: '#9333EA', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Chúc bạn và gia đình một cái Tết sum vầy ấm cúng, đong đầy tiếng cười và hạnh phúc!' },
      { id: 6, label: '100.000đ', subLabel: 'Giải Đại Cát', badge: '👑', color: '#B91C1C', textColor: '#FFFFFF', isCash: true, amount: 100000, wish: 'Xuất sắc! Bạn trúng GIẢI ĐẠI CÁT 100.000đ lì xì ví MoMo đón xuân tài lộc!' },
      { id: 7, label: 'Xuân Vui', subLabel: 'Cát Tường', badge: '✨', color: '#C026D3', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Năm mới khởi sắc, vạn sự cát tường, phúc lộc thọ toàn cùng gia đạo!' },
    ];
  }

  // Default: 20/10 and 08/03 (Vietnamese Women)
  return [
    { id: 0, label: '10.000đ', subLabel: 'Ví MoMo', badge: '💵', color: '#7C3AED', textColor: '#FFFFFF', isCash: true, amount: 10000, wish: 'Chúc mừng bạn đã trúng thưởng 10.000đ chuyển khoản qua ví MoMo!' },
    { id: 1, label: 'Bình An', subLabel: 'Sức Khỏe', badge: '🌸', color: '#DC2626', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Chúc bạn thân tâm an lạc, dồi dào sức khỏe và luôn an yên trong cuộc sống!' },
    { id: 2, label: '20.000đ', subLabel: 'Ví MoMo', badge: '💵', color: '#EA580C', textColor: '#FFFFFF', isCash: true, amount: 20000, wish: 'Chúc mừng bạn trúng lì xì 20.000đ ví MoMo từ chương trình trao yêu thương!' },
    { id: 3, label: 'Tự Tin', subLabel: 'Tỏa Sáng', badge: '✨', color: '#9333EA', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Chúc bạn luôn tự tin, kiêu hãnh và nở rộ rực rỡ trên mọi chặng đường!' },
    { id: 4, label: '50.000đ', subLabel: 'Ví MoMo', badge: '💵', color: '#E11D48', textColor: '#FFFFFF', isCash: true, amount: 50000, wish: 'Tuyệt vời! Bạn đã trúng giải thưởng 50.000đ vào ví MoMo!' },
    { id: 5, label: 'Hạnh Phúc', subLabel: 'Ngập Tràn', badge: '❤️', color: '#D97706', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Chúc mỗi ngày của bạn đều đong đầy yêu thương, ngập tràn tiếng cười!' },
    { id: 6, label: '100.000đ', subLabel: 'Giải Đặc Biệt', badge: '👑', color: '#C026D3', textColor: '#FFFFFF', isCash: true, amount: 100000, wish: 'Vỡ òa! Bạn đã trúng GIẢI ĐẶC BIỆT 100.000đ chuyển khoản ví MoMo!' },
    { id: 7, label: 'Tri Ân Vàng', subLabel: 'Lời Chúc', badge: '🌹', color: '#BE123C', textColor: '#FFFFFF', isCash: false, amount: 0, wish: 'Một đóa hoa tươi thắm và lời tri ân sâu sắc nhất gửi đến bạn nhân dịp đặc biệt này!' },
  ];
};

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  onOpenCardWithWish,
  onOpenClaimModal,
  onOpenAuthModal,
  onOpenHistoryModal,
}) => {
  const { currentUser, userProfile, decrementUserSpin } = useAuth();
  const { activeHoliday, holidayConfig } = useEvent();

  const slices = getHolidaySlices(activeHoliday);

  const [ticketInput, setTicketInput] = useState<string>('');
  const [ticketStatus, setTicketStatus] = useState<{
    checked: boolean;
    valid: boolean;
    msg: string;
  } | null>(null);
  const [checkingTicket, setCheckingTicket] = useState<boolean>(false);
  const [generatingQuickTicket, setGeneratingQuickTicket] = useState<boolean>(false);
  const [isGetTicketModalOpen, setIsGetTicketModalOpen] = useState<boolean>(false);
  const [publicTickets, setPublicTickets] = useState<string[]>([]);

  const [spinning, setSpinning] = useState<boolean>(false);
  const [needleVibrating, setNeedleVibrating] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [remainingPrizesCount, setRemainingPrizesCount] = useState<number>(20);
  const [totalBudget, setTotalBudget] = useState<number>(500000);

  // Winning result
  const [winningData, setWinningData] = useState<{
    label: string;
    subLabel?: string;
    wishMessage: string;
    prizeAmount: number;
    claimCode?: string;
    ticketCode?: string;
    isDemo?: boolean;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Claim tracking search
  const [lookupCode, setLookupCode] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<{
    claimCode: string;
    amount: number;
    status: string;
    fullName?: string;
    maskedPhone?: string;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>('');

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const spinTimeoutsRef = useRef<number[]>([]);

  // Fetch event info and sample available tickets
  useEffect(() => {
    fetch('/api/event/info')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.remainingPrizes === 'number') {
          setRemainingPrizesCount(data.remainingPrizes);
        }
        if (data && typeof data.totalBudget === 'number') {
          setTotalBudget(data.totalBudget);
        }
      })
      .catch(() => {});

    // Fetch active sample tickets for the current holiday
    fetch(`/api/spin/public-tickets?prefix=${holidayConfig.ticketPrefix}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.tickets?.length) {
          setPublicTickets(data.tickets);
        } else {
          setPublicTickets(holidayConfig.sampleTickets);
        }
      })
      .catch(() => {
        setPublicTickets(holidayConfig.sampleTickets);
      });
  }, [activeHoliday, holidayConfig]);

  // Cleanup audio/animation timers on unmount
  useEffect(() => {
    return () => {
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Quick ticket checker
  const handleCheckTicket = async () => {
    const code = ticketInput.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Vui lòng nhập mã vé trước khi kiểm tra.');
      return;
    }
    setErrorMsg('');
    setCheckingTicket(true);
    setTicketStatus(null);

    try {
      const res = await fetch('/api/spin/check-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: code }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setTicketStatus({
          checked: true,
          valid: true,
          msg: data.message || `Mã vé "${code}" hợp lệ! Bấm "Quay Số Bằng Mã Vé" để tham gia nhận thưởng.`,
        });
        playSoftPop();
      } else {
        setTicketStatus({
          checked: true,
          valid: false,
          msg: data.error || `Mã vé "${code}" không hợp lệ hoặc đã qua sử dụng.`,
        });
      }
    } catch {
      setTicketStatus({
        checked: true,
        valid: false,
        msg: 'Không thể kết nối máy chủ kiểm tra vé.',
      });
    } finally {
      setCheckingTicket(false);
    }
  };

  const handleSpin = async (forceDemo = false) => {
    if (spinning) return;

    const hasTicket = Boolean(ticketInput.trim());

    // REQUIREMENT: Allow spinning with ticket WITHOUT login!
    // If user has NO ticket, is NOT logged in, and NOT demo -> auto issue a quick ticket or guide them
    if (!currentUser && !hasTicket && !forceDemo) {
      setErrorMsg('Vui lòng nhập mã vé dự thưởng để tham gia. Nếu chưa có mã vé, quý vị bấm "Lấy vé nhanh" để đăng nhập Gmail nhận vé hoặc liên hệ Ban Tổ Chức.');
      setIsGetTicketModalOpen(true);
      return;
    }

    const spinsLeft = userProfile?.spinsRemaining ?? 3;
    if (!forceDemo && !hasTicket && currentUser && spinsLeft <= 0) {
      setErrorMsg('Tài khoản đã dùng hết 3 lượt quay! Hãy nhập mã vé dự thưởng từ trường để tiếp tục rinh quà MoMo.');
      return;
    }

    setErrorMsg('');
    setWinningData(null);
    setCopiedCode(false);

    try {
      setSpinning(true);
      setNeedleVibrating(true);

      let targetIndex = 0;
      let label = '';
      let subLabel = '';
      let wishMessage = '';
      let prizeAmount = 0;
      let claimCode: string | undefined = undefined;
      let ticketCode: string | undefined = undefined;
      let isDemoResult = forceDemo;

      if (hasTicket || forceDemo) {
        // Spin authoritative ticket or demo via server
        const res = await fetch('/api/spin/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketCode: ticketInput.trim(),
            isDemo: forceDemo,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setSpinning(false);
          setNeedleVibrating(false);
          setErrorMsg(data.error || 'Lỗi khi quay số.');
          return;
        }

        targetIndex = typeof data.segmentIndex === 'number' ? data.segmentIndex % 8 : 0;
        const matchingSlice = slices[targetIndex];
        label = matchingSlice.label;
        subLabel = matchingSlice.subLabel;
        wishMessage = data.wishMessage || matchingSlice.wish;
        prizeAmount = data.prizeAmount || matchingSlice.amount;
        claimCode = data.claimCode;
        ticketCode = data.ticketCode;
        isDemoResult = Boolean(data.isDemo);

        // Update ticket status
        if (ticketStatus?.valid) {
          setTicketStatus({
            checked: true,
            valid: false,
            msg: `Vé "${ticketInput.trim().toUpperCase()}" đã được dùng thành công.`,
          });
        }
      } else {
        // Lượt quay miễn phí: server quyết định kết quả và đếm lượt (chỉ lời chúc, không có tiền)
        const idToken = await currentUser!.getIdToken();
        const res = await fetch('/api/spin/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Firebase-Id-Token': idToken },
          body: '{}',
        });
        const data = await res.json();
        if (!res.ok) {
          setSpinning(false);
          setNeedleVibrating(false);
          setErrorMsg(data.error || 'Không thể thực hiện lượt quay miễn phí.');
          return;
        }
        try {
          await decrementUserSpin(); // chỉ để cập nhật số lượt hiển thị trên hồ sơ
        } catch (err) {
          console.warn('Could not sync spin count to profile:', err);
        }
        targetIndex = typeof data.segmentIndex === 'number' ? data.segmentIndex % 8 : 0;
        label = slices[targetIndex].label;
        subLabel = slices[targetIndex].subLabel;
        wishMessage = data.wishMessage || slices[targetIndex].wish;
        prizeAmount = 0;
      }

      // Mathematical rotation alignment (needle at 12 o'clock, 0 degrees)
      const fullSpins = 360 * (7 + Math.floor(Math.random() * 2));
      const targetDegree = (360 - targetIndex * 45) % 360;
      const currentMod = rotation % 360;
      const rotationDelta = fullSpins + (360 - currentMod) + targetDegree;
      const newTotalRotation = rotation + rotationDelta;

      setRotation(newTotalRotation);

      // Sound ticks progression
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
      spinTimeoutsRef.current = [];

      const tickDelays = [
        60, 120, 180, 230, 275, 315, 350, 385, 415, 445, 475, 505,
        535, 565, 600, 640, 680, 730, 790, 860, 940, 1030, 1130, 1240,
        1360, 1490, 1630, 1780, 1940, 2110, 2300, 2510, 2740, 3000, 3300, 3650, 4050, 4450
      ];

      tickDelays.forEach((delay, idx) => {
        const timer = window.setTimeout(() => {
          const pitch = Math.max(0.7, 1.2 - (idx / tickDelays.length) * 0.5);
          playWheelTick(pitch);

          if (idx >= tickDelays.length - 4) {
            playSuspensePulse();
          }
        }, delay);
        spinTimeoutsRef.current.push(timer);
      });

      // Settle after 4.8s
      const finishTimer = window.setTimeout(async () => {
        setSpinning(false);
        setNeedleVibrating(false);

        const resultObj = {
          label,
          subLabel,
          wishMessage,
          prizeAmount,
          claimCode,
          ticketCode,
          isDemo: isDemoResult,
        };
        setWinningData(resultObj);

        // Record spin into Cloud Firestore if logged in
        if (currentUser && !isDemoResult) {
          try {
            const spinId = `spin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const spinDocRef = doc(db, 'spins', spinId);
            await setDoc(spinDocRef, {
              id: spinId,
              userId: currentUser.uid,
              userEmail: currentUser.email || '',
              segmentIndex: targetIndex,
              label,
              wishMessage,
              prizeAmount,
              isCashPrize: prizeAmount > 0,
              claimCode: claimCode || '',
              claimed: false,
              createdAt: new Date().toISOString(),
            });
          } catch (fireErr) {
            console.warn('Could not save spin record to Firestore:', fireErr);
          }
        }

        playCelebration();
        triggerConfetti();

        // If it's a cash prize, open Claim Modal after 1.8s so user can enter receiver information!
        if (claimCode && prizeAmount > 0 && !isDemoResult) {
          setTimeout(() => {
            onOpenClaimModal(claimCode, prizeAmount, ticketCode);
          }, 1800);
        }
      }, 4800);

      spinTimeoutsRef.current.push(finishTimer);
    } catch {
      setSpinning(false);
      setNeedleVibrating(false);
      setErrorMsg('Đã có lỗi xảy ra khi thực hiện vòng quay. Vui lòng thử lại.');
    }
  };

  const handleCopyClaimCode = async () => {
    if (!winningData?.claimCode) return;
    try {
      await navigator.clipboard.writeText(winningData.claimCode);
      playSoftPop();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      //
    }
  };

  // Lookup claim status by Claim Code or Ticket Code
  const handleLookupClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupCode.trim().toUpperCase();
    if (!clean) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const res = await fetch('/api/spin/claim-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: clean }),
      });
      const data = await res.json();
      if (res.ok && data.claimCode) {
        setLookupResult(data);
        playSoftPop();
      } else {
        setLookupError(data.error || 'Không tìm thấy thông tin nhận thưởng với mã này.');
      }
    } catch {
      setLookupError('Lỗi kết nối khi tra cứu giải thưởng.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <section id="lucky-wheel" className="py-20 bg-gradient-to-b from-[#1E0528] via-[#2A092B] to-[#14021A] text-white relative overflow-hidden transition-colors duration-300">
      {/* Radiant ambient glow in background with vibrant purple, magenta & amber */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] bg-gradient-to-r from-purple-700/35 via-rose-600/35 to-amber-500/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-950 via-rose-950 to-amber-950 border-2 border-amber-400/60 rounded-full text-xs font-black text-amber-300 mb-3 shadow-lg shadow-purple-950/80 uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>VÒNG QUAY MAY MẮN · {holidayConfig.name.toUpperCase()}</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-purple-200 tracking-tight text-balance">
            Vòng Quay May Mắn – Trao Quà Tri Ân
          </h2>
          
          <p className="mt-3 text-stone-300 text-sm sm:text-base leading-relaxed">
            Chương trình quay số dự thưởng chào mừng sự kiện tại <strong className="text-amber-300 font-semibold">Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa</strong>.
            Quý vị nhập Mã Vé Dự Thưởng được phát hành để tham gia quay thưởng và nhận lì xì MoMo hấp dẫn!
          </p>

          {/* User Session Banner */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {currentUser ? (
              <div className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-purple-400/40 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>{userProfile?.displayName || currentUser.email}</span>
                </div>
                <span className="text-stone-500">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-stone-300">Lượt tài khoản:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-mono font-bold text-xs">
                    {userProfile?.spinsRemaining ?? 3} lượt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenHistoryModal}
                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-200 border border-purple-400/50 font-semibold transition cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Lịch sử của tôi</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/15 text-xs text-stone-300">
                <Sparkle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Chưa có mã vé dự thưởng?</span>
                <button
                  type="button"
                  onClick={() => setIsGetTicketModalOpen(true)}
                  className="text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  Bấm vào đây để lấy vé hoặc liên hệ Ban Tổ Chức
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Wheel & Interactive Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Graphic Wheel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            
            <div className="relative w-[340px] sm:w-[450px] md:w-[480px] h-[340px] sm:h-[450px] md:h-[480px] max-w-full aspect-square flex items-center justify-center p-3">
              
              {/* Outer Vibrant Glowing Frame with Led Dots */}
              <div className="absolute inset-0 rounded-full border-8 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.65)] bg-gradient-to-tr from-purple-900 via-rose-900 to-amber-900" />

              {/* Dotted Gold Ring with Pulsing Glow */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-300/80 pointer-events-none" />

              {/* Indicator Arrow Needle (At 12 o'clock / TOP = 0 degrees) */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-30 pointer-events-none transition-transform duration-75 ${
                  needleVibrating ? 'animate-bounce' : ''
                }`}
                style={{
                  transformOrigin: '50% 100%',
                }}
              >
                <div className="relative flex flex-col items-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-300 to-amber-500 border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-rose-700 shadow-inner" />
                  </div>
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 -mt-1.5" />
                </div>
              </div>

              {/* Spinning Wheel SVG */}
              <div
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4.8s cubic-bezier(0.12, 0.95, 0.25, 1)' : 'none',
                }}
                className="w-full h-full rounded-full overflow-hidden shadow-2xl relative"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                  <defs>
                    <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.6" />
                    </filter>
                  </defs>

                  {slices.map((slice, index) => {
                    const anglePerSlice = 360 / 8; // 45 degrees
                    const startAngle = index * anglePerSlice - 90 - anglePerSlice / 2;
                    const endAngle = startAngle + anglePerSlice;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;

                    const x1 = 50 + 50 * Math.cos(startRad);
                    const y1 = 50 + 50 * Math.sin(startRad);
                    const x2 = 50 + 50 * Math.cos(endRad);
                    const y2 = 50 + 50 * Math.sin(endRad);

                    const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                    const midAngle = index * anglePerSlice;

                    return (
                      <g
                        key={slice.id}
                        transform={`rotate(${midAngle} 50 50)`}
                        className="transition-opacity duration-200"
                        onMouseEnter={() => setHoveredSlice(slice.id)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        {/* Slice Sector */}
                        <path
                          d={pathData}
                          fill={slice.color}
                          stroke="#FFF"
                          strokeWidth="0.8"
                          transform={`rotate(-${midAngle} 50 50)`}
                          className="hover:brightness-110 transition-all cursor-pointer"
                        />

                        {/* Outer Edge Accent Arc */}
                        <circle
                          cx="50"
                          cy="9.5"
                          r="1.4"
                          fill="#FDE047"
                          stroke="#78350F"
                          strokeWidth="0.3"
                          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}
                        />

                        {/* Slice Badge / Emoji Icon */}
                        <text
                          x="50"
                          y="14"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="4"
                          style={{
                            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))',
                          }}
                        >
                          {slice.badge}
                        </text>

                        {/* Primary Label */}
                        <text
                          x="50"
                          y="20.5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize="3.6"
                          fontWeight="900"
                          fontFamily="var(--font-sans), sans-serif"
                          style={{
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                          }}
                        >
                          {slice.label}
                        </text>

                        {/* Subtitle Label */}
                        <text
                          x="50"
                          y="24.5"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FEF08A"
                          fontSize="2.4"
                          fontWeight="800"
                          fontFamily="var(--font-sans), sans-serif"
                          style={{
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                          }}
                        >
                          {slice.subLabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Spinning Hub Button */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <button
                  type="button"
                  onClick={() => handleSpin(false)}
                  disabled={spinning}
                  className="w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-gradient-to-tr from-amber-400 via-rose-600 to-purple-800 text-white font-black text-xs sm:text-sm shadow-[0_0_35px_rgba(225,29,72,0.85)] border-4 border-amber-300 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-80"
                  aria-label="Quay vòng may mắn"
                >
                  <RotateCw className={`w-6 h-6 mb-0.5 ${spinning ? 'animate-spin' : ''}`} />
                  <span className="tracking-wider">{spinning ? 'ĐANG QUAY' : 'QUAY NGAY'}</span>
                </button>
              </div>

            </div>

          </div>

          {/* Right Column: Ticket Box & Rules (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Primary Ticket Input Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white/10 backdrop-blur-xl border-2 border-white/20 shadow-xl space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-600 text-white flex items-center justify-center shrink-0">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-white">Nhập Mã Vé Dự Thưởng</h3>
                    <p className="text-xs text-amber-300 font-medium">
                      Mã số do Ban Tổ Chức nhà trường phát hành
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGetTicketModalOpen(true)}
                  disabled={spinning}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                  title="Xem hướng dẫn nhận mã vé dự thưởng"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                  <span>Lấy vé nhanh</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {ticketStatus && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    ticketStatus.valid
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-red-500/20 border-red-500/40 text-red-200'
                  }`}
                >
                  {ticketStatus.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span>{ticketStatus.msg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1.5">
                  Nhập mã vé dự thưởng (8 ký tự, ví dụ: {holidayConfig.ticketPrefix}7K9M3X)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Nhập mã ${holidayConfig.ticketPrefix}XXXXXX`}
                    value={ticketInput}
                    onChange={(e) => {
                      setTicketInput(e.target.value.toUpperCase());
                      setTicketStatus(null);
                    }}
                    className="flex-1 px-4 py-3 text-sm rounded-xl border border-white/20 bg-stone-900/80 text-white placeholder-stone-500 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleCheckTicket}
                    disabled={checkingTicket || !ticketInput.trim()}
                    className="px-3.5 py-3 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-400/50 text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <SearchCheck className="w-4 h-4" />
                    <span>{checkingTicket ? '...' : 'Kiểm tra'}</span>
                  </button>
                </div>

                {/* Clickable Sample Tickets */}
                <div className="mt-2.5">
                  <div className="text-[11px] text-stone-300 mb-1.5 font-medium flex items-center gap-1">
                    <span>💡 Vé khả dụng hôm nay (chạm để chọn nhanh):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {publicTickets.slice(0, 4).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setTicketInput(code);
                          setTicketStatus(null);
                          playSoftPop();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                          ticketInput === code
                            ? 'bg-amber-400 text-stone-950 shadow-sm'
                            : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSpin(false)}
                  disabled={spinning}
                  className="w-full sm:flex-1 py-3.5 px-4 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-500 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-rose-500/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Dices className="w-4 h-4" />
                  <span>{spinning ? 'Đang quay số...' : (ticketInput.trim() ? 'Quay Số Bằng Mã Vé' : 'Quay Số May Mắn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSpin(true)}
                  disabled={spinning}
                  className="w-full sm:w-auto py-3.5 px-4 bg-white/10 hover:bg-white/20 text-stone-200 font-medium text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
                >
                  Quay thử (Demo)
                </button>
              </div>

            </div>

            {/* Tra Cứu Giải Thưởng & Người Nhận Giải */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-3">
              <div className="flex items-center justify-between text-stone-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tra cứu trạng thái trao thưởng</span>
                </span>
                <span className="text-[11px] text-stone-400 font-normal">Nhập Mã Nhận Thưởng</span>
              </div>

              <form onSubmit={handleLookupClaim} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: MOMO-2010-XXXX..."
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-xs text-white placeholder-stone-500 font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={lookupLoading || !lookupCode.trim()}
                  className="px-3 py-2 rounded-lg bg-purple-800 hover:bg-purple-700 text-amber-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {lookupLoading ? '...' : 'Tra cứu'}
                </button>
              </form>

              {lookupError && (
                <div className="text-[11px] text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-800">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/50 space-y-1 text-stone-200">
                  <div className="flex justify-between items-center font-bold">
                    <span>Mã: <span className="font-mono text-amber-300">{lookupResult.claimCode}</span></span>
                    <span className="text-emerald-400">{lookupResult.amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {lookupResult.fullName && (
                    <div className="text-stone-300">Người nhận: <strong>{lookupResult.fullName}</strong> ({lookupResult.maskedPhone})</div>
                  )}
                  <div className="text-xs pt-1">
                    Trạng thái: <span className="font-bold text-amber-300">
                      {lookupResult.status === 'transferred' ? '✅ Đã chuyển tiền MoMo' :
                       lookupResult.status === 'verified' ? '⏳ Đã xác minh, chờ chuyển khoản' :
                       lookupResult.status === 'pending_verification' ? '📝 Đã nộp thông tin, chờ duyệt' : 'Chưa điền thông tin'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Event Transparency Guarantee */}
            <div className="p-4 rounded-2xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Quy trình quay số & trao giải minh bạch</span>
              </div>
              <p className="leading-relaxed text-stone-300 text-[11px]">
                Mã vé dự thưởng do Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa quản lý và phát hành. Khi trúng thưởng, hệ thống lập tức xuất mã nhận giải độc bản và tiếp nhận thông tin người nhận để Ban Tổ Chức trao giải trực tiếp hoặc chuyển khoản MoMo.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Winning Celebration Modal */}
      {winningData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setWinningData(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-gradient-to-b from-stone-900 to-[#2A0826] rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-400/80 text-center overflow-hidden"
          >
            {/* Top Glowing Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600" />

            <button
              onClick={() => setWinningData(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Trophy or Gift Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-rose-900/50">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              {winningData.isDemo ? 'KẾT QUẢ QUAY THỬ NGHIỆM' : 'CHÚC MỪNG BẠN ĐÃ TRÚNG THƯỞNG!'}
            </span>

            <h3 className="font-serif text-3xl font-black text-white mt-1 mb-1">
              {winningData.label}
            </h3>
            {winningData.subLabel && (
              <p className="text-xs text-amber-300 font-bold mb-2">
                {winningData.subLabel}
              </p>
            )}

            {/* Cash Prize Details */}
            {winningData.prizeAmount > 0 && winningData.claimCode && (
              <div className="my-4 p-4 rounded-2xl bg-white/10 border border-rose-400/50 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-300">Mã nhận thưởng:</span>
                  <button
                    type="button"
                    onClick={handleCopyClaimCode}
                    className="text-[11px] font-bold text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div className="font-mono text-base font-bold text-amber-300 bg-black/40 p-2 rounded-lg text-center tracking-wider">
                  {winningData.claimCode}
                </div>
                {winningData.ticketCode && (
                  <span className="text-[11px] text-stone-400 block text-center">
                    Mã vé đã quay: <strong className="text-white font-mono">{winningData.ticketCode}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Message Body */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-stone-200 font-serif text-sm leading-relaxed mb-6 italic">
              &ldquo;{winningData.wishMessage}&rdquo;
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {winningData.prizeAmount > 0 && winningData.claimCode ? (
                <button
                  type="button"
                  onClick={() => {
                    const code = winningData.claimCode!;
                    const amt = winningData.prizeAmount;
                    const ticket = winningData.ticketCode;
                    setWinningData(null);
                    onOpenClaimModal(code, amt, ticket);
                  }}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-[#A50064] via-rose-600 to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse"
                >
                  <Phone className="w-4 h-4" />
                  <span>Điền Thông Tin Người Nhận Giải Ngay</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const wish = winningData.wishMessage;
                    setWinningData(null);
                    onOpenCardWithWish(`Lời chúc ${holidayConfig.shortDate} cát tường`, wish, holidayConfig.defaultRecipient);
                  }}
                  className="w-full py-3 px-5 bg-gradient-to-r from-purple-600 to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Tạo thiệp từ lời chúc này
                </button>
              )}

              <button
                type="button"
                onClick={() => setWinningData(null)}
                className="py-2.5 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Đóng thông báo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Get Ticket Help Modal (Gmail login or Admin contact) */}
      <GetTicketModal
        isOpen={isGetTicketModalOpen}
        onClose={() => setIsGetTicketModalOpen(false)}
        onOpenAuthModal={onOpenAuthModal}
        onSelectSampleTicket={(code) => {
          setTicketInput(code);
          setTicketStatus(null);
        }}
      />
    </section>
  );
};
