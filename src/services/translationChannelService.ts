// Translation Channel Service - Simple 5-Channel System
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from './costTracking/firestoreWrapper';
import { db } from './firebase';
import { geminiService } from './geminiService';
import { createModuleLogger } from './logger';
import {
  TranslationChannel,
  ChannelMessage,
  ChannelUser,
  ChannelStatus,
  UserChannelSession,
  TranslationResponse
} from '../types/translationChat';

const logger = createModuleLogger('TranslationChannelService');

class TranslationChannelService {
  private channelsCollection = 'translationChannels';
  private messagesCollection = 'channelMessages';
  private readonly CHANNEL_IDS = ['channel_1', 'channel_2', 'channel_3', 'channel_4', 'channel_5'];

  // Initialize all 5 channels if they don't exist
  async initializeChannels(): Promise<void> {
    try {
      logger.info('Initializing translation channels');

      for (const channelId of this.CHANNEL_IDS) {
        const channelRef = doc(db, this.channelsCollection, channelId);
        const channelDoc = await getDoc(channelRef);

        if (!channelDoc.exists()) {
          const channel: Omit<TranslationChannel, 'id'> = {
            users: [],
            isOccupied: false,
            lastActivity: new Date(),
            createdAt: new Date()
          };

          await setDoc(channelRef, channel);
          console.log('🔧 DEBUG: Created new channel', { channelId });
          logger.info('Created channel', { channelId });
        } else {
          // Check if channel has very old timestamp (more than 1 hour) and reset it
          const channelData = channelDoc.data();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const lastActivity = channelData.lastActivity?.toDate ? channelData.lastActivity.toDate() : new Date(channelData.lastActivity || 0);

          if (lastActivity < oneHourAgo) {
            console.log('🔧 DEBUG: Found very old channel, resetting lastActivity', {
              channelId,
              oldLastActivity: lastActivity,
              userCount: channelData.users?.length || 0
            });

            await updateDoc(channelRef, {
              lastActivity: new Date()
            });

            console.log('🔧 DEBUG: Reset very old lastActivity for channel', { channelId });
          } else {
            console.log('🔧 DEBUG: Channel exists with recent activity, leaving lastActivity unchanged', {
              channelId,
              lastActivity: lastActivity,
              userCount: channelData.users?.length || 0
            });
          }
        }
      }

      console.log('🔧 DEBUG: All channels initialized with fresh lastActivity timestamps');
      logger.info('Translation channels initialized');
    } catch (error) {
      logger.error('Failed to initialize channels:', error);
      throw error;
    }
  }

  // Get all channel statuses
  async getChannelStatuses(): Promise<ChannelStatus[]> {
    try {
      const statuses: ChannelStatus[] = [];

      for (const channelId of this.CHANNEL_IDS) {
        const channelRef = doc(db, this.channelsCollection, channelId);
        const channelDoc = await getDoc(channelRef);

        if (channelDoc.exists()) {
          const channel = channelDoc.data() as TranslationChannel;

          statuses.push({
            channelId,
            isAvailable: channel.users.length < 2,
            userCount: channel.users.length,
            users: channel.users.map(u => ({ name: u.name, language: u.language }))
          });
        } else {
          statuses.push({
            channelId,
            isAvailable: true,
            userCount: 0,
            users: []
          });
        }
      }

      return statuses;
    } catch (error) {
      logger.error('Failed to get channel statuses:', error);
      throw error;
    }
  }

