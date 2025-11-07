// Ela Service - Phase 2: Real AI integration with Gemini
import { collection, addDoc, doc, setDoc, getDocs, getDoc, query, orderBy, where } from './costTracking/firestoreWrapper';
import { db } from './firebase';
import { ElaConversation, ElaMessage } from '../types/ela';
import { geminiService } from './geminiService';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ElaService');

class ElaService {
  private conversationsCollection = 'elaConversations';
  private messagesCollection = 'elaMessages';

  /**
   * Start a new conversation
   */
  async startConversation(
    userId: string, 
    userEmail: string, 
    userRole: string, 
    userName: string
  ): Promise<string> {
    try {
      logger.info('Starting new Ela conversation', { userId, userRole });
      
      const conversation: Omit<ElaConversation, 'id'> = {
        userId,
        userEmail,
        userRole,
        userName,
        startTime: new Date(),
        lastMessageTime: new Date(),
        messageCount: 0,
        status: 'active'
      };

      const docRef = await addDoc(collection(db, this.conversationsCollection), conversation);
      logger.info('Conversation started', { conversationId: docRef.id });
      
      return docRef.id;
    } catch (error) {
      logger.error('Failed to start conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    role: 'user' | 'ela',
    content: string
  ): Promise<string> {
    try {
      logger.info('Sending message', { conversationId, role, contentLength: content.length });

      const message: Omit<ElaMessage, 'id'> = {
        conversationId,
        role,
        content,
        timestamp: new Date()
      };

      // Save message to Firestore
      const messageRef = await addDoc(collection(db, this.messagesCollection), message);

      // Update conversation metadata
      const conversationRef = doc(db, this.conversationsCollection, conversationId);
      await setDoc(conversationRef, {
        lastMessageTime: new Date(),
        messageCount: role === 'user' ? 1 : 0, // Simple increment for now
      }, { merge: true });

      logger.info('Message sent', { messageId: messageRef.id });
      return messageRef.id;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Get Ela's response using Gemini AI - Phase 2: Real AI integration
   */
  async getElaResponse(userMessage: string, conversationHistory: ElaMessage[] = []): Promise<string> {
    try {
      logger.info('Generating Ela response with Gemini AI', { userMessageLength: userMessage.length });
      
      // Check if Gemini is properly configured
      if (!geminiService.isConfigured()) {
        logger.warn('Gemini not configured, falling back to simple responses');
        return this.getFallbackResponse(userMessage);
      }

      // Convert ElaMessage format to simple format for Gemini
      const historyForGemini = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get AI response from Gemini
      const aiResponse = await geminiService.generateResponse(userMessage, historyForGemini);
      
      logger.info('Generated Gemini response successfully');
      return aiResponse;

    } catch (error) {
      logger.error('Failed to generate Gemini response, using fallback:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Fallback response system when Gemini is not available
   */
  private getFallbackResponse(userMessage: string): string {
    // Simple responses based on keywords (Phase 1 logic as backup)
    const message = userMessage.toLowerCase();
    
    if (message.includes('scanner') || message.includes('scan')) {
      return "I see you're having scanner issues! That can be really frustrating. Can you tell me more about what's happening? Is the camera showing a black screen or is it not reading the barcode?";
    } else if (message.includes('slow') || message.includes('loading')) {
      return "Slow loading is definitely annoying when you're trying to get work done. How long is it taking? Is this happening on all pages or just specific ones?";
    } else if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm here to help with any warehouse issues or just to listen. What's on your mind?";
    } else if (message.includes('thank')) {
      return "You're welcome! I'm here whenever you need to talk about work issues. Is there anything else I can help with?";
    } else {
      return `I hear you about "${userMessage}". That sounds like it could be frustrating. Can you tell me more about when this happens and how it affects your work?`;
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getConversationMessages(conversationId: string): Promise<ElaMessage[]> {
    try {
      logger.info('Getting conversation messages', { conversationId });
      
      const messagesQuery = query(
        collection(db, this.messagesCollection),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );
      
      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate() // Convert Firestore Timestamp to Date
        };
      }) as ElaMessage[];

      logger.info('Retrieved conversation messages', { conversationId, messageCount: messages.length });
      return messages;
    } catch (error) {
      logger.error('Failed to get conversation messages:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for the manager dashboard
   */
  async getAllConversations(): Promise<ElaConversation[]> {
    try {
      logger.info('Getting all conversations for manager dashboard');
      
      const conversationsQuery = query(
        collection(db, this.conversationsCollection),
        orderBy('lastMessageTime', 'desc')
      );
      
      const snapshot = await getDocs(conversationsQuery);
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ElaConversation[];

      logger.info('Retrieved conversations', { count: conversations.length });
      return conversations;
    } catch (error) {
      logger.error('Failed to get conversations:', error);
      throw error;
    }
  }

  /**
   * Close a conversation and generate AI summary
   */
  async closeConversation(conversationId: string): Promise<void> {
    try {
      logger.info('Closing conversation and generating summary', { conversationId });
      
      // Generate AI summary when closing the conversation
      let summary = '';
      try {
        summary = await this.generateAndSaveConversationSummary(conversationId);
        logger.info('Generated summary for closed conversation', { conversationId, summaryLength: summary.length });
      } catch (summaryError) {
        logger.error('Failed to generate summary for closed conversation:', summaryError);
        summary = 'Summary generation failed';
      }

      // Close conversation and save summary
      const conversationRef = doc(db, this.conversationsCollection, conversationId);
      await setDoc(conversationRef, {
        status: 'closed',
        lastMessageTime: new Date(),
        summary: summary
      }, { merge: true });

      logger.info('Conversation closed with summary', { conversationId });
    } catch (error) {
      logger.error('Failed to close conversation:', error);
      throw error;
    }
  }

  /**
   * Generate and save conversation summary to Firestore (called when conversation ends)
   */
  async generateAndSaveConversationSummary(conversationId: string): Promise<string> {
    try {
      logger.info('Generating and saving conversation summary', { conversationId });
      
      const messages = await this.getConversationMessages(conversationId);
      
      if (messages.length === 0) {
        return "No messages in this conversation.";
      }

      // Check if Gemini is properly configured
      if (!geminiService.isConfigured()) {
        logger.warn('Gemini not configured, using fallback summary');
        return this.getFallbackSummary(messages);
      }

      // Convert ElaMessage format to simple format for Gemini
      const messagesForSummary = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Use Gemini 2.0 Flash to generate intelligent summary
      const aiSummary = await geminiService.generateSummary(messagesForSummary);
      
      logger.info('Generated and will save AI conversation summary', { conversationId, summaryLength: aiSummary.length });
      return aiSummary;

    } catch (error) {
      logger.error('Failed to generate AI conversation summary:', error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Get existing conversation summary or generate if missing (for manager dashboard)
   */
  async generateConversationSummary(conversationId: string): Promise<string> {
    try {
      logger.info('Getting conversation summary', { conversationId });
      
      // First, check if summary already exists in the conversation
      const conversationRef = doc(db, this.conversationsCollection, conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        const conversationData = conversationDoc.data() as ElaConversation;
        if (conversationData.summary) {
          logger.info('Using existing saved summary', { conversationId });
          return conversationData.summary;
        }
      }

      // If no saved summary, generate one
      logger.info('No saved summary found, generating new one', { conversationId });
      return await this.generateAndSaveConversationSummary(conversationId);

    } catch (error) {
      logger.error('Failed to get conversation summary, using fallback:', error);
      return this.getFallbackSummary(await this.getConversationMessages(conversationId));
    }
  }

  /**
   * Fallback summary generation when AI is unavailable
   */
  private getFallbackSummary(messages: ElaMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    
    if (userMessages.length === 0) {
      return "No user messages in this conversation.";
    }

    // Simple keyword-based fallback
    const allUserText = userMessages.map(m => m.content.toLowerCase()).join(' ');
    
    let summary = "User discussed: ";
    const topics = [];
    
    if (allUserText.includes('scanner')) topics.push('scanner issues');
    if (allUserText.includes('slow')) topics.push('slow performance');
    if (allUserText.includes('error')) topics.push('errors');
    if (allUserText.includes('cannot') || allUserText.includes('not work')) topics.push('functionality problems');
    
    if (topics.length > 0) {
      summary += topics.join(', ');
    } else {
      summary += "general warehouse concerns";
    }
    
    summary += `. ${userMessages.length} messages from user.`;
    
    return summary;
  }
}

// Export singleton instance
export const elaService = new ElaService();