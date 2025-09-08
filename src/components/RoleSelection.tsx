// Role Selection Component - Choose user role after login
import { useState } from 'react';
import { UserRole, RoleInfo, type RoleSelectionProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';
import PersonalSettings from './PersonalSettings';
import VersionFooter from './VersionFooter';
import { getDisplayName, getUserInitial } from '../utils/displayName';

// Role definitions with icons and colors (will be translated)
const getRoles = (t: (key: string) => string): RoleInfo[] => [
  {
    id: UserRole.LOGISTICS,
    name: t('roles.logistics'),
    icon: '📦',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: UserRole.PRODUCTION,
    name: t('roles.production'),
    icon: '🔧',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: UserRole.QA,
    name: t('roles.qa'),
    icon: '✅',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    id: UserRole.MANAGER,
    name: t('roles.manager'),
    icon: '📊',
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

export function RoleSelection({ user, onRoleSelect, onLogout }: RoleSelectionProps) {
  const { t } = useLanguage();
  const { authenticatedUser, isDevAdmin } = useAuth(); // Get authenticated user and dev admin status
  const roles = getRoles(t);
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);

  const userRole = authenticatedUser?.userRecord?.role;

  // Handle role button click
  const handleRoleClick = (role: UserRole) => {
    console.log(`Role selected: ${role}`);
    onRoleSelect(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <img 
              src="/assets/Berjaya_AutotechLogo.png" 
              alt="Berjaya Autotech" 
              className="w-8 h-8 object-contain"
            />
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👤</span>
              <h1 className="text-lg font-bold text-gray-900">{t('roles.selectRole')}</h1>
            </div>
          </div>

          {/* Hamburger Menu */}
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

            {/* Menu Dropdown */}
            {showElaMenu && (
              <ElaMenu
                onChatOpen={() => setShowElaChat(true)}
                onPersonalSettingsOpen={() => setShowPersonalSettings(true)}
                onClose={() => setShowElaMenu(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img 
                src="/assets/Berjaya_AutotechLogo.png" 
                alt="Berjaya Autotech" 
                className="w-20 h-20 mx-auto mb-4 object-contain"
              />
            </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Berjaya WMS
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {t('roles.selectRole')}
          </h2>
          
          {/* User Info */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-center space-x-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User avatar"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {getUserInitial(user, authenticatedUser?.userRecord)}
                  </span>
                </div>
              )}
              <div className="text-left">
                <p className="text-sm text-gray-600">{t('auth.loggedInAs')}:</p>
                <p className="font-medium text-gray-900">
                  {getDisplayName(user, authenticatedUser?.userRecord)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Buttons */}
        <div className="space-y-4 mb-8">
          {roles.map((role) => {
            const isManager = userRole === UserRole.MANAGER;
            const isDisabled =
              !userRole || (!isManager && !isDevAdmin && role.id !== userRole);

            return (
              <button
                key={role.id}
                onClick={() => handleRoleClick(role.id)}
                disabled={isDisabled}
                className={`w-full p-6 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 text-white font-medium ${
                  isDisabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `${role.color} focus:ring-${role.color.split('-')[1]}-300`
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{role.icon}</div>
                  <div className="text-left flex-1">
                    <h3 className="text-xl font-semibold">{role.name}</h3>
                  </div>
                  <div className="text-white/75">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="text-center">
          <button
            onClick={onLogout}
            className="btn-secondary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('common.logout')}
          </button>
        </div>

        <VersionFooter className="mt-8" />
        </div>
      </div>

      {/* Ela Chat */}
      {showElaChat && (
        <ElaChat
          user={user}
          userRole={userRole || 'unknown'}
          onClose={() => setShowElaChat(false)}
        />
      )}

      {/* Personal Settings */}
      {showPersonalSettings && (
        <PersonalSettings
          user={user}
          onClose={() => setShowPersonalSettings(false)}
        />
      )}
    </div>
  );
}

export default RoleSelection;