  // Join a channel
  async joinChannel(
    channelId: string,
    userEmail: string,
    userName: string,
    userLanguage: 'en' | 'ms' | 'zh' | 'my' | 'bn'
  ): Promise<TranslationResponse> {
    try {
      logger.info('User joining channel', { channelId, userEmail });

      // Check if user is already in any channel
      const currentSession = await this.getUserChannelSession(userEmail);
      if (currentSession.channelId) {
        return {
          success: false,
          message: 'You are already in a channel. Please leave first.'
        };
      }

      const channelRef = doc(db, this.channelsCollection, channelId);
      const channelDoc = await getDoc(channelRef);

      if (!channelDoc.exists()) {
        return {
          success: false,
          message: 'Channel does not exist'
        };
      }

      const channel = channelDoc.data() as TranslationChannel;

      // Check if channel is full
      if (channel.users.length >= 2) {
        return {
          success: false,
          message: 'Channel is full (maximum 2 users)'
        };
      }

      // Check if user is already in this channel
      if (channel.users.some(u => u.email === userEmail)) {
        return {
          success: false,
          message: 'You are already in this channel'
        };
      }

      // If this is the first user joining, clear old messages for fresh start
      if (channel.users.length === 0) {
        console.log('🔧 DEBUG: First user joining channel - clearing old messages', { channelId, userEmail });
        logger.info('First user joining - clearing old messages for fresh start', { channelId, userEmail });
        await this.clearChannelMessages(channelId);
      }

      // Add user to channel
      const newUser: ChannelUser = {
        email: userEmail,
        name: userName,
        language: userLanguage,
        joinedAt: new Date()
      };

      const updatedUsers = [...channel.users, newUser];
      await updateDoc(channelRef, {
        users: updatedUsers,
        isOccupied: updatedUsers.length === 2,
        lastActivity: new Date() // Reset activity timer for fresh session
      });

      // Send system message
      await this.sendSystemMessage(channelId, `${userName} joined the channel`);

      console.log('✅ DEBUG: User successfully joined channel', { channelId, userEmail, userName });
      logger.info('User joined channel successfully', { channelId, userEmail });
      return {
        success: true,
        message: 'Joined channel successfully'
      };
    } catch (error) {
      logger.error('Failed to join channel:', error);
      return {
        success: false,
        message: 'Failed to join channel'
      };
    }
  }

  // Leave a channel
  async leaveChannel(userEmail: string): Promise<TranslationResponse> {
    try {
      logger.info('User leaving channel', { userEmail });

      const session = await this.getUserChannelSession(userEmail);
      if (!session.channelId) {
        return {
          success: false,
          message: 'You are not in any channel'
        };
      }

      const channelRef = doc(db, this.channelsCollection, session.channelId);
      const channelDoc = await getDoc(channelRef);

      if (!channelDoc.exists()) {
        return {
          success: false,
          message: 'Channel does not exist'
        };
      }

      const channel = channelDoc.data() as TranslationChannel;
      const user = channel.users.find(u => u.email === userEmail);

      if (!user) {
        return {
          success: false,
          message: 'User not found in channel'
        };
      }

      // Remove user from channel
      const updatedUsers = channel.users.filter(u => u.email !== userEmail);
      await updateDoc(channelRef, {
        users: updatedUsers,
        isOccupied: false,
        lastActivity: new Date()
      });

      // Send system message
      await this.sendSystemMessage(session.channelId, `${user.name} left the channel`);

      // Clear chat messages if both users have left (channel is empty)
      if (updatedUsers.length === 0) {
        await this.clearChannelMessages(session.channelId);
        logger.info('Channel cleared - both users left', { channelId: session.channelId });
      }

      logger.info('User left channel successfully', { channelId: session.channelId, userEmail });
      return {
        success: true,
        message: 'Left channel successfully'
      };
    } catch (error) {
      logger.error('Failed to leave channel:', error);
      return {
        success: false,
        message: 'Failed to leave channel'
      };
    }
  }

  // Get user's current channel session
  async getUserChannelSession(userEmail: string): Promise<UserChannelSession> {
    try {
      for (const channelId of this.CHANNEL_IDS) {
        const channelRef = doc(db, this.channelsCollection, channelId);
        const channelDoc = await getDoc(channelRef);

        if (channelDoc.exists()) {
          const channel = channelDoc.data() as TranslationChannel;
          const user = channel.users.find(u => u.email === userEmail);

          if (user) {
            const otherUser = channel.users.find(u => u.email !== userEmail) || null;
            return {
              channelId,
              otherUser,
              isAlone: channel.users.length === 1
            };
          }
        }
      }

      return {
        channelId: null,
        otherUser: null,
        isAlone: false
      };
    } catch (error) {
      logger.error('Failed to get user channel session:', error);
      return {
        channelId: null,
        otherUser: null,
        isAlone: false
      };
    }
  }

