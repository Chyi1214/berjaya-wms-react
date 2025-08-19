// Manager View Component - Refactored into modular components
import { Suspense, lazy } from 'react';
import { User, InventoryCountEntry, Transaction, TransactionStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { mockDataService } from '../../services/mockData';
import { inventoryService } from '../../services/inventory';
import { tableStateService } from '../../services/tableState';
import VersionFooter from '../VersionFooter';

// Type definitions for this component
type ManagerTab = 'overview' | 'checked' | 'expected' | 'transaction' | 'yesterday' | 'itemmaster' | 'hr' | 'operations';

// Custom hooks
import { useManagerState } from './hooks/useManagerState';
import { useTableData } from './hooks/useTableData';

// Manager components
import { ManagerNavigation } from './ManagerNavigation';
import { InventorySection } from './InventorySection';
import { HRSection } from './HRSection';
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

export function ManagerView({ onBack, inventoryCounts, onClearCounts, transactions }: ManagerViewProps) {
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
      managerState.handleTabChange('yesterday' as ManagerTab);
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
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('manager.title')} - Full Dashboard
          </h2>
          <p className="text-gray-600">
            Eugene's v2.0.0 Three-Table System
          </p>
        </div>

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
          {managerState.activeCategory === 'inventory' && (
            <InventorySection
              activeTab={managerState.activeTab as 'overview' | 'checked' | 'expected' | 'transaction' | 'yesterday' | 'itemmaster'}
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

          {managerState.activeCategory === 'hr' && (
            <HRSection
              onRefresh={() => {
                // Refresh user data if needed
              }}
            />
          )}

          {managerState.activeCategory === 'operations' && (
            <OperationsSection
              onRefresh={() => {
                // Refresh all data
                managerState.loadItemsAndBOMs();
                // Add any other data refresh logic here
              }}
            />
          )}
        </div>

        {/* Test Data Generation */}
        <TestDataSection
          isLoading={managerState.isLoading}
          handleGenerateMockData={handleGenerateMockData}
          handleGenerateTransactionTest={handleGenerateTransactionTest}
        />

        {/* CSV Export & Import */}
        <CSVExportSection
          activeTab={managerState.activeTab as 'overview' | 'checked' | 'expected' | 'transaction' | 'yesterday' | 'itemmaster'}
          activeItemTab={managerState.activeItemTab}
          isLoading={managerState.isLoading}
          tableData={tableData}
          transactions={transactions}
          items={managerState.items}
          boms={managerState.boms}
          setShowImportDialog={managerState.setShowImportDialog}
        />

        {/* Item Management Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Item Management</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">💡 How Item Management Works</h4>
            <div className="text-yellow-700 text-sm space-y-1">
              <p><strong>Item Master List:</strong> Central catalog of all items with SKU and name</p>
              <p><strong>BOMs:</strong> Recipes that contain multiple components with quantities</p>
              <p><strong>Workflow:</strong> Workers can select individual items or entire BOMs when counting inventory</p>
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

        {/* Navigation */}
        <div className="text-center">
          <button
            onClick={onBack}
            className="btn-secondary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('nav.backToRoles')}
          </button>
        </div>

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
  );
}