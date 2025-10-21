// Custom hook for managing inventory table data (checked, expected)
import { useState, useEffect } from 'react';
import { InventoryCountEntry, Transaction } from '../../../types';
import { tableStateService } from '../../../services/tableState';

interface TableData {
  checked: InventoryCountEntry[];
  expected: InventoryCountEntry[];
}

interface UseTableDataReturn {
  tableData: TableData;
  setTableData: React.Dispatch<React.SetStateAction<TableData>>;
  syncAllTables: (baseData: InventoryCountEntry[]) => Promise<number>;
}

export function useTableData(
  inventoryCounts: InventoryCountEntry[],
  _transactions: Transaction[]
): UseTableDataReturn {
  const [tableData, setTableData] = useState<TableData>({
    checked: [],
    expected: []
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

  // Clean synchronization function - sync checked and expected tables
  const syncAllTables = async (baseData: InventoryCountEntry[]): Promise<number> => {
    console.log('🔄 Syncing tables with', baseData.length, 'items');

    // Create identical data for both tables
    const syncedChecked = baseData.map(item => ({ ...item }));
    const syncedExpected = baseData.map(item => ({ ...item }));

    // Update local state immediately (for responsiveness)
    setTableData({
      checked: syncedChecked,
      expected: syncedExpected
    });

    // Save Expected to Firebase for cross-device sync
    await tableStateService.saveExpectedInventory(syncedExpected);

    const totalItems = baseData.reduce((sum, item) => sum + item.amount, 0);
    console.log(`✅ Tables synchronized: ${baseData.length} SKUs, ${totalItems} total items`);

    return totalItems;
  };

  return {
    tableData,
    setTableData,
    syncAllTables
  };
}