  // Send a message with translation
  async sendMessage(
    channelId: string,
    senderEmail: string,
    senderName: string,
    senderLanguage: 'en' | 'ms' | 'zh' | 'my' | 'bn',
    originalText: string
  ): Promise<TranslationResponse> {
    try {
      logger.info('Sending message', { channelId, senderEmail, textLength: originalText.length });

      // Get other user's language for translation
      const channelRef = doc(db, this.channelsCollection, channelId);
      const channelDoc = await getDoc(channelRef);

      if (!channelDoc.exists()) {
        return {
          success: false,
          message: 'Channel does not exist'
        };
      }

      const channel = channelDoc.data() as TranslationChannel;
      const otherUser = channel.users.find(u => u.email !== senderEmail);

      let translatedText = originalText;

      // Only translate if there's another user with different language
      if (otherUser && otherUser.language !== senderLanguage) {
        try {
          console.log('🔄 DEBUG: Attempting translation', {
            from: senderLanguage,
            to: otherUser.language,
            textLength: originalText.length
          });
          translatedText = await this.translateText(originalText, senderLanguage, otherUser.language);
          console.log('✅ DEBUG: Translation successful');
        } catch (translationError) {
          console.warn('⚠️ DEBUG: Translation failed, saving message with original text:', translationError);
          logger.error('Translation failed, using original text:', translationError);
          translatedText = originalText; // Use original text, don't add error prefix
        }
      }

      // Save message (guaranteed to save even if translation fails)
      const message: Omit<ChannelMessage, 'id'> = {
        channelId,
        senderId: senderEmail,
        senderName,
        senderLanguage,
        originalText,
        translatedText,
        timestamp: new Date(),
        isSystemMessage: false
      };

      console.log('💾 DEBUG: Saving message to Firestore', {
        channelId,
        sender: senderName,
        textLength: originalText.length
      });

      await addDoc(collection(db, this.messagesCollection), message);

      console.log('✅ DEBUG: Message saved successfully to Firestore');

      // Update channel activity
      await updateDoc(channelRef, {
        lastActivity: new Date()
      });

      logger.info('Message sent successfully', { channelId, senderEmail });
      return {
        success: true,
        message: 'Message sent successfully'
      };
    } catch (error) {
      logger.error('Failed to send message:', error);
      return {
        success: false,
        message: 'Failed to send message'
      };
    }
  }

  // Send system message (join/leave notifications)
  private async sendSystemMessage(channelId: string, text: string): Promise<void> {
    try {
      const message: Omit<ChannelMessage, 'id'> = {
        channelId,
        senderId: 'system',
        senderName: 'System',
        senderLanguage: 'en',
        originalText: text,
        translatedText: text,
        timestamp: new Date(),
        isSystemMessage: true
      };

      await addDoc(collection(db, this.messagesCollection), message);
    } catch (error) {
      logger.error('Failed to send system message:', error);
    }
  }

