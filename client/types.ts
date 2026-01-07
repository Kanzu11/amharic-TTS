
export enum Tone {
  NEUTRAL = 'neutral',
  CHEERFUL = 'cheerful',
  SERIOUS = 'serious',
  CALM = 'calm',
  SAD = 'sad',
  EXCITED = 'excited',
  STORYTELLER = 'storyteller'
}

export enum VoiceName {
  KORE = 'Kore',
  PUCK = 'Puck',
  CHARON = 'Charon',
  FENRIR = 'Fenrir',
  ZEPHYR = 'Zephyr'
}

export interface TTSHistoryItem {
  id: string;
  userId: string;
  text: string;
  tone: Tone;
  voice: VoiceName;
  timestamp: number;
  audioData?: Uint8Array;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSubscribed: boolean;
  paymentId?: string; // Tracks the Telebirr transaction ID
  hasPendingPayment?: boolean;
  isVerified: boolean;
  subscriptionExpiry?: number;
  createdAt: number;
  subscription?: {
    status: 'active' | 'inactive' | 'expired';
    plan: 'monthly' | 'lifetime';
    startDate: string;
    expiresAt: string;
  };
}
