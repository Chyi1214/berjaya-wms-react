// Translation Chat Types - Simple 5-Channel System

// User in a translation channel
export interface ChannelUser {
  email: string;
  name: string;
  language: 'en' | 'ms' | 'zh' | 'my' | 'bn';
  joinedAt: Date;
}

// Translation channel (1 of 5 channels)
export interface TranslationChannel {
  id: string; // 'channel_1' to 'channel_5'
  users: ChannelUser[];
  isOccupied: boolean; // true when 2 users, false when 0-1 users
  lastActivity: Date;
  createdAt: Date;
}

// Message in a translation channel
export interface ChannelMessage {
  id: string;
  channelId: string; // 'channel_1' to 'channel_5'
  senderId: string; // user email
  senderName: string;
  senderLanguage: 'en' | 'ms' | 'zh' | 'my' | 'bn';
  originalText: string; // Message in sender's language
  translatedText: string; // Auto-translated to other user's language
  timestamp: Date;
  isSystemMessage?: boolean; // For join/leave notifications
}

// Channel availability status
export interface ChannelStatus {
  channelId: string;
  isAvailable: boolean;
  userCount: number;
  users: Pick<ChannelUser, 'name' | 'language'>[];
}

// Current user's channel session
export interface UserChannelSession {
  channelId: string | null;
  otherUser: ChannelUser | null;
  isAlone: boolean;
}

// Translation chat service response
export interface TranslationResponse {
  success: boolean;
  message: string;
  data?: any;
}