// Manager View Component - Refactored into modular components with V4.0 Production
import { Suspense, lazy } from 'react';
import { User, InventoryCountEntry, Transaction, TransactionStatus } from '../../types';
import { isInventoryTab, isProductionTab, isQATab, isOperationsTab } from '../../types/manager';
import { useLanguage } from '../../contexts/LanguageContext';
import { mockDataService } from '../../services/mockData';
import { inventoryService } from '../../services/inventory';
import { tableStateService } from '../../services/tableState';
import { productionTestDataService } from '../../services/productionTestDataService';
import VersionFooter from '../VersionFooter';

// Custom hooks
import { useManagerState } from './hooks/useManagerState';
import { useTableData } from './hooks/useTableData';

// Manager components
import { ManagerNavigation } from './ManagerNavigation';
import { InventorySection } from './InventorySection';
import { HRSection } from './HRSection';
import { QASection } from './QASection';
import { ProductionSection } from './ProductionSection';
import { OperationsSection } from './OperationsSection';
import { TestDataSection } from './TestDataSection';
import { CSVExportSection } from './CSVExportSection';
import { ManagerActionsSection } from './ManagerActionsSection';

// Lazy load the CSV Import Dialog
const CSVImportDialog = lazy(() => import('../CSVImportDialog'));

interface ManagerViewProps {
  user: User;
  onBack: () => void;
  inventoryCounts: InventoryCountEntry[];
  onClearCounts: () => void;
  transactions: Transaction[];
}

