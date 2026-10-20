import React, { useState, useEffect } from 'react';
import { PetalCanvas } from './components/PetalCanvas';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { PhotoSpotlightSection } from './components/PhotoSpotlightSection';
import { InteractiveItemsSection } from './components/InteractiveItemsSection';
import { GreetingGenerator } from './components/GreetingGenerator';
import { LuckyWheel } from './components/LuckyWheel';
import { WishLibrary } from './components/WishLibrary';
import { GreetingCardModal } from './components/GreetingCardModal';
import { AuthorModal } from './components/AuthorModal';
import { ClaimRewardModal } from './components/ClaimRewardModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AuthModal } from './components/AuthModal';
import { UserHistoryModal } from './components/UserHistoryModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Footer } from './components/Footer';
import { WishItem } from './types';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { EventProvider, useEvent } from './context/EventContext';

function AppContent() {
  const { holidayConfig } = useEvent();
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Claim modal state
  const [claimModalData, setClaimModalData] = useState<{
    claimCode: string;
    prizeAmount: number;
    ticketCode?: string;
  }>({
    claimCode: '',
    prizeAmount: 0,
    ticketCode: '',
  });
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);

  const [cardData, setCardData] = useState<{
    title: string;
    message: string;
    recipient: string;
  }>({
    title: 'Chúc Mừng Ngày 20/10 Rực Rỡ',
    message:
      'Nhân ngày Phụ nữ Việt Nam 20/10, chúc bạn luôn ngập tràn niềm vui, nụ cười rạng ngời và đón nhận thật nhiều tình yêu thương ấm áp từ cuộc sống.',
    recipient: 'Người phụ nữ tôi yêu mến',
  });

  // When active holiday changes, adapt default card info
  useEffect(() => {
    if (holidayConfig) {
      setCardData({
        title: holidayConfig.defaultCardTitle,
        message: holidayConfig.defaultCardMessage,
        recipient: holidayConfig.defaultRecipient,
      });
    }
  }, [holidayConfig]);

  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Check shared card link from URL hash on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check system prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setReducedMotion(true);
    }

    // Check URL hash for shared card or modals
    const hash = window.location.hash;
    if (hash.startsWith('#card?')) {
      try {
        const queryStr = hash.replace('#card?', '');
        const params = new URLSearchParams(queryStr);
        const to = params.get('to');
        const title = params.get('title');
        const msg = params.get('msg');
        if (to || title || msg) {
          setCardData({
            title: title || 'Chúc Mừng Ngày 20/10',
            message: msg || '',
            recipient: to || 'Người phụ nữ trân quý',
          });
          setIsCardModalOpen(true);
        }
      } catch (e) {
        console.error('Failed to parse card from URL:', e);
      }
    } else if (hash === '#author' || hash === '#tac-gia') {
      setIsAuthorModalOpen(true);
    } else if (hash === '#admin') {
      setIsAdminModalOpen(true);
    } else if (hash === '#login') {
      setIsAuthModalOpen(true);
    } else if (hash === '#history') {
      setIsHistoryModalOpen(true);
    } else if (hash === '#profile') {
      setIsProfileModalOpen(true);
    }
  }, []);

  const handleOpenCardWithWish = (title: string, message: string, recipient: string) => {
    setCardData({
      title,
      message,
      recipient: recipient || 'Người phụ nữ trân quý',
    });
    setIsCardModalOpen(true);
  };

  const handleSelectWishForCard = (wish: WishItem) => {
    handleOpenCardWithWish(wish.title, wish.content, wish.recipient);
  };

  const handleOpenClaimModal = (claimCode: string, amount: number, ticketCode?: string) => {
    setClaimModalData({
      claimCode,
      prizeAmount: amount,
      ticketCode,
    });
    setIsClaimModalOpen(true);
  };

  const handleScrollToWheel = () => {
    const el = document.getElementById('lucky-wheel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FFFDF9] dark:bg-[#120216] text-stone-800 dark:text-stone-100 flex flex-col font-sans selection:bg-rose-200 selection:text-rose-950 transition-colors duration-300">
      
      {/* Background Animated Petals & Sparkles */}
      <PetalCanvas active={!reducedMotion} />

      {/* Top Navigation Bar with Light/Dark theme & Profile trigger */}
      <Header
        onOpenCardModal={() => setIsCardModalOpen(true)}
        onOpenAuthorModal={() => setIsAuthorModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {/* A & B. Hero Banner Section */}
        <HeroSection onSelectWishForCard={handleSelectWishForCard} />

        {/* Spotlight Photo Gallery Section for 20/10 */}
        <PhotoSpotlightSection />

        {/* C. Interactive Area: 5 Secret Objects */}
        <InteractiveItemsSection />

        {/* D & E. Personalized AI Wish Generator */}
        <GreetingGenerator onOpenCardWithWish={handleOpenCardWithWish} />

        {/* F. Lucky Wheel with MoMo Prizes, Ticket Check & Firebase Auth */}
        <LuckyWheel
          onOpenCardWithWish={handleOpenCardWithWish}
          onOpenClaimModal={handleOpenClaimModal}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        />

        {/* G. Curated Library of 120+ Wishes */}
        <WishLibrary onOpenCardWithWish={handleOpenCardWithWish} />
      </main>

      {/* H. Interactive Digital Greeting Card Modal */}
      <GreetingCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        initialData={cardData}
      />

      {/* Author & Unit Profile Modal */}
      <AuthorModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
      />

      {/* MoMo Reward Claim Submission Modal */}
      <ClaimRewardModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        claimCode={claimModalData.claimCode}
        prizeAmount={claimModalData.prizeAmount}
        initialTicketCode={claimModalData.ticketCode}
      />

      {/* Event Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Firebase Authentication Modal (Login / Register / Forgot Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* User History Modal (Spins & MoMo Claims) */}
      <UserHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onOpenClaimModalForCode={(code, amount) => handleOpenClaimModal(code, amount)}
      />

      {/* Zalo-style User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenWheel={handleScrollToWheel}
      />

      {/* J. Footer */}
      <Footer onOpenAuthorModal={() => setIsAuthorModalOpen(true)} />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EventProvider>
          <AppContent />
        </EventProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
