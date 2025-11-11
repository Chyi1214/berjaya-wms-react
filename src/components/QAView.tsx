// Quality Assurance View - Car Inspection System (Worker Interface Only)
import React, { useState } from 'react';
import { QAViewProps } from '../types';
import QAInspectionContainer from './qa/inspection/QAInspectionContainer';
import QAStockView from './qa/stock/QAStockView';
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';
import { TranslationChannels } from './chat/TranslationChannels';
import { useAuth } from '../contexts/AuthContext';

type QATabType = 'inspection' | 'stock';

const QAView: React.FC<QAViewProps> = ({ user, onBack }) => {
  const { getUserDisplayName } = useAuth();
  const [activeTab, setActiveTab] = useState<QATabType>('inspection');
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showTranslationChannels, setShowTranslationChannels] = useState(false);

  // Get user display name from auth context (includes custom display name)
  const userName = getUserDisplayName();

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

            {/* Tab Navigation */}
            <div className="ml-8 flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('inspection')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'inspection'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📋 Inspection
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'stock'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📦 Stock
              </button>
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
        {activeTab === 'inspection' && (
          <QAInspectionContainer
            userEmail={user.email}
            userName={userName}
          />
        )}
        {activeTab === 'stock' && (
          <QAStockView />
        )}
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
