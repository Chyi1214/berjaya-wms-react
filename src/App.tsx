// Main App Component
import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import RoleSelection from './components/RoleSelection';
import LogisticsView from './components/LogisticsView';

// Lazy load heavy components for better performance
const ProductionView = lazy(() => import('./components/ProductionView'));
const QAView = lazy(() => import('./components/QAView'));
import { UserRole, AppSection, InventoryCountEntry, Transaction, TransactionStatus, TransactionFormData } from './types';

// Lazy load the heavy ManagerView component for better performance
const ManagerView = lazy(() => import('./components/ManagerView').then(module => ({ default: module.ManagerView })));
import { inventoryService } from './services/inventory';
import { transactionService } from './services/transactions';
import { mockDataService } from './services/mockData';
import { tableStateService } from './services/tableState';

// Main app content (wrapped inside AuthProvider)
function AppContent() {
  const { user, loading, logout } = useAuth();
  
  // Navigation state
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.LOGIN);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  // Firebase inventory state (real-time sync)
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCountEntry[]>([]);
  
  // Transaction state (Firebase real-time sync)
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load inventory data from Firebase on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const counts = await inventoryService.getAllInventoryCounts();
        setInventoryCounts(counts);
      } catch (error) {
        console.error('Failed to load inventory:', error);
      }
    };

    loadInventory();
  }, []);

  // Real-time listener for inventory changes
  useEffect(() => {
    const unsubscribe = inventoryService.onInventoryCountsChange((counts) => {
      setInventoryCounts(counts);
    });

    return unsubscribe;
  }, []);

  // Real-time listener for transactions
  useEffect(() => {
    // Clear old localStorage data to avoid conflicts
    localStorage.removeItem('wms-transactions');
    localStorage.removeItem('wms-transaction-otps');
    
    const unsubscribe = transactionService.onTransactionsChange((transactions) => {
      setTransactions(transactions);
    });

    return unsubscribe;
  }, []);

  // Handle role selection
  const handleRoleSelect = (role: UserRole) => {
    console.log('Role selected:', role);
    setSelectedRole(role);
    switch (role) {
      case UserRole.LOGISTICS:
        setCurrentSection(AppSection.LOGISTICS);
        break;
      case UserRole.PRODUCTION:
        setCurrentSection(AppSection.PRODUCTION);
        break;
      case UserRole.QA:
        setCurrentSection(AppSection.QA);
        break;
      case UserRole.MANAGER:
        setCurrentSection(AppSection.MANAGER);
        break;
    }
  };

  // Handle back to role selection
  const handleBackToRoles = () => {
    console.log('Returning to role selection from:', selectedRole);
    setCurrentSection(AppSection.ROLE_SELECTION);
    setSelectedRole(null);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    setCurrentSection(AppSection.LOGIN);
    setSelectedRole(null);
  };

  // Handle new inventory count (save to Firebase) - supports both single items and BOM expansion
  const handleInventoryCount = async (entries: InventoryCountEntry[]) => {
    try {
      // Save all entries to Firebase (for BOMs, this will be multiple entries)
      for (const entry of entries) {
        await inventoryService.saveInventoryCount(entry);
      }
      console.log(`✅ ${entries.length} inventory count(s) saved to Firebase:`, entries);
    } catch (error) {
      console.error('❌ Failed to save inventory count:', error);
      alert('Failed to save count. Please try again.');
    }
  };

  // Handle clearing all counts
  const handleClearCounts = async () => {
    if (window.confirm('Clear all inventory counts? This cannot be undone.')) {
      try {
        await inventoryService.clearAllInventory();
        console.log('✅ All inventory data cleared from Firebase');
      } catch (error) {
        console.error('❌ Failed to clear inventory:', error);
        alert('Failed to clear data. Please try again.');
      }
    }
  };

  // Handle transaction creation with OTP
  const handleTransactionCreate = async (transactionData: TransactionFormData & { otp: string }): Promise<{ transaction: Transaction, otp: string }> => {
    const { otp, ...txnData } = transactionData;
    
    const newTransaction: Transaction = {
      ...txnData,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: TransactionStatus.PENDING,
      performedBy: user?.email || 'unknown',
      // Calculate previous and new amounts based on current inventory
      previousAmount: 0, // In real app, get from current inventory
      newAmount: txnData.amount, // In real app, calculate based on transaction type
      itemName: getItemNameBySku(txnData.sku)
    };
    
    // Save to Firebase
    await transactionService.saveTransaction(newTransaction);
    await transactionService.saveOTP(newTransaction.id, otp);
    
    console.log('✅ Transaction created in Firebase:', newTransaction, 'OTP:', otp);
    return { transaction: newTransaction, otp };
  };

  // Handle transaction confirmation with OTP
  const handleTransactionConfirm = async (transactionId: string, inputOTP: string) => {
    const storedOTP = await transactionService.getOTP(transactionId);
    if (!storedOTP || storedOTP !== inputOTP) {
      throw new Error('Invalid OTP');
    }

    // Update transaction status in Firebase
    await transactionService.updateTransaction(transactionId, {
      status: TransactionStatus.COMPLETED,
      approvedBy: user?.email || 'unknown'
    });

    // Remove OTP after successful confirmation
    await transactionService.deleteOTP(transactionId);

    // 🔄 FIXED BASELINE: Use incremental update approach (scalable for 100 workers)
    try {
      // Get current expected inventory from Firebase
      const currentExpected = await tableStateService.getExpectedInventory();
      
      if (currentExpected.length > 0) {
        // Find the confirmed transaction
        const confirmedTransaction = await transactionService.getTransactionById(transactionId);
        
        if (confirmedTransaction) {
          // Apply INCREMENTAL update (only affects specific SKU locations)
          const updatedExpected = mockDataService.calculateIncrementalExpectedUpdate(
            currentExpected,
            confirmedTransaction
          );
          
          // Save updated expected inventory to Firebase
          await tableStateService.saveExpectedInventory(updatedExpected);
          
          console.log('⚡ Expected inventory updated incrementally after transaction confirmation');
        }
      } else {
        // Fallback to full calculation only if expected table is empty
        console.log('⚠️ Expected table empty, skipping update (will be handled by manager view)');
      }
    } catch (error) {
      console.error('⚠️ Failed to update expected inventory:', error);
      // Don't throw - transaction was still confirmed successfully
    }

    console.log('✅ Transaction confirmed in Firebase:', transactionId);
  };

  // Handle transaction rejection
  const handleTransactionReject = async (transactionId: string, reason: string) => {
    // Find the current transaction to get existing notes
    const currentTransaction = transactions.find(t => t.id === transactionId);
    const existingNotes = currentTransaction?.notes || '';
    
    // Update transaction status in Firebase
    await transactionService.updateTransaction(transactionId, {
      status: TransactionStatus.CANCELLED,
      notes: existingNotes + ` | Rejected: ${reason}`
    });

    // Remove OTP after rejection
    await transactionService.deleteOTP(transactionId);

    console.log('❌ Transaction rejected in Firebase:', transactionId, 'Reason:', reason);
  };

  // Helper to get item name by SKU
  const getItemNameBySku = (sku: string): string => {
    const items = [
      { sku: 'A001', name: 'Engine Oil Filter' },
      { sku: 'A002', name: 'Air Filter' },
      { sku: 'B003', name: 'Brake Pad Set' },
      { sku: 'B004', name: 'Brake Disc' },
      { sku: 'C005', name: 'Spark Plug Set' },
      { sku: 'C006', name: 'Timing Belt' },
      { sku: 'D007', name: 'Water Pump' },
      { sku: 'D008', name: 'Alternator' },
      { sku: 'E009', name: 'Battery' },
      { sku: 'E010', name: 'Starter Motor' },
    ];
    return items.find(item => item.sku === sku)?.name || sku;
  };

  // Update section when authentication state changes
  if (user && currentSection === AppSection.LOGIN) {
    setCurrentSection(AppSection.ROLE_SELECTION);
  } else if (!user && currentSection !== AppSection.LOGIN) {
    setCurrentSection(AppSection.LOGIN);
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render based on current section
  switch (currentSection) {
    case AppSection.LOGIN:
      return <Login />;
      
    case AppSection.ROLE_SELECTION:
      return user ? (
        <RoleSelection 
          user={user} 
          onRoleSelect={handleRoleSelect} 
          onLogout={handleLogout} 
        />
      ) : <Login />;
      
    case AppSection.LOGISTICS:
      return user ? (
        <LogisticsView 
          user={user} 
          onBack={handleBackToRoles}
          onCountSubmit={handleInventoryCount}
          counts={inventoryCounts}
          onClearCounts={handleClearCounts}
          onTransactionCreate={handleTransactionCreate}
          transactions={transactions}
        />
      ) : <Login />;
      
    case AppSection.PRODUCTION:
      return user ? (
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Production Dashboard...</p>
            </div>
          </div>
        }>
          <ProductionView 
            user={user} 
            onBack={handleBackToRoles}
            onCountSubmit={handleInventoryCount}
            counts={inventoryCounts}
            onClearCounts={handleClearCounts}
            transactions={transactions}
            onTransactionConfirm={handleTransactionConfirm}
            onTransactionReject={handleTransactionReject}
          />
        </Suspense>
      ) : <Login />;
      
    case AppSection.QA:
      return user ? (
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Quality Assurance...</p>
            </div>
          </div>
        }>
          <QAView 
            onBack={handleBackToRoles}
          />
        </Suspense>
      ) : <Login />;
      
    case AppSection.MANAGER:
      return user ? (
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Manager Dashboard...</p>
            </div>
          </div>
        }>
          <ManagerView 
            user={user} 
            onBack={handleBackToRoles}
            inventoryCounts={inventoryCounts}
            onClearCounts={handleClearCounts}
            transactions={transactions}
          />
        </Suspense>
      ) : <Login />;
      
    default:
      return <Login />;
  }
}

// Main App component with providers
function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;