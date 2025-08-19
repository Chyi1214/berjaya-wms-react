// CSV Export Section Component - Handles data import/export functionality
import { InventoryCountEntry, Transaction, ItemMaster, BOM } from '../../types';
import { InventoryTab, ItemTab } from '../../types/manager';
import { csvExportService } from '../../services/csvExport';

interface CSVExportSectionProps {
  activeTab: InventoryTab;
  activeItemTab: ItemTab;
  isLoading: boolean;
  tableData: {
    checked: InventoryCountEntry[];
    expected: InventoryCountEntry[];
    yesterday: InventoryCountEntry[];
  };
  transactions: Transaction[];
  items: ItemMaster[];
  boms: BOM[];
  setShowImportDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CSVExportSection({
  activeTab,
  activeItemTab,
  isLoading,
  tableData,
  transactions,
  items,
  boms,
  setShowImportDialog
}: CSVExportSectionProps) {
  
  const handleExportCurrentTab = () => {
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
  };

  const getCurrentTabLabel = (): string => {
    if (activeTab === 'checked') return 'Checked';
    if (activeTab === 'expected') return 'Expected';
    if (activeTab === 'yesterday') return 'Yesterday';
    if (activeTab === 'transaction') return 'Transactions';
    if (activeTab === 'itemmaster') {
      return activeItemTab === 'items' ? 'Items' : 'BOMs';
    }
    return 'Current Tab';
  };

  return (
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
            onClick={handleExportCurrentTab}
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            📤 Export {getCurrentTabLabel()}
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
  );
}