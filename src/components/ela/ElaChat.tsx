// Ela Chat Modal Component - Phase 1: Simple chat interface with Firestore
import React, { useState, useEffect, useRef } from 'react';
import { ElaChatProps, ElaMessage } from '../../types/ela';
import { elaService } from '../../services/elaService';

export function ElaChat({ user, userRole, onClose }: ElaChatProps) {
  const [messages, setMessages] = useState<ElaMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        setIsLoading(true);
        
        // Start new conversation
        const convId = await elaService.startConversation(
          user.uid,
          user.email,
          userRole,
          user.displayName || user.email
        );
        
        setConversationId(convId);
        
        // Send welcome message from Ela
        await elaService.sendMessage(
          convId,
          'ela',
          "Hi! I'm Ela 👋 I'm here to help with any warehouse issues or just to listen. What's on your mind today?"
        );
        
        // Load conversation messages
        const conversationMessages = await elaService.getConversationMessages(convId);
        setMessages(conversationMessages);
        
      } catch (error) {
        console.error('Failed to initialize Ela conversation:', error);
        // Fallback to offline mode
        const welcomeMessage: ElaMessage = {
          id: 'welcome-offline',
          conversationId: 'offline',
          role: 'ela',
          content: "Hi! I'm Ela 👋 I'm having trouble connecting right now, but I can still chat with you locally. What's on your mind?",
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeConversation();
  }, [user, userRole]);

  // Cleanup: Close conversation when chat is closed
  useEffect(() => {
    return () => {
      if (conversationId && conversationId !== 'offline') {
        elaService.closeConversation(conversationId).catch(console.error);
      }
    };
  }, [conversationId]);

  // Handle sending message using ElaService
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading || !conversationId) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    try {
      // Send user message to Firestore
      await elaService.sendMessage(conversationId, 'user', messageText);
      
      // Get Ela's response
      const elaResponse = await elaService.getElaResponse(messageText, messages);
      
      // Send Ela's response to Firestore
      await elaService.sendMessage(conversationId, 'ela', elaResponse);
      
      // Reload conversation messages to show both new messages
      const updatedMessages = await elaService.getConversationMessages(conversationId);
      setMessages(updatedMessages);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Fallback to local messages if Firestore fails
      const userMessage: ElaMessage = {
        id: `user-${Date.now()}`,
        conversationId: conversationId || 'offline',
        role: 'user', 
        content: messageText,
        timestamp: new Date()
      };

      const elaMessage: ElaMessage = {
        id: `ela-${Date.now()}`,
        conversationId: conversationId || 'offline',
        role: 'ela',
        content: "I'm having trouble saving our conversation right now, but I hear you! Can you try sending that message again?",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage, elaMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Chat Modal */}
      <div className="fixed inset-4 md:inset-8 lg:left-1/4 lg:right-1/4 lg:top-16 lg:bottom-16 bg-white rounded-lg shadow-xl z-50 flex flex-col max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💬</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chat with Ela</h2>
              <p className="text-sm text-gray-500">AI Assistant for Warehouse Workers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Logged in as: {user.displayName || user.email} ({userRole})
          </p>
        </div>
      </div>
    </>
  );
}