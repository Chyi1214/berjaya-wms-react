// Quality Assurance View - Car Inspection System (Worker Interface Only)
import React, { useState } from 'react';
import { QAViewProps } from '../types';
import QAInspectionContainer from './qa/inspection/QAInspectionContainer';
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';
import { TranslationChannels } from './chat/TranslationChannels';

const QAView: React.FC<QAViewProps> = ({ user, onBack }) => {
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showTranslationChannels, setShowTranslationChannels] = useState(false);

  // Get user display name or email
  const userName = user.displayName || user.email || 'QA Worker';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to role selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title */}
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-2xl">🔍</span>
              <h1 className="text-lg font-bold text-gray-900">
                Quality Assurance - Worker
              </h1>
            </div>

            {/* Right side buttons */}
            <div className="ml-auto flex items-center space-x-2">
              {/* Ela Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowElaMenu(!showElaMenu)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Ela Menu Dropdown */}
                {showElaMenu && (
                  <ElaMenu
                    onChatOpen={() => setShowElaChat(true)}
                    onTranslationChatOpen={() => {
                      setShowTranslationChannels(true);
                      setShowElaMenu(false);
                    }}
                    onPersonalSettingsOpen={() => {}}
                    onClose={() => setShowElaMenu(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-4">
        <QAInspectionContainer
          userEmail={user.email}
          userName={userName}
        />
      </main>

      {/* Ela Chat Modal */}
      {showElaChat && (
        <ElaChat
          user={user}
          userRole="qa"
          onClose={() => setShowElaChat(false)}
        />
      )}

      {/* Translation Chat Modal */}
      {showTranslationChannels && (
        <TranslationChannels
          onClose={() => setShowTranslationChannels(false)}
        />
      )}
    </div>
  );
};

export default QAView;
