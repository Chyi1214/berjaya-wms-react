// Custom hook for managing inventory table data (checked, expected, yesterday)
import { useState, useEffect, useRef } from 'react';
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

  // Auto-recalculate Expected when NEW transactions are added (but not on page reload)
  // We use a ref to track if this is initial load or actual change
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const previousTransactionCount = useRef(0);
  
  useEffect(() => {
    if (tableData.yesterday.length > 0 && tableData.expected.length > 0) {
      setInitialLoadComplete(true);
      previousTransactionCount.current = transactions.length;
    }
  }, [tableData.yesterday.length, tableData.expected.length, transactions.length]);

  useEffect(() => {
    // Only recalculate if:
    // 1. Initial load is complete (we have yesterday & expected data)
    // 2. Transaction count actually increased (new transaction added)
    if (initialLoadComplete && 
        tableData.yesterday.length > 0 && 
        transactions.length > previousTransactionCount.current) {
      
      console.log('🔄 New transaction detected, using INCREMENTAL update...');
      
      // Find the newly completed transactions
      const completedTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
      const previousCompleted = completedTransactions.slice(0, previousTransactionCount.current);
      const newCompletedTransactions = completedTransactions.slice(previousCompleted.length);
      
      if (newCompletedTransactions.length > 0 && tableData.expected.length > 0) {
        console.log(`⚡ Processing ${newCompletedTransactions.length} new transactions incrementally...`);
        
        let updatedExpected = [...tableData.expected];
        
        // Apply each new transaction incrementally (SCALABLE APPROACH)
        newCompletedTransactions.forEach(transaction => {
          updatedExpected = mockDataService.calculateIncrementalExpectedUpdate(
            updatedExpected,
            transaction
          );
        });
        
        // Save updated expected to Firebase for cross-device sync
        tableStateService.saveExpectedInventory(updatedExpected);
        
        console.log(`🚀 Incremental update complete! Updated only affected SKUs instead of all ${tableData.expected.length} entries`);
        
      } else if (completedTransactions.length > 0 && tableData.expected.length === 0) {
        // Fallback to full calculation only if expected table is empty (initial sync)
        console.log('🔄 Expected table empty, doing initial full calculation...');
        
        const calculatedExpected = mockDataService.calculateExpectedInventory(
          tableData.yesterday, 
          completedTransactions
        );
        
        tableStateService.saveExpectedInventory(calculatedExpected);
      }
      
      // Update the count to prevent unnecessary recalculations
      previousTransactionCount.current = transactions.length;
    }
  }, [transactions, tableData.yesterday, tableData.expected, initialLoadComplete]);

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