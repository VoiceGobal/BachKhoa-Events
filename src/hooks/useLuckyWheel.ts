import { useState, useRef, useEffect } from 'react';
import { playWheelTick, playSuspensePulse, playCelebration, playSoftPop } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import { WheelSlice, getHolidaySlices } from '../components/LuckyWheel';
import { HolidayId, HolidayConfig } from '../context/EventContext';
import { User } from 'firebase/auth';

export interface SpinWinningData {
  label: string;
  subLabel?: string;
  wishMessage: string;
  prizeAmount: number;
  claimCode?: string;
  ticketCode?: string;
  isDemo?: boolean;
}

export interface TicketStatusState {
  checked: boolean;
  valid: boolean;
  msg: string;
}

export function useLuckyWheel({
  activeHoliday,
  holidayConfig,
  currentUser,
  spinsRemaining,
  decrementUserSpin,
}: {
  activeHoliday: HolidayId;
  holidayConfig: HolidayConfig;
  currentUser: User | null;
  spinsRemaining: number;
  decrementUserSpin: () => Promise<void>;
}) {
  const slices: WheelSlice[] = getHolidaySlices(activeHoliday);

  const [ticketInput, setTicketInput] = useState<string>('');
  const [ticketStatus, setTicketStatus] = useState<TicketStatusState | null>(null);
  const [checkingTicket, setCheckingTicket] = useState<boolean>(false);
  const [publicTickets, setPublicTickets] = useState<string[]>([]);

  const [spinning, setSpinning] = useState<boolean>(false);
  const [needleVibrating, setNeedleVibrating] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [remainingPrizesCount, setRemainingPrizesCount] = useState<number>(20);
  const [totalBudget, setTotalBudget] = useState<number>(500000);

  const [winningData, setWinningData] = useState<SpinWinningData | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const spinTimeoutsRef = useRef<number[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Fetch event info and sample available tickets from backend
  useEffect(() => {
    fetch('/api/event/info')
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
      .then((data) => {
        if (data && typeof data.remainingPrizes === 'number') {
          setRemainingPrizesCount(data.remainingPrizes);
        }
        if (data && typeof data.totalBudget === 'number') {
          setTotalBudget(data.totalBudget);
        }
      })
      .catch(() => {
        // Fallback default info
      });

    fetch(`/api/spin/public-tickets?prefix=${holidayConfig.ticketPrefix}`)
      .then((res) => {
        if (!res.ok) throw new Error('API unavailable');
        return res.json();
      })
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

  // Check ticket with backend API
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
          msg: data.message || `Mã vé "${code}" hợp lệ! Quý vị có thể tham gia quay số nhận thưởng.`,
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
        msg: 'Không thể kết nối máy chủ để kiểm tra vé. Vui lòng kiểm tra lại kết nối mạng.',
      });
    } finally {
      setCheckingTicket(false);
    }
  };

  // Backend Transactional Spin (Strictly Server-Authoritative)
  const handleSpin = async (forceDemo = false) => {
    if (spinning) return;

    const hasTicket = Boolean(ticketInput.trim());

    // Allow spinning with ticket without login; login required only for free spins without ticket
    if (!currentUser && !hasTicket && !forceDemo) {
      setErrorMsg('Vui lòng nhập mã vé dự thưởng để tham gia, hoặc đăng nhập để dùng lượt quay miễn phí.');
      return;
    }

    if (!forceDemo && !hasTicket && currentUser && spinsRemaining <= 0) {
      setErrorMsg('Tài khoản đã dùng hết 3 lượt quay chào mừng! Hãy nhập mã vé dự thưởng để tiếp tục rinh quà MoMo.');
      return;
    }

    setErrorMsg('');
    setWinningData(null);
    setCopiedCode(false);

    try {
      let targetIndex = 0;
      let label = '';
      let subLabel = '';
      let wishMessage = '';
      let prizeAmount = 0;
      let claimCode: string | undefined = undefined;
      let ticketCode: string | undefined = undefined;
      let isDemoResult = forceDemo;

      if (hasTicket || forceDemo) {
        // Backend Transactional Spin: All ticket usage, prize selection, inventory decrement, and claim creation happen on backend
        let idToken = '';
        if (currentUser) {
          try {
            idToken = await currentUser.getIdToken();
          } catch {}
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idToken) {
          headers['X-Firebase-Id-Token'] = idToken;
        }

        const res = await fetch('/api/spin/play', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ticketCode: ticketInput.trim(),
            isDemo: forceDemo,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Lỗi khi thực hiện vòng quay từ máy chủ.');
          return;
        }

        targetIndex = typeof data.segmentIndex === 'number' ? data.segmentIndex % 8 : 0;
        const matchingSlice = slices[targetIndex];
        label = matchingSlice.label;
        subLabel = matchingSlice.subLabel;
        wishMessage = data.wishMessage || matchingSlice.wish;
        prizeAmount = data.prizeAmount || 0;
        claimCode = data.claimCode;
        ticketCode = data.ticketCode;
        isDemoResult = Boolean(data.isDemo);

        if (ticketStatus?.valid) {
          setTicketStatus({
            checked: true,
            valid: false,
            msg: `Vé "${ticketInput.trim().toUpperCase()}" đã được dùng thành công.`,
          });
        }
      } else {
        // Free Spin via Backend
        const idToken = await currentUser!.getIdToken();
        const res = await fetch('/api/spin/free', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Firebase-Id-Token': idToken,
          },
          body: '{}',
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Không thể thực hiện lượt quay miễn phí.');
          return;
        }

        targetIndex = typeof data.segmentIndex === 'number' ? data.segmentIndex % 8 : 0;
        label = slices[targetIndex].label;
        subLabel = slices[targetIndex].subLabel;
        wishMessage = data.wishMessage || slices[targetIndex].wish;
        prizeAmount = 0;

        try {
          await decrementUserSpin();
        } catch {}
      }

      // Start spinning animation
      setSpinning(true);
      setNeedleVibrating(true);

      const fullSpins = 360 * (7 + Math.floor(Math.random() * 2));
      const targetDegree = (360 - targetIndex * 45) % 360;
      const currentMod = rotation % 360;
      const rotationDelta = fullSpins + (360 - currentMod) + targetDegree;
      const newTotalRotation = rotation + rotationDelta;

      setRotation(newTotalRotation);

      // Sound progression
      spinTimeoutsRef.current.forEach((t) => clearTimeout(t));
      spinTimeoutsRef.current = [];

      const tickDelays = [
        60, 120, 180, 230, 275, 315, 350, 385, 415, 445, 475, 505,
        540, 580, 625, 680, 745, 820, 910, 1020, 1150, 1310, 1500,
        1730, 2010, 2350, 2760, 3250, 3830, 4450, 5050
      ];

      tickDelays.forEach((delay) => {
        const tid = window.setTimeout(() => {
          playWheelTick();
        }, delay);
        spinTimeoutsRef.current.push(tid);
      });

      const pulseTid = window.setTimeout(() => {
        playSuspensePulse();
      }, 4200);
      spinTimeoutsRef.current.push(pulseTid);

      // Animation complete
      const finishTid = window.setTimeout(() => {
        setSpinning(false);
        setNeedleVibrating(false);

        setWinningData({
          label,
          subLabel,
          wishMessage,
          prizeAmount,
          claimCode,
          ticketCode,
          isDemo: isDemoResult,
        });

        if (prizeAmount > 0) {
          playCelebration();
          triggerConfetti();
          setRemainingPrizesCount((prev) => Math.max(0, prev - 1));
        } else {
          playSoftPop();
        }
      }, 5400);

      spinTimeoutsRef.current.push(finishTid);
    } catch (err: any) {
      setSpinning(false);
      setNeedleVibrating(false);
      setErrorMsg(err.message || 'Lỗi kết nối khi quay số.');
    }
  };

  const handleCopyCode = async (codeToCopy: string) => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
      playSoftPop();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  return {
    slices,
    ticketInput,
    setTicketInput,
    ticketStatus,
    setTicketStatus,
    checkingTicket,
    publicTickets,
    spinning,
    needleVibrating,
    rotation,
    hoveredSlice,
    setHoveredSlice,
    errorMsg,
    setErrorMsg,
    remainingPrizesCount,
    totalBudget,
    winningData,
    setWinningData,
    copiedCode,
    handleCheckTicket,
    handleSpin,
    handleCopyCode,
  };
}
