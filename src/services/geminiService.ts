// Gemini AI Service - Phase 2: Real AI responses using Google Gemini API
import { createModuleLogger } from './logger';

const logger = createModuleLogger('GeminiService');

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

class GeminiService {
  private apiKey: string;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  
  // Simple, natural system prompt for conversational Ela
  private systemPrompt = `You are Ela, a friendly AI helper for warehouse workers at Berjaya Autotech.

Keep your responses:
- Short and natural (1-2 sentences usually)
- In the same language as the user
- Warm but not overly formal
- Like talking to a coworker, not a customer service bot

Just listen and chat naturally about work problems. Don't be too structured or corporate.`;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    
    if (!this.apiKey) {
      logger.error('Gemini API key not found in environment variables');
    } else {
      logger.info('Gemini service initialized successfully');
    }
  }

  /**
   * Generate AI response using Gemini API
   */
  async generateResponse(userMessage: string, conversationHistory: { role: 'user' | 'ela'; content: string }[] = []): Promise<string> {
    if (!this.apiKey) {
      logger.error('Cannot generate response: API key not configured');
      return "I'm having trouble connecting to my AI service right now. Can you try again later?";
    }

    try {
      logger.info('Generating Gemini response', { messageLength: userMessage.length, historyLength: conversationHistory.length });

      // Convert conversation history to Gemini format
      const messages: GeminiMessage[] = [];
      
      // Add system prompt as first message
      messages.push({
        role: 'user',
        parts: [{ text: this.systemPrompt }]
      });
      
      messages.push({
        role: 'model',
        parts: [{ text: "I understand. I'm Ela, here to listen and help with any problems or concerns." }]
      });

      // Add conversation history (last 10 messages to keep context manageable)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'ela' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      // Make API call to Gemini
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error:', { status: response.status, error: errorText });
        return "I'm having trouble thinking right now. Could you try asking me that again?";
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        logger.error('No response candidates from Gemini');
        return "I'm not sure how to respond to that. Could you tell me more?";
      }

      const aiResponse = data.candidates[0].content.parts[0].text;
      logger.info('Generated Gemini response successfully', { responseLength: aiResponse.length });
      
      return aiResponse;

    } catch (error) {
      logger.error('Failed to generate Gemini response:', error);
      return "I'm having some technical difficulties right now. Can you try asking me again in a moment?";
    }
  }

  /**
   * Generate AI-powered conversation summary using Gemini 2.0 Flash
   */
  async generateSummary(messages: { role: 'user' | 'ela'; content: string }[]): Promise<string> {
    if (!this.apiKey) {
      logger.error('Cannot generate summary: API key not configured');
      return "Failed to generate summary - API key not configured";
    }

    try {
      logger.info('Generating AI summary with Gemini 2.0 Flash', { messageCount: messages.length });

      // Create focused prompt for summarization
      const summaryPrompt = `Summarize this warehouse worker conversation in 1-2 sentences.

Focus on:
1. The main problem/issue reported by the worker
2. The impact on the worker's job/workflow
3. Any specific system features mentioned (scanner, inventory, production, etc.)

Be specific - avoid generic terms like "general concerns". If the worker mentioned specific issues like stray dogs, scanner problems, or system slowness, include those details.

Conversation:
${messages.map(m => `${m.role === 'user' ? 'Worker' : 'Ela'}: ${m.content}`).join('\n')}

Summary:`;

      // Make API call to Gemini for summary
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: summaryPrompt }]
          }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more focused summaries
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 256, // Shorter output for summaries
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error for summary:', { status: response.status, error: errorText });
        return "Failed to generate AI summary";
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        logger.error('No summary candidates from Gemini');
        return "Failed to generate AI summary";
      }

      const summary = data.candidates[0].content.parts[0].text.trim();
      logger.info('Generated AI summary successfully', { summaryLength: summary.length });
      
      return summary;

    } catch (error) {
      logger.error('Failed to generate AI summary:', error);
      return "Failed to generate AI summary";
    }
  }

  /**
   * Check if Gemini service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      model: 'gemini-2.0-flash-exp',
      apiUrl: this.apiUrl
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();