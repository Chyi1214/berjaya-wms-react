// Translation Channels Component - 5-Channel List View
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translationChannelService } from '../../services/translationChannelService';
import { ChannelStatus, UserChannelSession } from '../../types/translationChat';
import { TranslationChatRoom } from './TranslationChatRoom';

interface TranslationChannelsProps {
  onClose: () => void;
}

export function TranslationChannels({ onClose }: TranslationChannelsProps) {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const [channelStatuses, setChannelStatuses] = useState<ChannelStatus[]>([]);
  const [userSession, setUserSession] = useState<UserChannelSession>({ channelId: null, otherUser: null, isAlone: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize channels and load statuses
  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        console.log('🔧 DEBUG: Translation Channels modal opened - starting initialization');
        setLoading(true);
        await translationChannelService.initializeChannels();

        // Load initial statuses
        const statuses = await translationChannelService.getChannelStatuses();
        setChannelStatuses(statuses);

        // Check user's current session
        if (user?.email) {
          const session = await translationChannelService.getUserChannelSession(user.email);
          setUserSession(session);
        }
      } catch (err) {
        console.error('Failed to initialize translation channels:', err);
        setError('Failed to load translation channels');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, [user?.email]);

  // Subscribe to real-time channel updates
  useEffect(() => {
    const unsubscribe = translationChannelService.subscribeToChannelStatuses((statuses) => {
      setChannelStatuses(statuses);
    });

    return () => unsubscribe();
  }, []);

  // Check user session changes and cleanup inactive channels
  useEffect(() => {
    const checkSessionAndCleanup = async () => {
      if (user?.email) {
        const session = await translationChannelService.getUserChannelSession(user.email);
        setUserSession(session);
      }

      // Run cleanup every check to handle 2-minute inactivity
      try {
        await translationChannelService.cleanupInactiveChannels();
      } catch (error) {
        console.error('Failed to cleanup inactive channels:', error);
      }
    };

    const interval = setInterval(checkSessionAndCleanup, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [user?.email]);

  // Join a channel
  const handleJoinChannel = async (channelId: string) => {
    if (!user?.email || !user?.displayName) {
      setError('User information not available');
      return;
    }

    try {
      const result = await translationChannelService.joinChannel(
        channelId,
        user.email,
        user.displayName,
        currentLanguage
      );

      if (!result.success) {
        setError(result.message);
      } else {
        // Refresh user session
        const session = await translationChannelService.getUserChannelSession(user.email);
        setUserSession(session);
      }
    } catch (err) {
      console.error('Failed to join channel:', err);
      setError('Failed to join channel');
    }
  };

  // Leave current channel
  const handleLeaveChannel = async () => {
    if (!user?.email) return;

    try {
      const result = await translationChannelService.leaveChannel(user.email);

      if (result.success) {
        setUserSession({ channelId: null, otherUser: null, isAlone: false });
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Failed to leave channel:', err);
      setError('Failed to leave channel');
    }
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

  // If user is in a channel, show the chat room
  if (userSession.channelId) {
    return (
      <TranslationChatRoom
        channelId={userSession.channelId}
        otherUser={userSession.otherUser}
        isAlone={userSession.isAlone}
        onLeave={handleLeaveChannel}
        onClose={onClose}
      />
    );
  }

  // Show channel list
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            🌍 Translation Chat
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Current language display */}
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getLanguageFlag(currentLanguage)}</span>
            <span className="text-sm text-gray-600">
              Your language: <strong>{getLanguageName(currentLanguage)}</strong>
            </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border-b">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading channels...</div>
          </div>
        )}

        {/* Channel list */}
        {!loading && (
          <div className="p-4">
            <div className="space-y-3">
              {channelStatuses.map((status) => (
                <div
                  key={status.channelId}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {status.channelId.replace('_', ' ').toUpperCase()}
                      </h3>

                      {/* Channel status */}
                      {status.userCount === 0 && (
                        <p className="text-sm text-gray-500">Available</p>
                      )}

                      {status.userCount === 1 && (
                        <div className="text-sm text-yellow-600">
                          <p>1 user waiting:</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span>{getLanguageFlag(status.users[0].language)}</span>
                            <span>{status.users[0].name}</span>
                          </div>
                        </div>
                      )}

                      {status.userCount === 2 && (
                        <div className="text-sm text-red-600">
                          <p>Full (2/2):</p>
                          <div className="flex items-center gap-2 mt-1">
                            {status.users.map((user, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <span>{getLanguageFlag(user.language)}</span>
                                <span>{user.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Join button */}
                    <div className="ml-4">
                      {status.isAvailable ? (
                        <button
                          onClick={() => handleJoinChannel(status.channelId)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Join
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                        >
                          Full
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Maximum 2 people per channel</li>
                <li>• Messages auto-translate between languages</li>
                <li>• You can only be in one channel at a time</li>
                <li>• Channels clear after 30 minutes of inactivity</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslationChannels;