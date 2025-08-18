// Role Selection Component - Choose user role after login
import { UserRole, RoleInfo, type RoleSelectionProps } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import VersionFooter from './VersionFooter';

// Role definitions with icons and colors (will be translated)
const getRoles = (t: (key: string) => string): RoleInfo[] => [
  {
    id: UserRole.LOGISTICS,
    name: t('roles.logistics'),
    description: t('roles.logisticsDesc'),
    icon: '📦',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: UserRole.PRODUCTION,
    name: t('roles.production'),
    description: t('roles.productionDesc'),
    icon: '🏭',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: UserRole.MANAGER,
    name: t('roles.manager'),
    description: t('roles.managerDesc'),
    icon: '📊',
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

export function RoleSelection({ user, onRoleSelect, onLogout }: RoleSelectionProps) {
  const { t } = useLanguage();
  const roles = getRoles(t);

  // Handle role button click
  const handleRoleClick = (role: UserRole) => {
    console.log(`Role selected: ${role}`);
    onRoleSelect(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 relative">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">B</span>
            </div>
            {/* Language Switcher */}
            <div className="absolute top-0 right-0">
              <LanguageSwitcher size="sm" />
            </div>
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
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-left">
                <p className="text-sm text-gray-600">{t('auth.loggedInAs')}:</p>
                <p className="font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Buttons */}
        <div className="space-y-4 mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleRoleClick(role.id)}
              className={`w-full p-6 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 text-white font-medium ${role.color} focus:ring-${role.color.split('-')[1]}-300`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{role.icon}</div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-semibold">{role.name}</h3>
                  <p className="text-white/90 text-sm">{role.description}</p>
                </div>
                <div className="text-white/75">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
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
  );
}

export default RoleSelection;