export type RecipientCategory =
  | 'family'
  | 'romantic'
  | 'teachers'
  | 'colleagues'
  | 'friends'
  | 'business'
  | 'healthcare'
  | 'humorous'
  | 'emotional'
  | 'inspiring'
  | 'wellness'
  | 'selflove';

export type WishTone =
  | 'emotional' // Cảm động
  | 'refined' // Tinh tế & Dịu dàng
  | 'humorous' // Hài hước
  | 'cute' // Dễ thương
  | 'formal' // Trang trọng
  | 'inspiring'; // Truyền cảm hứng

export type WishLength = 'short' | 'medium' | 'long';

export type WishTheme =
  | 'happiness' // Hạnh phúc & Nụ cười
  | 'health' // Sức khỏe & Bình an
  | 'success' // Thành công & Rực rỡ
  | 'gratitude' // Biết ơn & Tri ân
  | 'love'; // Tình yêu thương

export interface WishItem {
  id: string;
  occasion: string;
  recipient: string;
  recipientCategory: RecipientCategory;
  tone: WishTone;
  length: WishLength;
  tags: string[];
  title: string;
  content: string;
}

export interface GeneratorFormState {
  recipientName: string;
  ageGroup: string;
  profession: string;
  customProfession?: string;
  relationship: string;
  customRelationship?: string;
  pronoun: string;
  tone: WishTone;
  length: WishLength;
  theme: WishTheme;
}

export interface GeneratedWishResult {
  title: string;
  message: string;
  tone: WishTone;
  recipientType: string;
  isAiGenerated: boolean;
  modelNote?: string;
}

export interface WheelSegment {
  id: number;
  label: string;
  color: string;
  textColor: string;
  wishTitle: string;
  wishMessage: string;
}

export interface InteractiveObject {
  id: string;
  title: string;
  subtitle: string;
  iconName: 'flower' | 'gift' | 'envelope' | 'heart' | 'star';
  bgGradient: string;
  borderColor: string;
  wishTitle: string;
  wishContent: string;
  advice: string;
}

export type CardThemeId = 'elegant' | 'romantic' | 'vibrant' | 'regal' | 'teachers';

export interface CardCustomization {
  recipientName: string;
  title: string;
  message: string;
  senderName: string;
  themeId: CardThemeId;
}

export type ClaimStatus =
  | 'unclaimed' // Chưa yêu cầu nhận thưởng
  | 'pending_verification' // Chờ xác minh
  | 'verified' // Đã xác minh
  | 'pending_transfer' // Chờ chuyển tiền
  | 'transferred' // Đã chuyển tiền
  | 'rejected' // Từ chối
  | 'expired'; // Hết hạn

export interface MomoPrizeTier {
  id: string;
  amount: number; // e.g. 10000, 20000, 50000, 100000
  label: string; // "10.000đ", "50.000đ"
  totalQuantity: number;
  remainingQuantity: number;
  color: string;
  textColor: string;
}

export interface SpinTicket {
  code: string;
  occasion?: string;
  isUsed: boolean;
  usedAt?: string;
  usedBy?: string;
  prizeWon?: number;
  claimCode?: string;
  createdAt: string;
}

export interface RewardClaim {
  id: string;
  claimCode: string;
  ticketCode: string;
  amount: number;
  fullName: string;
  schoolClassOrDepartment: string;
  momoPhone: string;
  guardianNote?: string;
  status: ClaimStatus;
  createdAt: string;
  verifiedAt?: string;
  transferredAt?: string;
  momoTransactionRef?: string;
  rejectionReason?: string;
  adminNote?: string;
}

export interface EventConfig {
  eventName: string;
  organizer: string;
  authorName: string;
  authorUnit: string;
  authorEmail: string;
  year: number;
  status: 'active' | 'paused' | 'ended';
  minRewardAmount: number; // 10000
  maxRewardAmount: number; // 100000
  totalBudget: number; // e.g. 500000
  awardedAmount: number;
  aiAttribution: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  adminUser: string;
}
