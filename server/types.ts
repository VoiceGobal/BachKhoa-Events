export interface MomoPrizeTier {
  id: string;
  amount: number;
  label: string;
  totalQuantity: number;
  remainingQuantity: number;
  color: string;
  textColor: string;
}

export interface TicketInternal {
  code: string;
  occasion: string;
  isUsed: boolean;
  usedAt?: string;
  usedBy?: string;
  prizeWon?: number;
  claimCode?: string;
  createdAt: string;
}

export interface ClaimInternal {
  id: string;
  claimCode: string;
  ticketCode: string;
  amount: number;
  fullName: string;
  schoolClassOrDepartment: string;
  momoPhone: string;
  guardianNote?: string;
  payoutMethod?: string;
  status: 'unclaimed' | 'pending' | 'verified' | 'transferred' | 'rejected';
  momoTransactionRef?: string;
  rejectionReason?: string;
  adminNote?: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt?: string;
  transferredAt?: string;
}

export interface EventConfigState {
  eventName: string;
  organizer: string;
  authorName: string;
  authorUnit: string;
  authorEmail: string;
  year: number;
  status: 'active' | 'paused' | 'ended';
  minRewardAmount: number;
  maxRewardAmount: number;
  totalBudget: number;
  awardedAmount: number;
  aiAttribution: string;
}

export interface AuditLogInternal {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  adminUser: string;
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}
