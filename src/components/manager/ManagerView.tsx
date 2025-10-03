// Manager View Component - Refactored into modular components with V4.0 Production
import React, { Suspense, lazy, useState } from 'react';
import { User, InventoryCountEntry, Transaction } from '../../types';
import { isInventoryTab, isProductionTab, isQATab, isOperationsTab, isFeedbackTab } from '../../types/manager';
import { useLanguage } from '../../contexts/LanguageContext';
import { tableStateService } from '../../services/tableState';
import { mockDataService } from '../../services/mockData';
import { transactionService } from '../../services/transactions';
import { inventoryService } from '../../services/inventory';
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
  const { tableData, syncAllTables } = useTableData(inventoryCounts, transactions);

  // ELA Menu and Translation Chat state (same as other roles)
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [showTranslationChannels, setShowTranslationChannels] = useState(false);

  // Initialize Expected table from Yesterday if Expected is empty but Yesterday has data
  React.useEffect(() => {
    const initializeExpectedFromYesterday = async () => {
      if (tableData.yesterday.length > 0 && tableData.expected.length === 0) {
        console.log('🔄 Initializing Expected table from Yesterday data...');
        try {
          const baselineData = tableData.yesterday.map(item => ({
            ...item,
            countedBy: 'system.initialized',
            timestamp: new Date()
          }));
          await tableStateService.saveExpectedInventory(baselineData);
          console.log('✅ Expected table initialized from Yesterday baseline');
        } catch (error) {
          console.error('Failed to initialize Expected table:', error);
        }
      }
    };

    initializeExpectedFromYesterday();
  }, [tableData.yesterday, tableData.expected]);

  // Inventory mock data generator for Overview tab
  const handleGenerateInventoryMockData = async () => {
    managerState.setIsLoading(true);
    try {
      // Generate complete test scenario with inventory counts
      await mockDataService.generateCompleteTestScenario();
      
      // Get the latest counts and sync all three tables properly
      const latestCounts = await inventoryService.getAllInventoryCounts();
      
      if (latestCounts.length > 0) {
        // Use the proper sync function that handles all edge cases
        const totalItems = await syncAllTables(latestCounts);
        
        alert(`✅ All three tables synced! ${latestCounts.length} SKUs, ${totalItems} total items in Checked, Expected, and Yesterday tables.`);
      } else {
        alert('⚠️ No inventory data generated. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate inventory mock data:', error);
      alert('❌ Failed to generate inventory mock data. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  const handleConcludePeriod = async () => {
    if (!confirm('⚠️ Conclude current period? This will:\n• Mark completed transactions as concluded\n• Save Expected table as new Yesterday baseline\n• Checked and Expected tables remain unchanged for reference\n\nThis cannot be undone!')) {
      return;
    }

    managerState.setIsLoading(true);
    try {
      const now = new Date();
      
      // Step 1: Mark all completed transactions as concluded
      const completedTransactions = transactions.filter(t => t.status === 'completed' && !t.concludedAt);
      const transactionUpdates = completedTransactions.map(transaction => 
        transactionService.updateTransaction(transaction.id, { concludedAt: now })
      );
      
      // Step 2: Save current expected data as yesterday results (new baseline)
      const newYesterday = tableData.expected.map(item => ({
        ...item,
        countedBy: 'system.concluded',
        timestamp: now
      }));
      
      // Execute all updates (Expected and Checked tables remain unchanged)
      await Promise.all([
        ...transactionUpdates,
        tableStateService.saveYesterdayResults(newYesterday)
      ]);
      
      alert(`✅ Period concluded! ${completedTransactions.length} transactions marked, Expected saved as new baseline.`);
      managerState.handleTabChange('yesterday');
    } catch (error) {
      console.error('Failed to conclude period:', error);
      alert('❌ Failed to conclude period. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('🗑️ Clear ALL data including yesterday results? This will reset everything!')) {
      return;
    }

    managerState.setIsLoading(true);
    try {
      await tableStateService.clearAllTableState();
      
      managerState.setShowComparison(false);
      alert('✅ All data cleared! Starting fresh.');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('❌ Failed to clear data. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  const handleResetAllQuantities = async () => {
    if (!confirm('🔄 Reset all inventory quantities to zero?\n\nThis will:\n• Set all item quantities to 0\n• Keep all items and locations intact\n• Only affect quantity numbers\n\nThis cannot be undone!')) {
      return;
    }

    managerState.setIsLoading(true);
    try {
      const result = await tableStateService.resetAllQuantitiesToZero();

      alert(`✅ All quantities reset to zero!\n\n📊 Summary:\n• ${result.resetCount} items reset to 0\n• Items and locations preserved\n• Only quantities changed`);
    } catch (error) {
      console.error('Failed to reset quantities:', error);
      alert('❌ Failed to reset quantities. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Eugene's redesigned upper panel */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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

      <main className="container mx-auto px-4 py-6 max-w-7xl">
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
              showComparison={managerState.showComparison}
              itemsLoading={managerState.itemsLoading}
              setActiveItemTab={managerState.setActiveItemTab}
              loadItemsAndBOMs={managerState.loadItemsAndBOMs}
              handleExportItems={managerState.handleExportItems}
              handleExportBOMs={managerState.handleExportBOMs}
              handleExportAllItemData={managerState.handleExportAllItemData}
              handleGenerateItemMockData={managerState.handleGenerateItemMockData}
              handleGenerateInventoryMockData={handleGenerateInventoryMockData}
              setItemsLoading={managerState.setItemsLoading}
              onConcludeToday={handleConcludePeriod}
              onClearAllData={handleClearAllData}
              onResetAllQuantities={handleResetAllQuantities}
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
            <ElaSection />
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