import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { InventoryCountEntry, Transaction } from '../types';
import { inventoryService } from '../services/inventory';
import { transactionService } from '../services/transactions';
import { useAuth } from './AuthContext';

interface IDataContext {
  inventoryCounts: InventoryCountEntry[];
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  refetchData: () => void;
}

const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCountEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch both in parallel for efficiency
      const [counts, trans] = await Promise.all([
        inventoryService.getAllInventoryCounts(),
        transactionService.getAllTransactions(),
      ]);
      setInventoryCounts(counts);
      setTransactions(trans);
    } catch (err) {
      setError(err as Error);
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value = {
    inventoryCounts,
    transactions,
    loading,
    error,
    refetchData: fetchData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