  // Get messages for a channel
  async getChannelMessages(channelId: string, limit: number = 50): Promise<ChannelMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, this.messagesCollection),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'desc'),
        // Note: Firestore limit would be added here, but we'll sort in memory
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();

        // Safe timestamp conversion
        let timestamp: Date;
        try {
          if (data.timestamp?.toDate) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp instanceof Date) {
            timestamp = data.timestamp;
          } else {
            timestamp = new Date(data.timestamp || Date.now());
          }
        } catch (timestampError) {
          console.warn('🔧 DEBUG: Timestamp conversion failed in getChannelMessages', timestampError);
          timestamp = new Date();
        }

        return {
          id: doc.id,
          ...data,
          timestamp
        } as ChannelMessage;
      });

      // Sort by timestamp (latest first) and apply limit
      return messages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
        .reverse(); // Reverse for chronological order (oldest first)
    } catch (error) {
      logger.error('Failed to get channel messages:', error);
      return [];
    }
  }

  // Listen to real-time messages
  subscribeToChannelMessages(
    channelId: string,
    callback: (messages: ChannelMessage[]) => void
  ): () => void {
    logger.info('Subscribing to channel messages', { channelId });

    const messagesQuery = query(
      collection(db, this.messagesCollection),
      where('channelId', '==', channelId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      try {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();

          // Safe timestamp conversion
          let timestamp: Date;
          try {
            if (data.timestamp?.toDate) {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp instanceof Date) {
              timestamp = data.timestamp;
            } else {
              timestamp = new Date(data.timestamp || Date.now());
            }
          } catch (timestampError) {
            console.warn('🔧 DEBUG: Timestamp conversion failed, using current time', timestampError);
            timestamp = new Date();
          }

          return {
            id: doc.id,
            ...data,
            timestamp
          } as ChannelMessage;
        });

        console.log('🔔 DEBUG: Messages subscription update', {
          channelId,
          messageCount: messages.length,
          latestMessage: messages[messages.length - 1]?.originalText || 'none',
          allMessages: messages.map(m => ({ sender: m.senderName, text: m.originalText, time: m.timestamp }))
        });

        callback(messages);
      } catch (processingError) {
        console.error('🚨 DEBUG: Error processing messages in subscription:', processingError);
        logger.error('Error processing messages in subscription:', processingError);
        // Still call callback with empty array to prevent UI hanging
        callback([]);
      }
    }, (error) => {
      console.error('🚨 DEBUG: Error in messages subscription:', error);
      logger.error('Error in messages subscription:', error);

      // Retry subscription after 5 seconds
      setTimeout(() => {
        console.log('🔄 DEBUG: Retrying message subscription for channel', channelId);
        this.subscribeToChannelMessages(channelId, callback);
      }, 5000);
    });
  }

  // Listen to real-time channel status
  subscribeToChannelStatuses(
    callback: (statuses: ChannelStatus[]) => void
  ): () => void {
    logger.info('Subscribing to channel statuses');

    // Create individual subscriptions for each channel
    const unsubscribes: (() => void)[] = [];
    const channelData: { [key: string]: TranslationChannel } = {};

    const updateCallback = () => {
      const statuses: ChannelStatus[] = this.CHANNEL_IDS.map(channelId => {
        const channel = channelData[channelId];
        if (channel) {
          return {
            channelId,
            isAvailable: channel.users.length < 2,
            userCount: channel.users.length,
            users: channel.users.map(u => ({ name: u.name, language: u.language }))
          };
        } else {
          return {
            channelId,
            isAvailable: true,
            userCount: 0,
            users: []
          };
        }
      });

      callback(statuses);
    };

    for (const channelId of this.CHANNEL_IDS) {
      const channelRef = doc(db, this.channelsCollection, channelId);

      const unsubscribe = onSnapshot(channelRef, (doc) => {
        if (doc.exists()) {
          channelData[channelId] = { id: channelId, ...doc.data() } as TranslationChannel;
        } else {
          delete channelData[channelId];
        }
        updateCallback();
      }, (error) => {
        logger.error('Error in channel subscription:', error);
      });

      unsubscribes.push(unsubscribe);
    }

    // Return function to unsubscribe from all channels
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }

  // Translate text using Gemini
  private async translateText(
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<string> {
    try {
      if (!geminiService.isConfigured()) {
        logger.warn('Gemini not configured, returning original text');
        return text;
      }

      const languageNames = {
        en: 'English',
        ms: 'Malay',
        zh: 'Chinese',
        my: 'Myanmar',
        bn: 'Bengali'
      };

      const prompt = `You are a friendly translation assistant helping warehouse workers communicate. Translate the following text to ${languageNames[toLanguage as keyof typeof languageNames]}.

GUIDELINES:
- Auto-detect the actual language of the input text (ignore any declared language)
- If the text is already in the target language, return it as-is
- If something seems weird, unclear, or potentially problematic, feel free to mention it briefly
- If you detect inappropriate content, technical errors, or confusing messages, you can add a note
- Handle mixed languages intelligently
- Be helpful and conversational when needed

Text to translate:
${text}`;

      const translation = await geminiService.generateResponse(prompt, []);
      logger.info('Translation completed', { fromLanguage, toLanguage, originalLength: text.length, translatedLength: translation.length });

      return translation;
    } catch (error) {
      logger.error('Translation failed:', error);
      throw error;
    }
  }

  // Clear all messages from a channel
  private async clearChannelMessages(channelId: string): Promise<void> {
    try {
      logger.info('Clearing messages for channel', { channelId });

      // Query all messages for this channel
      const messagesQuery = query(
        collection(db, this.messagesCollection),
        where('channelId', '==', channelId)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      // Delete all messages
      const deletePromises = messagesSnapshot.docs.map(messageDoc =>
        deleteDoc(messageDoc.ref)
      );

      await Promise.all(deletePromises);

      logger.info('Successfully cleared channel messages', {
        channelId,
        deletedCount: messagesSnapshot.size
      });
    } catch (error) {
      logger.error('Failed to clear channel messages:', error);
    }
  }

  // Cleanup inactive channels (called periodically)
  async cleanupInactiveChannels(): Promise<void> {
    try {
      logger.info('Cleaning up inactive channels');

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      for (const channelId of this.CHANNEL_IDS) {
        const channelRef = doc(db, this.channelsCollection, channelId);
        const channelDoc = await getDoc(channelRef);

        if (channelDoc.exists()) {
          const channelData = channelDoc.data();

          // Convert Firestore timestamps to Date objects properly
          const channel: TranslationChannel = {
            ...channelData,
            lastActivity: channelData.lastActivity?.toDate ? channelData.lastActivity.toDate() : new Date(channelData.lastActivity || Date.now()),
            createdAt: channelData.createdAt?.toDate ? channelData.createdAt.toDate() : new Date(channelData.createdAt || Date.now()),
            users: channelData.users?.map((user: any) => ({
              ...user,
              joinedAt: user.joinedAt?.toDate ? user.joinedAt.toDate() : new Date(user.joinedAt || Date.now())
            })) || []
          } as TranslationChannel;

          // Complete cleanup after 5 minutes of inactivity
          // Additional safety checks:
          // 1. Don't cleanup if any user joined recently (within 60 seconds)
          // 2. Don't cleanup if channel was created recently (within 60 seconds)
          const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
          const hasRecentUsers = channel.users.some(user => user.joinedAt > sixtySecondsAgo);
          const channelCreatedRecently = channel.createdAt && channel.createdAt > sixtySecondsAgo;

          // Debug logging to understand what's happening
          if (channel.users.length > 0) {
            const timeDiffMinutes = (Date.now() - channel.lastActivity.getTime()) / 1000 / 60;
            console.log('🔍 DEBUG: Channel activity analysis', {
              channelId,
              userCount: channel.users.length,
              lastActivity: channel.lastActivity,
              lastActivityString: channel.lastActivity.toISOString(),
              fiveMinutesAgo: fiveMinutesAgo.toISOString(),
              timeDiffMinutes: timeDiffMinutes.toFixed(2),
              hasRecentUsers,
              channelCreatedRecently,
              willCleanup: channel.lastActivity < fiveMinutesAgo && !hasRecentUsers && !channelCreatedRecently
            });

            logger.info('Channel activity check', {
              channelId,
              userCount: channel.users.length,
              lastActivity: channel.lastActivity,
              fiveMinutesAgo,
              hasRecentUsers,
              channelCreatedRecently,
              willCleanup: channel.lastActivity < fiveMinutesAgo && !hasRecentUsers && !channelCreatedRecently
            });
          }

          if (channel.lastActivity < fiveMinutesAgo && channel.users.length > 0 && !hasRecentUsers && !channelCreatedRecently) {
            console.log('🚨 DEBUG: FORCING USERS TO LEAVE CHANNEL!', {
              channelId,
              reason: '5 minutes of inactivity',
              userCount: channel.users.length,
              lastActivity: channel.lastActivity,
              fiveMinutesAgo,
              timeDiff: (Date.now() - channel.lastActivity.getTime()) / 1000 / 60
            });
            logger.info('Cleaning up inactive channel - removing users and clearing messages', { channelId, lastActivity: channel.lastActivity });

            // Remove all users and mark as unoccupied
            await updateDoc(channelRef, {
              users: [],
              isOccupied: false,
              lastActivity: new Date()
            });

            // Clear all messages
            await this.clearChannelMessages(channelId);
            await this.sendSystemMessage(channelId, 'Channel cleared due to 5 minutes of inactivity');
          }
        }
      }

      logger.info('Inactive channels cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup inactive channels:', error);
    }
  }
}

// Export singleton instance
export const translationChannelService = new TranslationChannelService();