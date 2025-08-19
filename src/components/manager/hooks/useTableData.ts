// Custom hook for managing inventory table data (checked, expected, yesterday)
import { useState, useEffect } from 'react';
import { InventoryCountEntry, Transaction, TransactionStatus } from '../../../types';
import { tableStateService } from '../../../services/tableState';
import { mockDataService } from '../../../services/mockData';

interface TableData {
  checked: InventoryCountEntry[];
  expected: InventoryCountEntry[];
  yesterday: InventoryCountEntry[];
}

interface UseTableDataReturn {
  tableData: TableData;
  setTableData: React.Dispatch<React.SetStateAction<TableData>>;
  syncAllTables: (baseData: InventoryCountEntry[]) => Promise<number>;
}

export function useTableData(
  inventoryCounts: InventoryCountEntry[], 
  transactions: Transaction[]
): UseTableDataReturn {
  const [tableData, setTableData] = useState<TableData>({
    checked: [],
    expected: [],
    yesterday: []
  });

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

  // Clean synchronization function - single source of truth
  const syncAllTables = async (baseData: InventoryCountEntry[]): Promise<number> => {
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

  return {
    tableData,
    setTableData,
    syncAllTables
  };
}