// Manager View Component - Dashboard and reporting
import { useState, useEffect } from 'react';
import { User, InventoryCountEntry, Transaction, TransactionStatus, ItemMaster, BOM } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import EnhancedInventoryTable from './EnhancedInventoryTable';
import TransactionTable from './TransactionTable';
import VersionFooter from './VersionFooter';
import { mockDataService } from '../services/mockData';
import { inventoryService } from '../services/inventory';
import { tableStateService } from '../services/tableState';
import { csvExportService } from '../services/csvExport';
import CSVImportDialog from './CSVImportDialog';
import { ItemMasterTab } from './ItemMasterTab';
import { BOMTab } from './BOMTab';
import { UserManagementTab } from './UserManagementTab';
import { OperationsTab } from './OperationsTab';
import { itemMasterService } from '../services/itemMaster';
import { bomService } from '../services/bom';
import { useAuth } from '../contexts/AuthContext';

interface ManagerViewProps {
  user: User;
  onBack: () => void;
  inventoryCounts: InventoryCountEntry[];
  onClearCounts: () => void;
  transactions: Transaction[];
}

export function ManagerView({ user, onBack, inventoryCounts, onClearCounts, transactions }: ManagerViewProps) {
  const { t } = useLanguage();
  const { isDevAdmin, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'checked' | 'expected' | 'transaction' | 'yesterday' | 'itemmaster' | 'hr' | 'operations'>('overview');
  const [activeCategory, setActiveCategory] = useState<'inventory' | 'hr' | 'operations'>('inventory');

  // Helper functions for category-tab management
  const inventoryTabs = ['overview', 'checked', 'expected', 'transaction', 'yesterday', 'itemmaster'];
  const hrTabs = ['hr'];
  const operationsTabs = ['operations'];

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    // Auto-switch category based on tab
    if (inventoryTabs.includes(tab)) {
      setActiveCategory('inventory');
    } else if (hrTabs.includes(tab)) {
      setActiveCategory('hr');
    } else if (operationsTabs.includes(tab)) {
      setActiveCategory('operations');
    }
  };

  const handleCategoryChange = (category: typeof activeCategory) => {
    setActiveCategory(category);
    // Switch to first tab of the category
    if (category === 'inventory' && !inventoryTabs.includes(activeTab)) {
      setActiveTab('overview');
    } else if (category === 'hr' && !hrTabs.includes(activeTab)) {
      setActiveTab('hr');
    } else if (category === 'operations' && !operationsTabs.includes(activeTab)) {
      setActiveTab('operations');
    }
  };
  
  // Unified state management - ALL tables controlled locally
  const [tableData, setTableData] = useState<{
    checked: InventoryCountEntry[];
    expected: InventoryCountEntry[];
    yesterday: InventoryCountEntry[];
  }>({
    checked: [],
    expected: [],
    yesterday: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Item Master and BOM state for the new tab
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [activeItemTab, setActiveItemTab] = useState<'items' | 'boms'>('items');

  // Sync incoming inventory data with local checked table
  useEffect(() => {
    if (inventoryCounts.length > 0) {
      setTableData(prev => ({
        ...prev,
        checked: inventoryCounts
      }));
    }
  }, [inventoryCounts]);

  // Real-time listener for expected inventory from Firebase
  useEffect(() => {
    const unsubscribe = tableStateService.onExpectedInventoryChange((expectedEntries) => {
      setTableData(prev => ({
        ...prev,
        expected: expectedEntries
      }));
    });
    
    return unsubscribe;
  }, []);

  // Real-time listener for yesterday results from Firebase  
  useEffect(() => {
    const unsubscribe = tableStateService.onYesterdayResultsChange((yesterdayEntries) => {
      setTableData(prev => ({
        ...prev,
        yesterday: yesterdayEntries
      }));
    });
    
    return unsubscribe;
  }, []);

  // Auto-recalculate Expected when transactions change (and save to Firebase)
  useEffect(() => {
    if (tableData.yesterday.length > 0) {
      const completedTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
      
      if (completedTransactions.length > 0) {
        // Recalculate expected based on yesterday + transactions
        const calculatedExpected = mockDataService.calculateExpectedInventory(
          tableData.yesterday, 
          completedTransactions
        );
        
        // Save to Firebase for cross-device sync
        tableStateService.saveExpectedInventory(calculatedExpected);
      } else {
        // No transactions: Expected = Yesterday
        tableStateService.saveExpectedInventory(tableData.yesterday);
      }
    }
  }, [transactions, tableData.yesterday]);

  // Load items and BOMs when Item Master tab is accessed
  useEffect(() => {
    if (activeTab === 'itemmaster') {
      loadItemsAndBOMs();
    }
  }, [activeTab]);

  const loadItemsAndBOMs = async () => {
    setItemsLoading(true);
    try {
      const [itemsData, bomsData] = await Promise.all([
        itemMasterService.getAllItems(),
        bomService.getAllBOMs()
      ]);
      setItems(itemsData);
      setBOMs(bomsData);
    } catch (error) {
      console.error('Failed to load items and BOMs:', error);
      alert('Failed to load items and BOMs. Please try again.');
    } finally {
      setItemsLoading(false);
    }
  };

  // Item Management export functions
  const handleExportItems = () => {
    csvExportService.exportItemMaster(items);
  };

  const handleExportBOMs = () => {
    csvExportService.exportBOMs(boms);
  };

  const handleExportAllItemData = () => {
    csvExportService.exportAllItemData(items, boms);
  };

  const handleGenerateItemMockData = async () => {
    if (!confirm('Generate mock data? This will add test items and BOMs.')) return;
    
    setItemsLoading(true);
    try {
      await mockDataService.generateItemAndBOMTestData();
      await loadItemsAndBOMs(); // Reload to show new data
      alert('Mock data generated successfully! 30 items and 8 BOMs added.');
    } catch (error) {
      console.error('Failed to generate mock data:', error);
      alert('Failed to generate mock data. Please try again.');
    } finally {
      setItemsLoading(false);
    }
  };

  // Handler functions for Eugene's workflow
  // Clean synchronization function - single source of truth
  const syncAllTables = async (baseData: InventoryCountEntry[]) => {
    console.log('🔄 Syncing all tables with', baseData.length, 'items');
    
    // Create identical data for all three tables
    const syncedChecked = baseData.map(item => ({ ...item }));
    const syncedExpected = baseData.map(item => ({ ...item }));
    const syncedYesterday = baseData.map(item => ({
      ...item,
      countedBy: 'system.baseline',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }));
    
    // Update local state immediately (for responsiveness)
    setTableData({
      checked: syncedChecked,
      expected: syncedExpected,
      yesterday: syncedYesterday
    });
    
    // Save Expected and Yesterday to Firebase for cross-device sync
    await Promise.all([
      tableStateService.saveExpectedInventory(syncedExpected),
      tableStateService.saveYesterdayResults(syncedYesterday)
    ]);
    
    const totalItems = baseData.reduce((sum, item) => sum + item.amount, 0);
    console.log(`✅ All tables synchronized: ${baseData.length} SKUs, ${totalItems} total items`);
    
    return totalItems;
  };

  const handleGenerateMockData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleGenerateTransactionTest = async () => {
    setIsLoading(true);
    try {
      await mockDataService.generateTransactionTestCase();
      alert('✅ Transaction test case ready! Try sending items from Logistics to Zone 1.');
    } catch (error) {
      console.error('Failed to generate transaction test:', error);
      alert('❌ Failed to generate test case. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareTables = async () => {
    setShowComparison(true);
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
    
    setTableData(prev => ({
      ...prev,
      expected: calculatedExpected
    }));
    
    // Save to Firebase for cross-device sync
    await tableStateService.saveExpectedInventory(calculatedExpected);
    
    alert('📊 Expected inventory calculated from yesterday baseline + transactions!');
  };

  const handleConcludePeriod = async () => {
    if (!confirm('⚠️ Conclude current period? This will:\n• Set current checked items as "Yesterday Results"\n• Clear current counts\n• Reset for next period\n\nThis cannot be undone!')) {
      return;
    }

    setIsLoading(true);
    try {
      // Save current checked data as yesterday
      const newYesterday = tableData.checked.map(item => ({
        ...item,
        countedBy: 'system.concluded',
        timestamp: new Date()
      }));
      
      setTableData({
        checked: [], // Clear for new period
        expected: [], // Clear expected
        yesterday: newYesterday // Save as yesterday
      });
      
      // Save yesterday results to Firebase and clear other tables
      await Promise.all([
        tableStateService.saveYesterdayResults(newYesterday),
        tableStateService.clearExpectedInventory(),
        onClearCounts() // Clear Firebase inventory data
      ]);
      
      alert('✅ Period concluded! Yesterday results saved, ready for next period.');
      handleTabChange('yesterday');
    } catch (error) {
      console.error('Failed to conclude period:', error);
      alert('❌ Failed to conclude period. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('🗑️ Clear ALL data including yesterday results? This will reset everything!')) {
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all([
        mockDataService.clearAllMockData(),
        tableStateService.clearAllTableState()
      ]);
      
      // Clear all local table data
      setTableData({
        checked: [],
        expected: [],
        yesterday: []
      });
      
      setShowComparison(false);
      alert('✅ All data cleared! Starting fresh.');
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('❌ Failed to clear data. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV import
  const handleCSVImport = async (
    data: InventoryCountEntry[], 
    importType: 'checked' | 'expected' | 'yesterday'
  ): Promise<void> => {
    setIsLoading(true);
    try {
      console.log(`📤 Importing ${data.length} items to ${importType} table`);

      // Update local state immediately
      setTableData(prev => ({
        ...prev,
        [importType]: data
      }));

      // Save to Firebase based on import type
      if (importType === 'checked') {
        // Save to Firebase inventory collection (replaces existing data)
        await inventoryService.clearAllInventory();
        for (const entry of data) {
          await inventoryService.saveInventoryCount(entry);
        }
      } else if (importType === 'expected') {
        // Save to expected inventory Firebase collection
        await tableStateService.saveExpectedInventory(data);
      } else if (importType === 'yesterday') {
        // Save to yesterday results Firebase collection
        await tableStateService.saveYesterdayResults(data);
      }

      console.log(`✅ Successfully imported ${data.length} items to ${importType} table`);
      
      // Switch to the imported table view
      setActiveTab(importType);
      
    } catch (error) {
      console.error('❌ Failed to import CSV data:', error);
      
      // Revert local state on error
      if (importType === 'checked') {
        const currentCounts = await inventoryService.getAllInventoryCounts();
        setTableData(prev => ({ ...prev, checked: currentCounts }));
      } else if (importType === 'expected') {
        const currentExpected = await tableStateService.getExpectedInventory();
        setTableData(prev => ({ ...prev, expected: currentExpected }));
      } else if (importType === 'yesterday') {
        const currentYesterday = await tableStateService.getYesterdayResults();
        setTableData(prev => ({ ...prev, yesterday: currentYesterday }));
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                {t('manager.title')}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {t('manager.role')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('manager.title')} - Full Dashboard
            </h2>
            <p className="text-gray-600">
              Eugene's v2.0.0 Three-Table System
            </p>
          </div>

          {/* Manager Navigation Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Main Category Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex space-x-6 px-6 py-2" aria-label="Main Categories">
                <button
                  onClick={() => handleCategoryChange('inventory')}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    activeCategory === 'inventory'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  📦 Inventory
                </button>

                {/* HR Category - DevAdmin or HR permission required */}
                {(isDevAdmin || hasPermission('system.userManagement')) && (
                  <button
                    onClick={() => handleCategoryChange('hr')}
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                      activeCategory === 'hr'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    👥 HR
                  </button>
                )}

                {/* Operations Category */}
                <button
                  onClick={() => handleCategoryChange('operations')}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    activeCategory === 'operations'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  🚀 Operations
                </button>
              </nav>
            </div>

            {/* Sub-tabs based on category */}
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto space-x-2 sm:space-x-8 px-4 sm:px-6" aria-label="Sub Tabs">
                
                {/* Inventory Sub-tabs */}
                {activeCategory === 'inventory' && (
                  <>
                    <button
                      onClick={() => handleTabChange('overview')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'overview'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">📊 Overview</span>
                      <span className="sm:hidden">📊</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('checked')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'checked'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">📋 Checked ({tableData.checked.length})</span>
                      <span className="sm:hidden">📋 ({tableData.checked.length})</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('expected')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'expected'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">📊 Expected ({tableData.expected.length})</span>
                      <span className="sm:hidden">📊 ({tableData.expected.length})</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('transaction')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'transaction'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">🔄 Transactions ({transactions.length})</span>
                      <span className="sm:hidden">🔄 ({transactions.length})</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('yesterday')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'yesterday'
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">🗓️ Yesterday ({tableData.yesterday.length})</span>
                      <span className="sm:hidden">🗓️ ({tableData.yesterday.length})</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('itemmaster')}
                      className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                        activeTab === 'itemmaster'
                          ? 'border-pink-500 text-pink-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">📦 Item Master ({items.length})</span>
                      <span className="sm:hidden">📦 ({items.length})</span>
                    </button>
                  </>
                )}

                {/* HR Sub-tabs */}
                {activeCategory === 'hr' && (isDevAdmin || hasPermission('system.userManagement')) && (
                  <button
                    onClick={() => handleTabChange('hr')}
                    className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'hr'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">👥 User Management</span>
                    <span className="sm:hidden">👥 Users</span>
                  </button>
                )}

                {/* Operations Sub-tabs */}
                {activeCategory === 'operations' && (
                  <button
                    onClick={() => handleTabChange('operations')}
                    className={`flex-shrink-0 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'operations'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">🚀 Operations Center</span>
                    <span className="sm:hidden">🚀 Ops</span>
                  </button>
                )}

              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-6">📊</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Overview Dashboard</h3>
                    <p className="text-gray-500 mb-8">Coming Soon - Manager insights and quick actions will appear here</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                      {/* Quick Stats Cards - Placeholders */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="text-blue-600 text-2xl mb-2">📋</div>
                        <h4 className="font-medium text-blue-900">Inventory Status</h4>
                        <p className="text-blue-700 text-sm mt-1">Track inventory levels</p>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                        <div className="text-purple-600 text-2xl mb-2">📦</div>
                        <h4 className="font-medium text-purple-900">Item Management</h4>
                        <p className="text-purple-700 text-sm mt-1">Manage catalog & BOMs</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="text-green-600 text-2xl mb-2">📊</div>
                        <h4 className="font-medium text-green-900">Analytics</h4>
                        <p className="text-green-700 text-sm mt-1">Performance insights</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'checked' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      📋 Checked Item Table
                    </h3>
                    <span className="text-sm text-gray-500">
                      Items counted by workers today
                    </span>
                  </div>
                  
                  {tableData.checked.length > 0 ? (
                    <EnhancedInventoryTable counts={tableData.checked} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">📭</div>
                      <p>No inventory counts recorded yet</p>
                      <p className="text-sm mt-2">Workers need to submit counts via Logistics or Production roles</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'expected' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      📊 Expected Item Table
                    </h3>
                    <span className="text-sm text-gray-500">
                      Yesterday inventory + today's completed transactions
                    </span>
                  </div>
                  
                  {tableData.expected.length > 0 ? (
                    <div>
                      <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-medium text-orange-900 mb-2">📊 System Calculated Expected Inventory</h4>
                        <p className="text-orange-700 text-sm">
                          This shows what inventory should be after applying all completed transactions to yesterday's baseline.
                          Compare with Checked Item Table to identify discrepancies.
                        </p>
                      </div>
                      <EnhancedInventoryTable counts={tableData.expected} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">🧮</div>
                      <p className="font-medium">No Expected Inventory Calculated Yet</p>
                      <p className="text-sm mt-2">Use "Compare Tables" to calculate expected inventory from yesterday results + transactions</p>
                      <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-orange-700 text-sm">
                          <strong>How it works:</strong><br/>
                          Expected = Yesterday Results + Today's Completed Transactions<br/>
                          Compare this with Checked Items to spot differences
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'transaction' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      🔄 Transaction Log
                    </h3>
                    <span className="text-sm text-gray-500">
                      All transaction activity (pending, completed, cancelled)
                    </span>
                  </div>
                  
                  <TransactionTable transactions={transactions} />
                </div>
              )}

              {activeTab === 'yesterday' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      🗓️ Yesterday Result Table
                    </h3>
                    <span className="text-sm text-gray-500">
                      Final confirmed inventory from previous period
                    </span>
                  </div>
                  
                  {tableData.yesterday.length > 0 ? (
                    <div>
                      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">📊 Yesterday's Final Results</h4>
                        <p className="text-green-700 text-sm">
                          {showComparison ? 
                            'These are calculated results based on checked items and completed transactions.' :
                            'These are the concluded inventory amounts from the previous period.'
                          }
                        </p>
                      </div>
                      <EnhancedInventoryTable counts={tableData.yesterday} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">📊</div>
                      <p className="font-medium">No Yesterday Results Yet</p>
                      <p className="text-sm mt-2">Use "Compare Tables" to calculate expected results or "Conclude Period" to save current data</p>
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-green-700 text-sm">
                          <strong>Eugene's v2.0.0 Workflow:</strong><br/>
                          1. Compare Checked vs Transaction tables<br/>
                          2. Resolve any differences<br/>
                          3. Conclude period to create Yesterday Results
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'itemmaster' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      📦 Item Master Management
                    </h3>
                    <span className="text-sm text-gray-500">
                      Manage catalog items and Bill of Materials
                    </span>
                  </div>

                  {/* Sub-tabs for Items and BOMs */}
                  <div className="mb-6">
                    <div className="border-b border-gray-200">
                      <nav className="flex space-x-8" aria-label="Item Management Tabs">
                        <button
                          onClick={() => setActiveItemTab('items')}
                          className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                            activeItemTab === 'items'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          🏷️ Items ({items.length})
                        </button>
                        <button
                          onClick={() => setActiveItemTab('boms')}
                          className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                            activeItemTab === 'boms'
                              ? 'border-purple-500 text-purple-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          📋 BOMs ({boms.length})
                        </button>
                      </nav>
                    </div>
                  </div>

                  {/* Item Management Content */}
                  {activeItemTab === 'items' ? (
                    <ItemMasterTab
                      items={items}
                      onDataChange={loadItemsAndBOMs}
                      onExport={handleExportItems}
                      onExportAll={handleExportAllItemData}
                      onGenerateMockData={handleGenerateItemMockData}
                      isLoading={itemsLoading}
                      setIsLoading={setItemsLoading}
                      hasAnyData={items.length > 0 || boms.length > 0}
                    />
                  ) : (
                    <BOMTab
                      boms={boms}
                      items={items}
                      onDataChange={loadItemsAndBOMs}
                      onExport={handleExportBOMs}
                      onExportAll={handleExportAllItemData}
                      onGenerateMockData={handleGenerateItemMockData}
                      isLoading={itemsLoading}
                      setIsLoading={setItemsLoading}
                      hasAnyData={items.length > 0 || boms.length > 0}
                    />
                  )}
                </div>
              )}

              {/* HR Tab Content */}
              {activeTab === 'hr' && (
                <UserManagementTab 
                  onRefresh={() => {
                    // Refresh user data if needed
                  }}
                />
              )}

              {/* Operations Tab Content */}
              {activeTab === 'operations' && (
                <OperationsTab 
                  onRefresh={() => {
                    // Refresh all data
                    loadItemsAndBOMs();
                    // Add any other data refresh logic here
                  }}
                />
              )}
            </div>
          </div>

          {/* Test Data & Mock Generation */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎭 Test Data Generation</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              
              {/* Generate Mock Data */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-600 mb-2">🎲</div>
                <h4 className="font-medium text-blue-900 mb-1">Generate Complete Test Data</h4>
                <p className="text-blue-700 text-sm mb-3">Creates mock inventory counts, transactions, and test scenarios</p>
                <button 
                  onClick={handleGenerateMockData}
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  {isLoading ? '⏳ Generating...' : '🎲 Generate Mock Data'}
                </button>
              </div>

              {/* Transaction Test Case */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-purple-600 mb-2">🔄</div>
                <h4 className="font-medium text-purple-900 mb-1">Transaction Test Case</h4>
                <p className="text-purple-700 text-sm mb-3">Creates specific scenario to test OTP transaction workflow</p>
                <button 
                  onClick={handleGenerateTransactionTest}
                  disabled={isLoading}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  {isLoading ? '⏳ Generating...' : '🔄 Generate Transaction Test'}
                </button>
              </div>
            </div>
          </div>

          {/* CSV Export & Import */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Data Export & Import</h3>
            
            {/* Import Section */}
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-purple-900">📤 Import CSV Data</h4>
                  <p className="text-purple-700 text-sm">Upload CSV files to replace table data</p>
                </div>
                <button
                  onClick={() => setShowImportDialog(true)}
                  disabled={isLoading}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-4 py-2 rounded text-sm"
                >
                  📤 Import CSV
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              
              {/* Export Individual Tables */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 mb-2">📤</div>
                <h4 className="font-medium text-green-900 mb-1">Export Current Table</h4>
                <p className="text-green-700 text-sm mb-3">Export the currently viewed table to CSV</p>
                <button 
                  onClick={() => {
                    if (activeTab === 'checked') {
                      csvExportService.exportInventoryCounts(tableData.checked, 'checked-items');
                    } else if (activeTab === 'expected') {
                      csvExportService.exportInventoryCounts(tableData.expected, 'expected-inventory');
                    } else if (activeTab === 'yesterday') {
                      csvExportService.exportInventoryCounts(tableData.yesterday, 'yesterday-results');
                    } else if (activeTab === 'transaction') {
                      csvExportService.exportTransactions(transactions);
                    } else if (activeTab === 'itemmaster') {
                      if (activeItemTab === 'items') {
                        csvExportService.exportItemMaster(items);
                      } else {
                        csvExportService.exportBOMs(boms);
                      }
                    }
                  }}
                  disabled={isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  📤 Export {activeTab === 'checked' ? 'Checked' : activeTab === 'expected' ? 'Expected' : activeTab === 'yesterday' ? 'Yesterday' : activeTab === 'transaction' ? 'Transactions' : activeTab === 'itemmaster' ? (activeItemTab === 'items' ? 'Items' : 'BOMs') : 'Current Tab'}
                </button>
              </div>

              {/* Export All Tables */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-600 mb-2">📊</div>
                <h4 className="font-medium text-blue-900 mb-1">Export All Data</h4>
                <p className="text-blue-700 text-sm mb-3">Export all tables and transactions to separate CSV files</p>
                <button 
                  onClick={() => {
                    csvExportService.exportAllData(
                      tableData.checked,
                      tableData.expected,
                      tableData.yesterday,
                      transactions
                    );
                  }}
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  📊 Export All Data
                </button>
              </div>

              {/* Export Summary Report */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-purple-600 mb-2">📋</div>
                <h4 className="font-medium text-purple-900 mb-1">Summary Report</h4>
                <p className="text-purple-700 text-sm mb-3">Export summary statistics for all tables</p>
                <button 
                  onClick={() => {
                    csvExportService.exportSummaryReport(
                      tableData.checked,
                      tableData.expected,
                      tableData.yesterday,
                      transactions
                    );
                  }}
                  disabled={isLoading}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  📋 Export Summary
                </button>
              </div>
            </div>
          </div>

          {/* Item Management */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Item Management</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">💡 How Item Management Works</h4>
              <div className="text-yellow-700 text-sm space-y-1">
                <p><strong>Item Master List:</strong> Central catalog of all items with SKU and name</p>
                <p><strong>BOMs:</strong> Recipes that contain multiple components with quantities</p>
                <p><strong>Workflow:</strong> Workers can select individual items or entire BOMs when counting inventory</p>
              </div>
            </div>
          </div>

          {/* Eugene's v2.0.0 Workflow Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Eugene's v2.0.0 Manager Actions</h3>
            <div className="grid md:grid-cols-3 gap-4">
              
              {/* Compare Tables Action */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-600 mb-2">⚖️</div>
                <h4 className="font-medium text-blue-900 mb-1">Compare Tables</h4>
                <p className="text-blue-700 text-sm mb-3">Calculate expected inventory after all transactions</p>
                <button 
                  onClick={handleCompareTables}
                  disabled={isLoading || inventoryCounts.length === 0}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  {isLoading ? '⏳ Comparing...' : '⚖️ Compare Tables'}
                </button>
              </div>

              {/* Conclude Period Action */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-600 mb-2">✅</div>
                <h4 className="font-medium text-green-900 mb-1">Conclude Period</h4>
                <p className="text-green-700 text-sm mb-3">Finalize current period and create yesterday results</p>
                <button 
                  onClick={handleConcludePeriod}
                  disabled={isLoading || inventoryCounts.length === 0}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  {isLoading ? '⏳ Concluding...' : '✅ Conclude Period'}
                </button>
              </div>

              {/* Clear All Data */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 mb-2">🗑️</div>
                <h4 className="font-medium text-red-900 mb-1">Clear All Data</h4>
                <p className="text-red-700 text-sm mb-3">Reset everything including yesterday results</p>
                <button 
                  onClick={handleClearAllData}
                  disabled={isLoading}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  {isLoading ? '⏳ Clearing...' : '🗑️ Clear All'}
                </button>
              </div>
            </div>
          </div>

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
      </main>
      
      <VersionFooter />
      
      {/* CSV Import Dialog */}
      <CSVImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleCSVImport}
      />
    </div>
  );
}

export default ManagerView;