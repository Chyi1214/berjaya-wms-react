import { memo, useState, useEffect, useRef } from 'react';
import { batchManagementService } from '../../services/batchManagement';
import { Batch, BatchHealthStatus } from '../../types/inventory';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface EnhancedBatchManagementProps {
  user: { email: string } | null;
  onRefresh?: () => void;
}

interface UploadResult {
  success: number;
  errors: string[];
  stats: {
    totalRows: number;
    skippedRows: number;
  };
}

export const EnhancedBatchManagement = memo(function EnhancedBatchManagement({
  user,
  onRefresh
}: EnhancedBatchManagementProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [newBatchId, setNewBatchId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadType, setUploadType] = useState<'vinPlans' | 'packingList'>('packingList');
  const [batchHealthStatus, setBatchHealthStatus] = useState<BatchHealthStatus | null>(null);
  const [batchHealthStatuses, setBatchHealthStatuses] = useState<Map<string, BatchHealthStatus>>(new Map());
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  // Throttle control using refs to avoid re-renders and stale dependencies
  const lastHealthUpdateRef = useRef<number>(0);
  // Store timeout id as number for browser environment
  const pendingHealthUpdateRef = useRef<number | null>(null);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  // Load health statuses for all batches when batches change
  useEffect(() => {
    if (batches.length > 0) {
      loadAllBatchHealthStatuses();
    }
  }, [batches]);

  const loadBatches = async () => {
    try {
      const batchData = await batchManagementService.getAllBatches();
      setBatches(batchData);
      if (batchData.length > 0 && !selectedBatch) {
        setSelectedBatch(batchData[0]);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

  // Load health status for activated batches
  const loadBatchHealth = async (batch: Batch) => {
    if (batch.status !== 'in_progress') {
      setBatchHealthStatus(null);
      return;
    }

    setIsLoadingHealth(true);
    try {
      const healthStatus = await batchManagementService.getBatchHealthStatus(batch.batchId);
      setBatchHealthStatus(healthStatus);
      console.log(`🔬 Health status for batch ${batch.batchId}:`, healthStatus);
    } catch (error) {
      console.error('Failed to load batch health:', error);
      setBatchHealthStatus(null);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Load health status for ALL active batches
  const loadAllBatchHealthStatuses = async () => {
    console.log('🏥 Loading health status for all active batches...');
    const activeBatches = batches.filter(batch => batch.status === 'in_progress');
    
    for (const batch of activeBatches) {
      try {
        const healthStatus = await batchManagementService.getBatchHealthStatus(batch.batchId);
        setBatchHealthStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(batch.batchId, healthStatus);
          return newMap;
        });
        console.log(`✅ Loaded health for batch ${batch.batchId}:`, healthStatus.status);
      } catch (error) {
        console.error(`❌ Failed to load health for batch ${batch.batchId}:`, error);
        // Remove failed batch from health statuses
        setBatchHealthStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(batch.batchId);
          return newMap;
        });
      }
    }
  };

  // Auto-load health when selected batch changes
  useEffect(() => {
    if (selectedBatch) {
      loadBatchHealth(selectedBatch);
    } else {
      setBatchHealthStatus(null);
    }
  }, [selectedBatch]);

  // Event-driven health updates - listen to inventory changes for ALL batches
  useEffect(() => {
    const activeBatches = batches.filter(batch => batch.status === 'in_progress');
    if (activeBatches.length === 0) {
      return; // Nothing to listen to
    }

    console.log('🎧 Setting up inventory change listeners for', activeBatches.length, 'active batches');

    let unsubscribeExpected: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;
    let unsubscribeBatchReq: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { tableStateService } = await import('../../services/tableState');

        if (cancelled) return;

        // Listen to expected_inventory changes (main inventory table)
        unsubscribeExpected = tableStateService.onExpectedInventoryChange(() => {
          console.log('📊 Expected inventory changed, triggering throttled health updates for all batches...');
          throttledHealthUpdateAllBatches(activeBatches);
        });

        // Listen to transactions that might affect inventory
        const transactionsRef = collection(db, 'transactions');
        unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
          if (!snapshot.metadata.hasPendingWrites && !snapshot.empty) {
            console.log('💰 Transaction recorded, triggering throttled health updates...');
            throttledHealthUpdateAllBatches(activeBatches);
          }
        });

        // Listen to batch requirements changes (car completion affects this)
        const batchReqRef = collection(db, 'batchRequirements');
        unsubscribeBatchReq = onSnapshot(batchReqRef, (snapshot) => {
          if (!snapshot.metadata.hasPendingWrites && !snapshot.empty) {
            console.log('🏭 Batch requirements changed, triggering throttled health updates...');
            throttledHealthUpdateAllBatches(activeBatches);
          }
        });
      } catch (err) {
        console.error('Failed to set up listeners for batch health updates:', err);
      }
    })();

    // Cleanup listeners when component unmounts or batches change
    return () => {
      cancelled = true;
      console.log('🛑 Cleaning up inventory listeners for', activeBatches.length, 'active batches');
      if (unsubscribeExpected) unsubscribeExpected();
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeBatchReq) unsubscribeBatchReq();

      // Clear pending timeout
      if (pendingHealthUpdateRef.current !== null) {
        window.clearTimeout(pendingHealthUpdateRef.current);
        pendingHealthUpdateRef.current = null;
      }
    };
  }, [batches]);

  // Throttled health update for ALL active batches - max 1 update per second, immediate if idle
  const throttledHealthUpdateAllBatches = (activeBatches: Batch[]) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastHealthUpdateRef.current;

    // If it's been more than 1 second since last update, update immediately
    if (timeSinceLastUpdate >= 1000) {
      console.log('🚀 System idle - immediate health update for', activeBatches.length, 'batches');
      lastHealthUpdateRef.current = now;
      loadAllBatchHealthStatuses();
      return;
    }

    // If we recently updated, schedule next update for exactly 1 second after last one
    if (pendingHealthUpdateRef.current === null) {
      const timeUntilNextUpdate = 1000 - timeSinceLastUpdate;
      console.log(`⏰ System busy - scheduling health update in ${timeUntilNextUpdate}ms for`, activeBatches.length, 'batches');

      pendingHealthUpdateRef.current = window.setTimeout(() => {
        console.log('⏱️ Throttled health update executing for all active batches');
        lastHealthUpdateRef.current = Date.now();
        pendingHealthUpdateRef.current = null;
        loadAllBatchHealthStatuses();
      }, timeUntilNextUpdate);
    } else {
      console.log('⏳ Health update already scheduled, ignoring this change');
    }
  };


  // Create new batch
  const handleCreateBatch = async () => {
    if (!newBatchId.trim() || !user?.email) return;
    
    setIsUploading(true);
    try {
      await batchManagementService.createBatch({
        batchId: newBatchId.trim(),
        name: `Batch ${newBatchId.trim()}`,
        items: [],
        carVins: [],
        carType: '',
        totalCars: 0,
        status: 'planning'
      });
      
      setNewBatchId('');
      await loadBatches();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create batch:', error);
      alert('Failed to create batch. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle CSV file upload (preserved from original)
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      let result: UploadResult;
      
      if (uploadType === 'vinPlans') {
        result = await batchManagementService.uploadVinPlansFromCSV(text, user.email);
      } else {
        result = await batchManagementService.uploadPackingListFromCSV(text, user.email);
      }
      
      setUploadResult(result);
      
      if (result.success > 0) {
        console.log(`✅ Successfully uploaded ${result.success} ${uploadType}`);
        
        // Manually update the selected batch with the new data
        if (selectedBatch) {
          const updatedBatch = await batchManagementService.getBatchById(selectedBatch.batchId);
          if (updatedBatch) {
            setSelectedBatch(updatedBatch);
          }
        }
        
        await loadBatches(); // Reload batches after upload
        onRefresh?.();
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
        stats: { totalRows: 0, skippedRows: 0 }
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // Generate sample data (preserved from original)
  const handleGenerateSampleData = async () => {
    if (!user?.email) return;
    
    setIsUploading(true);
    try {
      await batchManagementService.generateSampleData(user.email);
      console.log('✅ Sample batch data generated');
      alert('Sample batch data generated successfully!');
      await loadBatches();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to generate sample data:', error);
      alert('Failed to generate sample data. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // Check batch data (preserved from original)
  const handleCheckBatchData = async () => {
    try {
      console.log('🔍 Checking batch management data...');
      
      const [carTypes, batches] = await Promise.all([
        batchManagementService.getAllCarTypes(),
        batchManagementService.getAllBatches()
      ]);
      
      console.log(`📊 Batch Management Status:
- Car Types: ${carTypes.length}
- Batches: ${batches.length}
- Car Types Details:`, carTypes);
      console.log('- Batch Details:', batches);
      
      alert(`Batch Management System:\n• ${carTypes.length} Car Types\n• ${batches.length} Batches\n\nCheck console for detailed information.`);
    } catch (error) {
      console.error('Failed to check batch data:', error);
      alert('Failed to check batch data. Check console for errors.');
    }
  };

  // Delete batch
  const handleDeleteBatch = async () => {
    if (!selectedBatch || !user?.email) {
      alert('Please select a batch and ensure you are logged in');
      return;
    }

    const confirmMessage = `⚠️ DELETE Batch ${selectedBatch.batchId}?

This will permanently remove:
❌ Batch data and configuration
❌ All VIN plans and receipts
❌ Health tracking requirements
❌ All related records

This action cannot be undone!

Are you absolutely sure?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsUploading(true);
    try {
      await batchManagementService.deleteBatch(selectedBatch.batchId);
      console.log(`✅ Successfully deleted batch ${selectedBatch.batchId}`);
      
      // Clear selected batch and reload list
      setSelectedBatch(null);
      setBatchHealthStatus(null);
      await loadBatches();
      onRefresh?.();
      
      alert(`🗑️ Batch ${selectedBatch.batchId} deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete batch:', error);
      alert(`Failed to delete batch. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Activate batch with smart health tracking
  const handleActivateBatch = async () => {
    if (!selectedBatch || !user?.email) {
      alert('Please select a batch and ensure you are logged in');
      return;
    }

    // Check if batch is ready for activation
    const hasItems = selectedBatch.items && selectedBatch.items.length > 0;
    const hasVins = selectedBatch.carVins && selectedBatch.carVins.length > 0;
    
    if (!hasItems || !hasVins) {
      alert('Batch must have both packing list and VIN data before activation');
      return;
    }

    if (selectedBatch.status === 'in_progress') {
      alert('Batch is already activated');
      return;
    }

    const confirmMessage = `Activate Batch ${selectedBatch.batchId}?

This will:
✅ Calculate total material requirements
✅ Set up smart health tracking
✅ Enable automatic consumption tracking
✅ Change status to "Active"

Are you sure?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsUploading(true);
    try {
      await batchManagementService.activateBatchWithSmartHealth(selectedBatch.batchId, user.email);
      console.log(`✅ Successfully activated batch ${selectedBatch.batchId} with smart health tracking`);
      
      // Update selectedBatch status immediately to enable health monitoring
      const updatedBatch = {
        ...selectedBatch,
        status: 'in_progress' as const,
        updatedAt: new Date()
      };
      setSelectedBatch(updatedBatch);
      
      // Reload batches to show updated status in list
      await loadBatches();
      onRefresh?.();
      
      // Load health status for the newly activated batch (using updated batch object)
      await loadBatchHealth(updatedBatch);
      
      alert(`🎯 Batch ${selectedBatch.batchId} activated successfully!

Smart health tracking is now enabled.
Material consumption will be tracked automatically as cars complete.`);
    } catch (error) {
      console.error('Failed to activate batch:', error);
      alert(`Failed to activate batch. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };


  // Download template for batch operations
  const downloadTemplate = (type: 'vinPlans' | 'packingList') => {
    let csvContent = '';
    let filename = '';
    
    if (type === 'vinPlans') {
      csvContent = `batchId,vin,carType
603,VIN001603,TK1_Red_High
603,VIN002603,TK1_Red_High
603,VIN003603,TK1_Red_High`;
      filename = 'vin-cartype-template.csv';
    } else {
      csvContent = `batchId,sku,quantity,location,boxId,notes
603,A001,50,logistics,BOX-1,Engine components
603,B001,25,logistics,BOX-2,Body panels
603,C001,10,logistics,BOX-3,Control modules`;
      filename = 'packing-list-template.csv';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download current batch data
  const downloadBatchData = async (type: 'vinPlans' | 'packingList') => {
    if (!selectedBatch) {
      alert('Please select a batch first');
      return;
    }

    try {
      let csvContent = '';
      let filename = '';
      
      if (type === 'vinPlans') {
        // Download VIN plans for this batch
        csvContent = 'batchId,vin,carType\n';
        selectedBatch.carVins?.forEach(vin => {
          csvContent += `${selectedBatch.batchId},${vin},${selectedBatch.carType}\n`;
        });
        filename = `batch-${selectedBatch.batchId}-vins-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // Download packing list for this batch
        csvContent = 'batchId,sku,quantity,name\n';
        selectedBatch.items?.forEach(item => {
          csvContent += `${selectedBatch.batchId},${item.sku},${item.quantity},${item.name}\n`;
        });
        filename = `batch-${selectedBatch.batchId}-packing-${new Date().toISOString().split('T')[0]}.csv`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download batch data');
    }
  };

  // Get batch status display
  const getStatusDisplay = (batch: Batch) => {
    const hasItems = batch.items && batch.items.length > 0;
    const hasVins = batch.carVins && batch.carVins.length > 0;
    
    if (batch.status === 'in_progress') {
      // Show health indicator for active batches
      if (batch.batchId === selectedBatch?.batchId && batchHealthStatus) {
        if (batchHealthStatus.status === 'healthy') {
          return { color: 'bg-green-100 text-green-800', text: '🟢 Healthy', icon: '🟢' };
        } else if (batchHealthStatus.status === 'warning') {
          return { color: 'bg-yellow-100 text-yellow-800', text: '🟡 Warning', icon: '🟡' };
        } else {
          return { color: 'bg-red-100 text-red-800', text: '🔴 Critical', icon: '🔴' };
        }
      }
      return { color: 'bg-green-100 text-green-800', text: '✅ Active', icon: '🟢' };
    } else if (hasItems && hasVins) {
      return { color: 'bg-blue-100 text-blue-800', text: '📋 Ready', icon: '🔵' };
    } else if (hasItems || hasVins) {
      return { color: 'bg-yellow-100 text-yellow-800', text: '📦 Partial', icon: '🟡' };
    } else {
      return { color: 'bg-gray-100 text-gray-600', text: '📝 Draft', icon: '⚪' };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT PANEL - Batch List & Management */}
      <div className="space-y-4">
        {/* Batch List */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">📦 All Batches</h3>
            <span className="text-sm text-gray-500">{batches.length}</span>
          </div>
          
          {/* Create New Batch */}
          <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-lg">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="New Batch ID (e.g., 605)"
                value={newBatchId}
                onChange={(e) => setNewBatchId(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded"
                disabled={isUploading}
              />
              <button
                onClick={handleCreateBatch}
                disabled={!newBatchId.trim() || isUploading}
                className={`w-full px-3 py-1 text-xs rounded ${
                  newBatchId.trim() && !isUploading
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isUploading ? '⏳ Creating...' : '➕ Create Batch'}
              </button>
            </div>
          </div>

          {/* Batch List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {batches.map((batch) => {
              const statusDisplay = getStatusDisplay(batch);
              const isSelected = selectedBatch?.batchId === batch.batchId;
              const healthStatus = batchHealthStatuses.get(batch.batchId);
              
              // Health indicator for active batches
              const getHealthIndicator = () => {
                if (batch.status !== 'in_progress') return null;
                if (!healthStatus) return '⏳'; // Loading
                
                switch (healthStatus.status) {
                  case 'critical': return '🔴';
                  case 'warning': return '🟡';
                  case 'healthy': return '🟢';
                  default: return '❓';
                }
              };
              
              return (
                <div
                  key={batch.batchId}
                  onClick={() => setSelectedBatch(batch)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {statusDisplay.icon} {batch.batchId}
                      {getHealthIndicator()}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {batch.carType || 'No car type'} • {batch.totalCars || 0} cars
                    {healthStatus && batch.status === 'in_progress' && (
                      <span className="ml-2 text-xs">
                        • Can produce: {healthStatus.canProduceCars}/{healthStatus.totalCars}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {batches.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-2xl mb-2">📦</div>
                <p className="text-sm">No batches yet</p>
                <p className="text-xs">Create your first batch above</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Actions */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">🛠️ Global Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleGenerateSampleData}
              disabled={isUploading}
              className={`w-full px-3 py-2 text-sm rounded ${
                isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              🔧 Generate Sample Data
            </button>
            <button
              onClick={handleCheckBatchData}
              className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded"
            >
              🔍 Check Database
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Batch Details & Operations */}
      <div className="lg:col-span-2 space-y-4">
        {selectedBatch ? (
          <>
            {/* Batch Header */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">📦 Batch {selectedBatch.batchId}</h2>
                  <p className="text-sm text-gray-600">{selectedBatch.name || `Production Batch ${selectedBatch.batchId}`}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusDisplay(selectedBatch).color}`}>
                    {getStatusDisplay(selectedBatch).text}
                  </div>
                </div>
              </div>

              {/* Batch Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Car Type:</span>
                  <div className="font-medium">{selectedBatch.carType || 'Not set'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Cars:</span>
                  <div className="font-medium">{selectedBatch.totalCars || 0} VINs</div>
                </div>
                <div>
                  <span className="text-gray-600">Components:</span>
                  <div className="font-medium">{selectedBatch.items?.length || 0} types</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-medium">{selectedBatch.status || 'planning'}</div>
                </div>
              </div>

              {/* Batch Action Buttons */}
              {selectedBatch.status !== 'in_progress' && (
                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={handleActivateBatch}
                    disabled={isUploading || !selectedBatch.items?.length || !selectedBatch.carVins?.length}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium ${
                      (!isUploading && selectedBatch.items?.length && selectedBatch.carVins?.length)
                        ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isUploading 
                      ? '⏳ Activating...' 
                      : selectedBatch.items?.length && selectedBatch.carVins?.length
                        ? '🚀 Activate Batch (Enable Smart Health Tracking)'
                        : '📋 Need Both Packing List & VIN Data to Activate'
                    }
                  </button>
                  {selectedBatch.items?.length && selectedBatch.carVins?.length && (
                    <p className="mt-2 text-xs text-green-600 text-center">
                      ✅ Batch is ready for activation with smart health tracking
                    </p>
                  )}
                  
                  {/* Delete Button */}
                  <button
                    onClick={handleDeleteBatch}
                    disabled={isUploading}
                    className="mt-3 w-full px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isUploading ? '⏳ Processing...' : '🗑️ Delete Batch'}
                  </button>
                </div>
              )}

              {/* Smart Health Status for Active Batches */}
              {selectedBatch.status === 'in_progress' && (
                <div className="mt-6 pt-4 border-t">
                  {isLoadingHealth ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-center">
                        <div className="text-sm text-gray-600">⏳ Loading health status...</div>
                      </div>
                    </div>
                  ) : batchHealthStatus ? (
                    <div className={`rounded-lg p-4 ${
                      batchHealthStatus.status === 'healthy' ? 'bg-green-50 border border-green-200' :
                      batchHealthStatus.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-sm font-medium ${
                          batchHealthStatus.status === 'healthy' ? 'text-green-800' :
                          batchHealthStatus.status === 'warning' ? 'text-yellow-800' :
                          'text-red-800'
                        }`}>
                          {batchHealthStatus.status === 'healthy' ? '🟢 Batch Healthy' :
                           batchHealthStatus.status === 'warning' ? '🟡 Batch Warning' :
                           '🔴 Batch Critical'} - Real-time Health Status
                        </h4>
                        <div className="text-xs text-gray-600">
                          Can produce: {batchHealthStatus.canProduceCars}/{batchHealthStatus.totalCars} cars
                        </div>
                      </div>

                      {/* Missing Components Warning */}
                      {batchHealthStatus.blockedComponents.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium text-red-800 mb-2">❌ Missing Components:</h5>
                          <div className="space-y-1">
                            {batchHealthStatus.blockedComponents.slice(0, 3).map((component, i) => (
                              <div key={i} className="text-xs text-red-700 flex justify-between">
                                <span>{component.sku} - {component.name}</span>
                                <span>Need: {component.needed}, Have: {component.available}</span>
                              </div>
                            ))}
                            {batchHealthStatus.blockedComponents.length > 3 && (
                              <div className="text-xs text-red-600">
                                ... and {batchHealthStatus.blockedComponents.length - 3} more missing components
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Batch Progress */}
                      <div className="text-xs text-gray-600">
                        <div>Cars Remaining: {batchHealthStatus.carsRemaining}</div>
                        <div>Last Updated: {new Date(batchHealthStatus.checkedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">🔬 Smart Health Tracking Active</h4>
                        <div className="text-xs text-gray-600">Setup required</div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>✅ Material requirements calculated and tracked</div>
                        <div>✅ Automatic consumption on car completion</div>
                        <div>⚠️ Health data not available - check Setup configuration</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Delete Button for Active Batches */}
                  <button
                    onClick={handleDeleteBatch}
                    disabled={isUploading}
                    className="mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isUploading ? '⏳ Processing...' : '🗑️ Delete Batch'}
                  </button>
                </div>
              )}

              {/* VINs Display */}
              {selectedBatch.carVins && selectedBatch.carVins.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">🚗 Vehicle VINs:</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {selectedBatch.carVins.slice(0, 6).map((vin, i) => (
                      <div key={i} className="bg-gray-50 px-2 py-1 rounded text-xs font-mono">
                        {vin}
                      </div>
                    ))}
                    {selectedBatch.carVins.length > 6 && (
                      <div className="text-xs text-gray-500 col-span-2">
                        ... and {selectedBatch.carVins.length - 6} more VINs
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Components Display */}
              {selectedBatch.items && selectedBatch.items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">🔧 Components Required:</h4>
                  <div className="space-y-1">
                    {selectedBatch.items.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{item.sku} - {item.name}</span>
                        <span className="font-medium">{item.quantity} units</span>
                      </div>
                    ))}
                    {selectedBatch.items.length > 5 && (
                      <div className="text-xs text-gray-500">
                        ... and {selectedBatch.items.length - 5} more components
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white border rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Batch</h3>
            <p className="text-sm text-gray-500">
              Choose a batch from the left panel to view its details
            </p>
          </div>
        )}

        {/* CSV Upload Section */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📤 CSV Upload & Download</h3>
          
          {/* Upload Type Selection - Simplified to core operations */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="uploadType" 
                  value="packingList"
                  checked={uploadType === 'packingList'}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">📦 Packing List</span>
              </label>
              <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="uploadType" 
                  value="vinPlans"
                  checked={uploadType === 'vinPlans'}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-sm">🚗 VIN/CarType</span>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          <div className="mb-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={isUploading}
              className="hidden"
              id="batch-csv-upload"
            />
            <label
              htmlFor="batch-csv-upload"
              className={`w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white ${
                isUploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                `📤 Upload ${uploadType === 'vinPlans' ? 'VIN/CarType' : 'Packing List'} CSV`
              )}
            </label>
          </div>

          {/* Template Downloads & Current Batch Downloads */}
          <div className="space-y-3 mb-4">
            <div className="text-sm font-medium text-gray-700">📄 Templates:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadTemplate('packingList')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
              >
                📄 Packing List Template
              </button>
              <button
                onClick={() => downloadTemplate('vinPlans')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
              >
                📄 VIN/CarType Template
              </button>
            </div>
            
            {selectedBatch && (
              <>
                <div className="text-sm font-medium text-gray-700 mt-4">📥 Download Current Batch Data:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadBatchData('packingList')}
                    className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                  >
                    📥 Download Packing List
                  </button>
                  <button
                    onClick={() => downloadBatchData('vinPlans')}
                    className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                  >
                    📥 Download VIN/CarType
                  </button>
                </div>
              </>
            )}
          </div>


          {/* Upload Result */}
          {uploadResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm">
                <div className="text-green-600 font-medium">
                  ✅ Successfully processed: {uploadResult.success}
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="text-red-600 mt-1">
                    ❌ Errors: {uploadResult.errors.length}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs">Show details</summary>
                      <div className="text-xs mt-1 space-y-1">
                        {uploadResult.errors.map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
                <div className="text-gray-600 text-xs mt-1">
                  📊 Processed {uploadResult.stats.totalRows} rows, skipped {uploadResult.stats.skippedRows}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
