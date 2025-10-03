// Translation Chat Room Component - Chat Interface
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translationChannelService } from '../../services/translationChannelService';
import { ChannelMessage, ChannelUser } from '../../types/translationChat';

interface TranslationChatRoomProps {
  channelId: string;
  otherUser: ChannelUser | null;
  isAlone: boolean;
  onLeave: () => void;
  onClose: () => void;
}

export function TranslationChatRoom({
  channelId,
  otherUser,
  isAlone,
  onLeave,
  onClose
}: TranslationChatRoomProps) {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time messages (single effect to avoid race conditions)
  useEffect(() => {
    console.log('🔔 DEBUG: Setting up message subscription and initial load for channel', channelId);

    let isSubscribed = true;

    // Start real-time subscription immediately
    const unsubscribe = translationChannelService.subscribeToChannelMessages(
      channelId,
      (newMessages) => {
        if (!isSubscribed) return; // Ignore if component unmounted

        console.log('🔔 DEBUG: Chat room received messages update', {
          channelId,
          messageCount: newMessages.length,
          messages: newMessages.map(m => ({ sender: m.senderName, text: m.originalText }))
        });

        // Clear any connection errors when messages are received
        setConnectionError(null);
        setMessages(newMessages);
      }
    );

    // Also load initial messages as fallback (in case subscription is delayed)
    const loadInitialMessages = async () => {
      try {
        const initialMessages = await translationChannelService.getChannelMessages(channelId);

        if (isSubscribed) {
          console.log('🔔 DEBUG: Loaded initial messages as fallback', {
            channelId,
            messageCount: initialMessages.length
          });

          // Only set if we haven't received messages from subscription yet
          setMessages(prevMessages => {
            if (prevMessages.length === 0) {
              return initialMessages;
            }
            return prevMessages; // Keep subscription data if already loaded
          });
        }
      } catch (error) {
        console.error('🚨 DEBUG: Failed to load initial messages:', error);
        if (isSubscribed) {
          setConnectionError('Failed to load messages. Check your connection.');
        }
      }
    };

    // Load initial messages with a slight delay to let subscription establish
    setTimeout(loadInitialMessages, 100);

    return () => {
      console.log('🔔 DEBUG: Cleaning up message subscription for channel', channelId);
      isSubscribed = false;
      unsubscribe();
    };
  }, [channelId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user?.email || !user?.displayName || sending) {
      return;
    }

    setSending(true);

    try {
      const result = await translationChannelService.sendMessage(
        channelId,
        user.email,
        user.displayName,
        currentLanguage,
        newMessage.trim()
      );

      if (result.success) {
        setNewMessage('');
        setConnectionError(null); // Clear any previous errors
      } else {
        console.error('Failed to send message:', result.message);
        setConnectionError(`Failed to send: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionError('Failed to send message. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  // Handle leave channel
  const handleLeave = () => {
    onLeave();
  };

  // Get language flag emoji
  const getLanguageFlag = (language: string): string => {
    const flags = {
      en: '🇺🇸',
      ms: '🇲🇾',
      zh: '🇨🇳',
      my: '🇲🇲',
      bn: '🇧🇩'
    };
    return flags[language as keyof typeof flags] || '🌐';
  };

  // Get language name
  const getLanguageName = (language: string): string => {
    const names = {
      en: 'English',
      ms: 'Malay',
      zh: 'Chinese',
      my: 'Myanmar',
      bn: 'Bengali'
    };
    return names[language as keyof typeof names] || language;
  };

  // Format time
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {channelId.replace('_', ' ').toUpperCase()}
            </h2>

            {/* Participants */}
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                <span>{getLanguageFlag(currentLanguage)}</span>
                <span>You</span>
              </span>

              {otherUser ? (
                <>
                  <span className="text-gray-400">↔</span>
                  <span className="flex items-center gap-1">
                    <span>{getLanguageFlag(otherUser.language)}</span>
                    <span>{otherUser.name}</span>
                  </span>
                </>
              ) : (
                <span className="text-gray-500">(waiting...)</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLeave}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Leave
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Status message */}
        {isAlone && (
          <div className="p-3 bg-yellow-50 border-b">
            <p className="text-yellow-800 text-sm text-center">
              Waiting for someone to join... Share this channel with a colleague!
            </p>
          </div>
        )}

        {/* Connection error message */}
        {connectionError && (
          <div className="p-3 bg-red-50 border-b">
            <div className="flex items-center justify-between">
              <p className="text-red-800 text-sm">{connectionError}</p>
              <button
                onClick={() => setConnectionError(null)}
                className="text-red-600 text-xs underline ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === user?.email;
              const isSystemMessage = message.isSystemMessage;

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="text-center">
                    <p className="text-gray-500 text-sm italic">
                      {message.originalText}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                );
              }

              return (
                <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {/* Sender info */}
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs">
                        {getLanguageFlag(message.senderLanguage)}
                      </span>
                      <span className={`text-xs font-medium ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        {isOwnMessage ? 'You' : message.senderName}
                      </span>
                      <span className={`text-xs ${
                        isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    {/* Message content */}
                    <div className="space-y-1">
                      {/* Original text */}
                      <p className={`text-sm ${
                        isOwnMessage ? 'text-white' : 'text-gray-900'
                      }`}>
                        {message.originalText}
                      </p>

                      {/* Translation (if different) */}
                      {message.originalText !== message.translatedText && (
                        <>
                          <hr className={`border-t ${
                            isOwnMessage ? 'border-blue-400' : 'border-gray-300'
                          }`} />
                          <p className={`text-sm italic ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            {message.translatedText}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Type in ${getLanguageName(currentLanguage)}...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>

          {/* Language info */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            Messages will be translated {otherUser ? `to ${getLanguageName(otherUser.language)}` : 'when someone joins'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranslationChatRoom;