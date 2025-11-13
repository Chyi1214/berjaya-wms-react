// Manager View Component - Refactored into modular components with V4.0 Production
import { Suspense, lazy, useState } from 'react';
import { User, InventoryCountEntry, Transaction } from '../../types';
import { isInventoryTab, isProductionTab, isQATab, isOperationsTab, isFeedbackTab } from '../../types/manager';
import { useLanguage } from '../../contexts/LanguageContext';
import VersionFooter from '../VersionFooter';
import { TranslationChannels } from '../chat/TranslationChannels';
import { ElaMenu } from '../ela/ElaMenu';
import { ElaChat } from '../ela/ElaChat';
import PersonalSettings from '../PersonalSettings';

// Custom hooks
import { useManagerState } from './hooks/useManagerState';
import { useTableData } from './hooks/useTableData';

// Manager components
import { ManagerNavigation } from './ManagerNavigation';
import { InventorySection } from './InventorySection';
import { HRSection } from './HRSection';
import { QASection } from './QASection';
import { ProductionSection } from './ProductionSection';
import { ElaSection } from './ElaSection';
import { ExcelTranslation } from './ExcelTranslation';
import { OperationsTab } from '../OperationsTab';
import { TaskManagementView } from '../operations/TaskManagementView';

// Lazy load the CSV Import Dialog
const CSVImportDialog = lazy(() => import('../CSVImportDialog'));

interface ManagerViewProps {
  user: User;
  onBack: () => void;
  inventoryCounts: InventoryCountEntry[];
  onClearCounts: () => void;
  transactions: Transaction[];
}

export function ManagerView({ user: _user, onBack, inventoryCounts, onClearCounts: _onClearCounts, transactions }: ManagerViewProps) {
  const { t } = useLanguage();

  // Use custom hooks for state management
  const managerState = useManagerState();
  const { tableData } = useTableData(inventoryCounts, transactions);

  // ELA Menu and Translation Chat state (same as other roles)
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [showTranslationChannels, setShowTranslationChannels] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Eugene's redesigned upper panel */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="text-2xl">📊</span>
              <h1 className="text-lg font-bold text-gray-900">{t('manager.header')}</h1>
            </div>

            {/* ELA Menu Button (same as other roles) */}
            <div className="ml-auto mr-4">
              <button
                onClick={() => setShowElaMenu(!showElaMenu)}
                className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* ELA Menu Dropdown */}
              {showElaMenu && (
                <ElaMenu
                  onChatOpen={() => {
                    setShowElaChat(true);
                    setShowElaMenu(false);
                  }}
                  onTranslationChatOpen={() => {
                    setShowTranslationChannels(true);
                    setShowElaMenu(false);
                  }}
                  onPersonalSettingsOpen={() => {
                    setShowPersonalSettings(true);
                    setShowElaMenu(false);
                  }}
                  onClose={() => setShowElaMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-[1800px]">
        <div className="space-y-6">

        {/* Navigation */}
        <ManagerNavigation
          activeTab={managerState.activeTab}
          activeCategory={managerState.activeCategory}
          tableData={tableData}
          transactions={transactions}
          items={managerState.items}
          onCategoryChange={managerState.handleCategoryChange}
          onTabChange={managerState.handleTabChange}
        />

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {managerState.activeCategory === 'inventory' && isInventoryTab(managerState.activeTab) && (
            <InventorySection
              activeTab={managerState.activeTab}
              activeItemTab={managerState.activeItemTab}
              tableData={tableData}
              transactions={transactions}
              items={managerState.items}
              boms={managerState.boms}
              itemsLoading={managerState.itemsLoading}
              setActiveItemTab={managerState.setActiveItemTab}
              loadItemsAndBOMs={managerState.loadItemsAndBOMs}
              handleExportItems={managerState.handleExportItems}
              handleExportBOMs={managerState.handleExportBOMs}
              handleExportAllItemData={managerState.handleExportAllItemData}
              handleGenerateItemMockData={managerState.handleGenerateItemMockData}
              setItemsLoading={managerState.setItemsLoading}
            />
          )}

          {managerState.activeCategory === 'production' && isProductionTab(managerState.activeTab) && (
            <ProductionSection
              activeTab={managerState.activeTab}
              onTabChange={managerState.handleTabChange}
            />
          )}

          {managerState.activeCategory === 'qa' && isQATab(managerState.activeTab) && (
            <QASection
              onRefresh={() => {
                // Refresh QA data if needed
              }}
            />
          )}

          {managerState.activeCategory === 'hr' && (
            <HRSection
              onRefresh={() => {
                // Refresh user data if needed
              }}
            />
          )}

          {managerState.activeCategory === 'operations' && isOperationsTab(managerState.activeTab) && (
            <>
              {managerState.activeTab === 'operations' && (
                <OperationsTab
                  onRefresh={() => {
                    // Refresh operations data if needed
                  }}
                />
              )}
              {managerState.activeTab === 'tasks' && (
                <TaskManagementView
                  onRefresh={() => {
                    // Refresh task data if needed
                  }}
                />
              )}
            </>
          )}

          {managerState.activeCategory === 'feedback' && isFeedbackTab(managerState.activeTab) && (
            <>
              {managerState.activeTab === 'feedback' && <ElaSection />}
              {managerState.activeTab === 'excel_translation' && <ExcelTranslation />}
            </>
          )}
        </div>

        {/* All admin tools moved to Overview subtab */}
        </div>

        <VersionFooter />

        {/* Translation Chat Modal */}
        {showTranslationChannels && (
          <TranslationChannels
            onClose={() => setShowTranslationChannels(false)}
          />
        )}

        {/* ELA Chat Modal */}
        {showElaChat && (
          <ElaChat
            user={_user}
            userRole="manager"
            onClose={() => setShowElaChat(false)}
          />
        )}

        {/* Personal Settings Modal */}
        {showPersonalSettings && (
          <PersonalSettings
            user={_user}
            onClose={() => setShowPersonalSettings(false)}
          />
        )}

        {/* CSV Import Dialog */}
        {managerState.showImportDialog && (
          <Suspense fallback={<div />}>
            <CSVImportDialog
              isOpen={managerState.showImportDialog}
              onClose={() => managerState.setShowImportDialog(false)}
              onImport={async (data, importType) => {
                // Handle the imported data based on type
                console.log(`Importing ${data.length} items to ${importType} table`);
                managerState.setShowImportDialog(false);
              }}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}