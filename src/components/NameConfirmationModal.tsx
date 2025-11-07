// Name Confirmation Modal - One-time mandatory name entry
import { useState } from 'react';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { userManagementService } from '../services/userManagement';

interface NameConfirmationModalProps {
  user: User;
  onConfirm: () => void;
}

export function NameConfirmationModal({ user, onConfirm }: NameConfirmationModalProps) {
  const { userRecord } = useAuth();
  const [displayName, setDisplayName] = useState(
    userRecord?.displayName || user.displayName || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    // Validate
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save display name and mark as confirmed
      await userManagementService.updateUserDisplayName(user.email, {
        displayName: displayName.trim(),
        useDisplayName: true
      });

      // Mark name as confirmed (one-time flag)
      await userManagementService.updateUser(user.email, {
        hasConfirmedName: true
      });

      console.log('✅ Name confirmed:', displayName.trim());
      onConfirm();
    } catch (error) {
      console.error('Failed to confirm name:', error);
      setError('Failed to save name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Confirm Your Name
          </h2>
          <p className="text-gray-600 text-sm">
            Please confirm or update your display name.
            This will be shown in transactions and throughout the app.
          </p>
        </div>

        {/* Current User Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 mb-1">Logged in as:</div>
          <div className="font-medium text-gray-900">{user.email}</div>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setError(null);
            }}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            disabled={isLoading}
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
          />
          {error && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <span className="mr-1">⚠️</span>
              {error}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <div className="text-sm text-blue-800">
            ℹ️ You only need to do this once. You can change it later in Personal Settings.
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={isLoading || !displayName.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <span className="mr-2">⏳</span>
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">✓</span>
              Confirm Name
            </span>
          )}
        </button>

        {/* Note */}
        <div className="mt-4 text-center text-xs text-gray-500">
          This helps your colleagues identify you in the system
        </div>
      </div>
    </div>
  );
}

export default NameConfirmationModal;