export function ManagerView({ user: _user, onBack, inventoryCounts, onClearCounts, transactions }: ManagerViewProps) {
  const { t } = useLanguage();

  // Use custom hooks for state management
  const managerState = useManagerState();
  const { tableData, syncAllTables } = useTableData(inventoryCounts, transactions);

  // Handler functions for Eugene's workflow
  const handleGenerateMockData = async () => {
    managerState.setIsLoading(true);
    try {
      // Step 1: Generate mock data in Firebase
      await mockDataService.generateCompleteTestScenario();
      
      // Step 2: Fetch the latest data directly (no timing dependencies)
      const latestCounts = await inventoryService.getAllInventoryCounts();
      
      if (latestCounts.length > 0) {
        // Step 3: Sync all tables with the same data
        const totalItems = await syncAllTables(latestCounts);
        alert(`✅ Perfect sync! All 3 tables show identical data.\n${latestCounts.length} SKUs, ${totalItems} total items`);
      } else {
        alert('⚠️ No data generated. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate mock data:', error);
      alert('❌ Failed to generate mock data. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  const handleGenerateTransactionTest = async () => {
    managerState.setIsLoading(true);
    try {
      await mockDataService.generateTransactionTestCase();
      alert('✅ Transaction test case ready! Try sending items from Logistics to Zone 1.');
    } catch (error) {
      console.error('Failed to generate transaction test:', error);
      alert('❌ Failed to generate test case. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  // V4.0 Production test data handler
  const handleGenerateProductionTest = async () => {
    managerState.setIsLoading(true);
    try {
      console.log('🏭 Starting production test data generation...');
      
      await productionTestDataService.generateCompleteProductionTest();
      
      alert('✅ Production test data generated! Check Production Line tab to see test cars and workers.');
      
      // Refresh any loaded data
      await managerState.loadItemsAndBOMs();
    } catch (error) {
      console.error('❌ Production test generation failed:', error);
      alert('❌ Failed to generate production test data. Check console for details.');
    } finally {
      managerState.setIsLoading(false);
    }
  };

  const handleCompareTables = async () => {
    managerState.setShowComparison(true);
    const completedTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
    
    if (tableData.yesterday.length === 0) {
      alert('⚠️ No yesterday results found! Please generate mock data or conclude a period first.');
      return;
    }
    
    // Calculate expected inventory: Yesterday Results + Today's Completed Transactions
    const calculatedExpected = mockDataService.calculateExpectedInventory(
      tableData.yesterday, 
      completedTransactions
    );
    
    // Save to Firebase for cross-device sync
    await tableStateService.saveExpectedInventory(calculatedExpected);
    
    alert('📊 Expected inventory calculated from yesterday baseline + transactions!');
  };

  const handleConcludePeriod = async () => {
    if (!confirm('⚠️ Conclude current period? This will:\n• Set current checked items as "Yesterday Results"\n• Clear current counts\n• Reset for next period\n\nThis cannot be undone!')) {
      return;
    }

    managerState.setIsLoading(true);
    try {
      // Save current checked data as yesterday
      const newYesterday = tableData.checked.map(item => ({
        ...item,
        countedBy: 'system.concluded',
        timestamp: new Date()
      }));
      
      // Save yesterday results to Firebase and clear other tables
      await Promise.all([
        tableStateService.saveYesterdayResults(newYesterday),
        tableStateService.clearExpectedInventory(),
        onClearCounts() // Clear Firebase inventory data
      ]);
      
      alert('✅ Period concluded! Yesterday results saved, ready for next period.');
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
      await Promise.all([
        mockDataService.clearAllMockData(),
        tableStateService.clearAllTableState()
      ]);
      
      managerState.setShowComparison(false);
      alert('✅ All data cleared! Starting fresh.');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('❌ Failed to clear data. Check console for details.');
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
            <OperationsSection
              onRefresh={() => {
                // Refresh operations data if needed
              }}
            />
          )}
        </div>

        {/* Test Data Generation */}
        <TestDataSection
          isLoading={managerState.isLoading}
          handleGenerateMockData={handleGenerateMockData}
          handleGenerateTransactionTest={handleGenerateTransactionTest}
          handleGenerateProductionTest={handleGenerateProductionTest}
        />

        {/* CSV Export & Import - Only show for inventory tabs */}
        {isInventoryTab(managerState.activeTab) && (
          <CSVExportSection
            activeTab={managerState.activeTab}
            activeItemTab={managerState.activeItemTab}
            isLoading={managerState.isLoading}
            tableData={tableData}
            transactions={transactions}
            items={managerState.items}
            boms={managerState.boms}
            setShowImportDialog={managerState.setShowImportDialog}
          />
        )}

        {/* Item Management Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 {t('manager.itemManagement.title')}</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">💡 {t('manager.itemManagement.subtitle')}</h4>
            <div className="text-yellow-700 text-sm space-y-1">
              <p><strong>{t('manager.itemManagement.itemMasterListTitle')}:</strong> {t('manager.itemManagement.itemMasterListDesc')}</p>
              <p><strong>{t('manager.itemManagement.bomsTitle')}:</strong> {t('manager.itemManagement.bomsDesc')}</p>
              <p><strong>{t('manager.itemManagement.workflowTitle')}:</strong> {t('manager.itemManagement.workflowDesc')}</p>
            </div>
          </div>
        </div>

        {/* Manager Actions */}
        <ManagerActionsSection
          isLoading={managerState.isLoading}
          inventoryCounts={inventoryCounts}
          handleCompareTables={handleCompareTables}
          handleConcludePeriod={handleConcludePeriod}
          handleClearAllData={handleClearAllData}
        />

          {/* Eugene's v2.0.0 Implementation Status */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-purple-800 font-medium mb-2">🎯 Eugene's v2.0.0 Dashboard - Implementation Progress:</h3>
            <ul className="text-purple-700 text-sm space-y-1">
              <li>✅ Three-table system architecture (Checked, Transaction, Yesterday)</li>
              <li>✅ Full flag dashboard design for computer screens</li>
              <li>✅ Mobile-compatible tabbed interface</li>
              <li>✅ Manager action workflow placeholders</li>
              <li>🚧 Next: Transaction table calculations, OTP workflow</li>
            </ul>
          </div>
        </div>

        <VersionFooter />
        
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