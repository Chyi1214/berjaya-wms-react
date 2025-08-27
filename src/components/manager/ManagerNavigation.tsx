// Manager Navigation Component - Handles category and tab navigation
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryCountEntry, Transaction, ItemMaster } from '../../types';
import { ManagerTab, ManagerCategory } from '../../types/manager';

interface ManagerNavigationProps {
  activeTab: ManagerTab;
  activeCategory: ManagerCategory;
  tableData: {
    checked: InventoryCountEntry[];
    expected: InventoryCountEntry[];
    yesterday: InventoryCountEntry[];
  };
  transactions: Transaction[];
  items: ItemMaster[];
  onCategoryChange: (category: ManagerCategory) => void;
  onTabChange: (tab: ManagerTab) => void;
}

export function ManagerNavigation({
  activeTab,
  activeCategory,
  tableData,
  transactions,
  items,
  onCategoryChange,
  onTabChange
}: ManagerNavigationProps) {
  const { t } = useLanguage();
  const { isDevAdmin, hasPermission } = useAuth();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Main Category Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <nav className="flex space-x-6 px-6 py-2" aria-label="Main Categories">
          <button
            onClick={() => onCategoryChange('inventory')}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              activeCategory === 'inventory'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            📦 {t('manager.tabs.inventory')}
          </button>

          {/* Production Category - V4.0 */}
          <button
            onClick={() => onCategoryChange('production')}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              activeCategory === 'production'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            🏭 {t('manager.tabs.productionLine')}
          </button>

          {/* QA Category - NEW */}
          <button
            onClick={() => onCategoryChange('qa')}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              activeCategory === 'qa'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            🔬 {t('manager.tabs.qa')}
          </button>

          {/* Operations Category - For batch management */}
          <button
            onClick={() => onCategoryChange('operations')}
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
              activeCategory === 'operations'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            ⚙️ {t('manager.tabs.operations')}
          </button>

          {/* HR Category - DevAdmin or HR permission required */}
          {(isDevAdmin || hasPermission('system.userManagement')) && (
            <button
              onClick={() => onCategoryChange('hr')}
              className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                activeCategory === 'hr'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              👥 {t('manager.tabs.hr')}
            </button>
          )}
        </nav>
      </div>

      {/* Sub-tabs based on category */}
      <div className="border-b border-gray-200">
        <nav className="flex overflow-x-auto space-x-2 sm:space-x-8 px-4 sm:px-6" aria-label="Sub Tabs">
          
          {/* Inventory Sub-tabs */}
          {activeCategory === 'inventory' && (
            <>
              <button
                onClick={() => onTabChange('overview')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">📊 {t('manager.subTabs.overview')}</span>
                <span className="sm:hidden">📊</span>
              </button>
              <button
                onClick={() => onTabChange('checked')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'checked'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">📋 {t('manager.subTabs.checked')} ({tableData.checked.length})</span>
                <span className="sm:hidden">📋 ({tableData.checked.length})</span>
              </button>
              <button
                onClick={() => onTabChange('expected')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'expected'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">📊 {t('manager.subTabs.expected')} ({tableData.expected.length})</span>
                <span className="sm:hidden">📊 ({tableData.expected.length})</span>
              </button>
              <button
                onClick={() => onTabChange('compared')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'compared'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">🔍 {t('manager.subTabs.compared')}</span>
                <span className="sm:hidden">🔍</span>
              </button>
              <button
                onClick={() => onTabChange('transaction')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'transaction'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">🔄 {t('manager.subTabs.transactions')} ({transactions.length})</span>
                <span className="sm:hidden">🔄 ({transactions.length})</span>
              </button>
              <button
                onClick={() => onTabChange('yesterday')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'yesterday'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">🗓️ {t('manager.subTabs.yesterday')} ({tableData.yesterday.length})</span>
                <span className="sm:hidden">🗓️ ({tableData.yesterday.length})</span>
              </button>
              <button
                onClick={() => onTabChange('itemmaster')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'itemmaster'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">📦 {t('manager.subTabs.itemMaster')} ({items.length})</span>
                <span className="sm:hidden">📦 ({items.length})</span>
              </button>
              <button
                onClick={() => onTabChange('scanner')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'scanner'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">🔍 {t('manager.subTabs.scanner')}</span>
                <span className="sm:hidden">🔍</span>
              </button>
            </>
          )}

          {/* QA Sub-tabs */}
          {activeCategory === 'qa' && (
            <button
              onClick={() => onTabChange('qa')}
              className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === 'qa'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">🔬 Quality Assurance</span>
              <span className="sm:hidden">🔬 QA</span>
            </button>
          )}

          {/* Operations Sub-tabs */}
          {activeCategory === 'operations' && (
            <button
              onClick={() => onTabChange('operations')}
              className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === 'operations'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">⚙️ Operations Center</span>
              <span className="sm:hidden">⚙️</span>
            </button>
          )}

          {/* HR Sub-tabs */}
          {activeCategory === 'hr' && (isDevAdmin || hasPermission('system.userManagement')) && (
            <button
              onClick={() => onTabChange('hr')}
              className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === 'hr'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">👥 {t('manager.subTabs.userManagement')}</span>
              <span className="sm:hidden">👥</span>
            </button>
          )}

          {/* Production Sub-tabs - V4.0 */}
          {activeCategory === 'production' && (
            <>
              <button
                onClick={() => onTabChange('production_line')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'production_line'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">🚗 Production Line</span>
                <span className="sm:hidden">🚗</span>
              </button>
              <button
                onClick={() => onTabChange('production_stats')}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === 'production_stats'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="hidden sm:inline">📊 Statistics</span>
                <span className="sm:hidden">📊</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}