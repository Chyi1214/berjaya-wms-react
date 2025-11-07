// Personal Settings Component - User preferences for display name and language
import { useState, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { userManagementService } from '../services/userManagement';
import LanguageSwitcher from './LanguageSwitcher';

interface PersonalSettingsProps {
  user: User;
  onClose: () => void;
}

export function PersonalSettings({ user, onClose }: PersonalSettingsProps) {
  const { refreshUserRecord } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [useDisplayName, setUseDisplayName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    // Save original body overflow
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    // Cleanup: restore original values
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const userRecord = await userManagementService.getUserRecord(user.email);
        if (userRecord) {
          setDisplayName(userRecord.displayName || user.displayName || '');
          setUseDisplayName(userRecord.useDisplayName || false);
        } else {
          // Fallback to Google display name
          setDisplayName(user.displayName || '');
          setUseDisplayName(false);
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
        setDisplayName(user.displayName || '');
        setUseDisplayName(false);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user.email, user.displayName]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert('Display name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving display name:', {
        email: user.email,
        displayName: displayName.trim(),
        useDisplayName
      });

      // Update user record with display name preferences
      await userManagementService.updateUserDisplayName(user.email, {
        displayName: displayName.trim(),
        useDisplayName
      });

      console.log('✅ Display name saved to Firestore');

      // Refresh the user record in auth context
      await refreshUserRecord();

      console.log('✅ User record refreshed in auth context');

      alert('Settings saved successfully!');
      onClose();
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      alert(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDisplayName(user.displayName || user.email);
    setUseDisplayName(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        touchAction: 'pan-y'
      }}
    >
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 shadow-lg flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">Personal Settings</h1>
            <p className="text-sm text-white/80">Customize your profile and preferences</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div className="p-6 max-w-2xl mx-auto">
          {/* Current User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User avatar"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Logged in as:</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Display Name Settings */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Display Name</h3>
            
            {/* Display Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your preferred display name"
                maxLength={30}
              />
              <p className="mt-1 text-xs text-gray-500">
                This name will appear instead of your email in most places
              </p>
            </div>

            {/* Use Display Name Toggle */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Use Display Name</p>
                <p className="text-sm text-gray-600">Show preferred name instead of email</p>
              </div>
              <button
                type="button"
                onClick={() => setUseDisplayName(!useDisplayName)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useDisplayName ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useDisplayName ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              <p className="font-medium text-gray-900">
                {useDisplayName && displayName.trim() ? displayName.trim() : user.email}
              </p>
            </div>
          </div>

          {/* Language Settings */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Language</h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <LanguageSwitcher size="lg" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pb-6">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalSettings;