import { memo, useState, useEffect } from 'react';
import { batchManagementService } from '../../services/batchManagement';
import { Batch } from '../../types/inventory';
import { ColumnPreview, ColumnMapping, packingBoxesService, SkippedRowDetail } from '../../services/packingBoxesService';
import { PackingListColumnMapper } from './PackingListColumnMapper';
import { DeleteBatchModal } from './DeleteBatchModal';
import * as XLSX from 'xlsx';

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
  skippedDetails?: SkippedRowDetail[];
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
  // DISABLED: Health tracking removed for performance
  // const [batchHealthStatus, setBatchHealthStatus] = useState<BatchHealthStatus | null>(null);
  // const [batchHealthStatuses] = useState<Map<string, BatchHealthStatus>>(new Map());
  // const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [batchBoxCounts, setBatchBoxCounts] = useState<Map<string, number>>(new Map());

  // NEW: Column mapping state for flexible CSV import
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnPreviews, setColumnPreviews] = useState<ColumnPreview[]>([]);
  const [pendingCsvText, setPendingCsvText] = useState<string>('');

  // XLSX sheet selector state
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [xlsxSheetNames, setXlsxSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  // DISABLED: Automatic loading of health status for all batches
  // Load health statuses for all batches when batches change
  // useEffect(() => {
  //   if (batches.length > 0) {
  //     loadAllBatchHealthStatuses();
  //   }
  // }, [batches]);

  const loadBatches = async () => {
    try {
      const batchData = await batchManagementService.getAllBatches();
      setBatches(batchData);
      if (batchData.length > 0 && !selectedBatch) {
        setSelectedBatch(batchData[0]);
      }

      // Load box counts for all batches
      await loadAllBoxCounts(batchData);
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

  const loadAllBoxCounts = async (batchList: Batch[]) => {
    const { packingBoxesService } = await import('../../services/packingBoxesService');
    const counts = new Map<string, number>();

    for (const batch of batchList) {
      try {
        const boxes = await packingBoxesService.listBoxes(batch.batchId);
        counts.set(batch.batchId, boxes.length);
      } catch (error) {
        console.error(`Failed to load boxes for batch ${batch.batchId}:`, error);
        counts.set(batch.batchId, 0);
      }
    }

    setBatchBoxCounts(counts);
  };

  // DISABLED: Load health status for activated batches
  // const loadBatchHealth = async (batch: Batch) => {
  //   if (batch.status !== 'in_progress') {
  //     setBatchHealthStatus(null);
  //     return;
  //   }
  //
  //   setIsLoadingHealth(true);
  //   try {
  //     const healthStatus = await batchManagementService.getBatchHealthStatus(batch.batchId);
  //     setBatchHealthStatus(healthStatus);
  //     console.log(`🔬 Health status for batch ${batch.batchId}:`, healthStatus);
  //   } catch (error) {
  //     console.error('Failed to load batch health:', error);
  //     setBatchHealthStatus(null);
  //   } finally {
  //     setIsLoadingHealth(false);
  //   }
  // };

  // DISABLED: Load health status for ALL active batches with priority allocation
  // const loadAllBatchHealthStatuses = async () => {
  //   console.log('🏥 Loading global batch health with priority allocation...');
  //   const activeBatches = batches.filter(batch => batch.status === 'in_progress');
  //
  //   if (activeBatches.length === 0) {
  //     setBatchHealthStatuses(new Map());
  //     return;
  //   }
  //
  //   try {
  //     // Use new global priority-based health system
  //     const globalHealthResults = await batchManagementService.getGlobalBatchHealthStatuses();
  //     setBatchHealthStatuses(globalHealthResults);
  //
  //     console.log(`✅ Loaded priority-based health for ${globalHealthResults.size} active batches:`, {
  //       healthy: [...globalHealthResults.values()].filter(h => h.status === 'healthy').length,
  //       warning: [...globalHealthResults.values()].filter(h => h.status === 'warning').length,
  //       critical: [...globalHealthResults.values()].filter(h => h.status === 'critical').length
  //     });
  //
  //     // Log priority order and missing components for debugging
  //     const sortedBatches = batches
  //       .filter(b => b.status === 'in_progress')
  //       .sort((a, b) => {
  //         try {
  //           const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
  //           const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
  //
  //           if (isNaN(aTime) && isNaN(bTime)) return 0;
  //           if (isNaN(aTime)) return 1;
  //           if (isNaN(bTime)) return -1;
  //
  //           return aTime - bTime;
  //         } catch (error) {
  //           console.warn('Batch sorting error:', error);
  //           return 0;
  //         }
  //       });
  //
  //     sortedBatches.forEach((batch, index) => {
  //       const health = globalHealthResults.get(batch.batchId);
  //       if (health) {
  //         const priorityInfo = `Priority ${index + 1}`;
  //         const missingInfo = health.blockedComponents.length > 0
  //           ? `Missing: ${health.blockedComponents.map(c => `${c.sku}*${c.shortfall}`).join(', ')}`
  //           : 'No missing components';
  //         console.log(`📊 Batch ${batch.batchId} - ${priorityInfo} - ${health.status.toUpperCase()} - ${missingInfo}`);
  //       }
  //     });
  //
  //   } catch (error) {
  //     console.error('❌ Failed to load global batch health:', error);
  //     // Fallback to empty map on error
  //     setBatchHealthStatuses(new Map());
  //   }
  // };

  // DISABLED: Auto-load health when selected batch changes (too much for now with thousands of parts)
  // useEffect(() => {
  //   if (selectedBatch) {
  //     loadBatchHealth(selectedBatch);
  //   } else {
  //     setBatchHealthStatus(null);
  //   }
  // }, [selectedBatch]);

  // DISABLED: Automatic health tracking is too much for now
  // Event-driven health updates - listen to inventory changes for ALL batches
  // useEffect(() => {
  //   const activeBatches = batches.filter(batch => batch.status === 'in_progress');
  //   if (activeBatches.length === 0) {
  //     return; // Nothing to listen to
  //   }

  //   console.log('🎧 Setting up inventory change listeners for', activeBatches.length, 'active batches');

  //   let unsubscribeExpected: (() => void) | null = null;
  //   let unsubscribeTransactions: (() => void) | null = null;
  //   let unsubscribeBatchReq: (() => void) | null = null;
  //   let cancelled = false;

  //   (async () => {
  //     try {
  //       const { tableStateService } = await import('../../services/tableState');

  //       if (cancelled) return;

  //       // Listen to expected_inventory changes (main inventory table)
  //       unsubscribeExpected = tableStateService.onExpectedInventoryChange(() => {
  //         console.log('📊 Expected inventory changed, triggering throttled health updates for all batches...');
  //         throttledHealthUpdateAllBatches(activeBatches);
  //       });

  //       // Listen to transactions that might affect inventory
  //       const transactionsRef = collection(db, 'transactions');
  //       unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
  //         if (!snapshot.metadata.hasPendingWrites && !snapshot.empty) {
  //           console.log('💰 Transaction recorded, triggering throttled health updates...');
  //           throttledHealthUpdateAllBatches(activeBatches);
  //         }
  //       });

  //       // Listen to batch requirements changes (car completion affects this)
  //       const batchReqRef = collection(db, 'batchRequirements');
  //       unsubscribeBatchReq = onSnapshot(batchReqRef, (snapshot) => {
  //         if (!snapshot.metadata.hasPendingWrites && !snapshot.empty) {
  //           console.log('🏭 Batch requirements changed, triggering throttled health updates...');
  //           throttledHealthUpdateAllBatches(activeBatches);
  //         }
  //       });
  //     } catch (err) {
  //       console.error('Failed to set up listeners for batch health updates:', err);
  //     }
  //   })();

  //   // Cleanup listeners when component unmounts or batches change
  //   return () => {
  //     cancelled = true;
  //     console.log('🛑 Cleaning up inventory listeners for', activeBatches.length, 'active batches');
  //     if (unsubscribeExpected) unsubscribeExpected();
  //     if (unsubscribeTransactions) unsubscribeTransactions();
  //     if (unsubscribeBatchReq) unsubscribeBatchReq();

  //     // Clear pending timeout
  //     if (pendingHealthUpdateRef.current !== null) {
  //       window.clearTimeout(pendingHealthUpdateRef.current);
  //       pendingHealthUpdateRef.current = null;
  //     }
  //   };
  // }, [batches]);


  // Create new batch
  const handleCreateBatch = async () => {
    if (!newBatchId.trim() || !user?.email) return;

    const trimmedId = newBatchId.trim();
    setIsUploading(true);
    try {
      await batchManagementService.createBatch({
        batchId: trimmedId,
        name: `Batch ${trimmedId}`,
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

  // Handle CSV/XLSX file upload with smart column mapping
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    try {
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      // If XLSX file, parse it and show sheet selector
      if (isXlsx) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get all sheet names
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
          alert('❌ No sheets found in Excel file.');
          event.target.value = '';
          return;
        }

        // If only one sheet, use it directly
        if (sheetNames.length === 1) {
          const worksheet = workbook.Sheets[sheetNames[0]];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          await processCSVText(csvText, event);
        } else {
          // Multiple sheets - show selector
          setPendingWorkbook(workbook);
          setXlsxSheetNames(sheetNames);
          setSelectedSheet(sheetNames[0]); // Default to first sheet
          setShowSheetSelector(true);
        }
        event.target.value = '';
        return;
      }

      // Handle regular CSV file
      const text = await file.text();
      await processCSVText(text, event);

    } catch (error) {
      console.error('File upload failed:', error);
      setUploadResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
        stats: { totalRows: 0, skippedRows: 0 }
      });
      setIsUploading(false);
    } finally {
      event.target.value = '';
    }
  };

  // Process CSV text (common logic for both CSV and XLSX)
  const processCSVText = async (text: string, event?: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (uploadType === 'vinPlans') {
        // VIN upload path remains unchanged (standardized format)
        setIsUploading(true);
        setUploadResult(null);
        const result = await batchManagementService.uploadVinPlansFromCSV(text, user!.email);
        setUploadResult(result);

        if (result.success > 0) {
          console.log(`✅ Successfully uploaded ${result.success} VIN plans`);
          if (selectedBatch) {
            const updatedBatch = await batchManagementService.getBatchById(selectedBatch.batchId);
            if (updatedBatch) {
              setSelectedBatch(updatedBatch);
            }
          }
          await loadBatches();
          onRefresh?.();
        }
        setIsUploading(false);
      } else {
        // NEW: Packing list flow with column mapper
        if (!selectedBatch) {
          alert('Please select a batch first');
          if (event) event.target.value = '';
          return;
        }

        const confirmReplace = window.confirm(
          `This will replace all boxes for batch ${selectedBatch.batchId}. Continue?`
        );
        if (!confirmReplace) {
          if (event) event.target.value = '';
          return;
        }

        // Generate column preview
        const previews = packingBoxesService.generateColumnPreview(text);

        if (previews.length === 0) {
          alert('❌ Could not parse file. Please check the file format.');
          if (event) event.target.value = '';
          return;
        }

        // Store CSV text and show mapper
        setPendingCsvText(text);
        setColumnPreviews(previews);
        setShowColumnMapper(true);
      }
    } catch (error) {
      console.error('Processing failed:', error);
      setUploadResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Processing failed'],
        stats: { totalRows: 0, skippedRows: 0 }
      });
      setIsUploading(false);
    }
  };

  // Handle sheet selection confirmation
  const handleSheetSelect = async () => {
    if (!pendingWorkbook || !selectedSheet) return;

    try {
      const worksheet = pendingWorkbook.Sheets[selectedSheet];
      const csvText = XLSX.utils.sheet_to_csv(worksheet);

      // Close sheet selector
      setShowSheetSelector(false);
      setPendingWorkbook(null);

      // Process the selected sheet
      await processCSVText(csvText);
    } catch (error) {
      console.error('Sheet processing failed:', error);
      alert('❌ Failed to process selected sheet.');
    }
  };

  // Handle column mapping confirmation
  const handleColumnMappingConfirm = async (mapping: ColumnMapping) => {
    if (!selectedBatch || !user?.email) return;

    setShowColumnMapper(false);
    setIsUploading(true);
    setUploadResult(null);

    try {
      const stats = await packingBoxesService.importPackingListWithMapping(
        selectedBatch.batchId,
        pendingCsvText,
        mapping
      );

      const result: UploadResult = {
        success: stats.boxes,
        errors: stats.errors,
        stats: { totalRows: stats.totalRows, skippedRows: stats.skippedRows },
        skippedDetails: stats.skippedDetails
      };

      setUploadResult(result);

      if (result.success > 0) {
        console.log(`✅ Successfully uploaded ${result.success} packing boxes`);

        // Update selected batch
        const updatedBatch = await batchManagementService.getBatchById(selectedBatch.batchId);
        if (updatedBatch) {
          setSelectedBatch(updatedBatch);
        }

        await loadBatches();
        onRefresh?.();
      }
    } catch (error) {
      console.error('CSV import failed:', error);
      setUploadResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        stats: { totalRows: 0, skippedRows: 0 }
      });
    } finally {
      setIsUploading(false);
      setPendingCsvText('');
      setColumnPreviews([]);
    }
  };

  // Handle column mapping cancellation
  const handleColumnMappingCancel = () => {
    setShowColumnMapper(false);
    setPendingCsvText('');
    setColumnPreviews([]);
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

  // Show delete modal
  const handleDeleteBatch = () => {
    if (!selectedBatch || !user?.email) {
      alert('Please select a batch and ensure you are logged in');
      return;
    }

    if (selectedBatch.batchId === 'DEFAULT') {
      alert('Cannot delete DEFAULT batch - it is a system batch');
      return;
    }

    setShowDeleteModal(true);
  };

  // Perform the actual deletion
  const handleConfirmDelete = async () => {
    if (!selectedBatch) return;

    setIsUploading(true);
    try {
      await batchManagementService.deleteBatch(selectedBatch.batchId);
      console.log(`✅ Successfully deleted batch ${selectedBatch.batchId}`);

      // Clear selected batch and reload list
      setSelectedBatch(null);
      setShowDeleteModal(false);
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

    // Check if batch has packing boxes (new system)
    const { packingBoxesService } = await import('../../services/packingBoxesService');
    const boxes = await packingBoxesService.listBoxes(selectedBatch.batchId);

    if (boxes.length === 0) {
      alert('Batch must have a packing list (boxes) before activation');
      return;
    }

    if (selectedBatch.status === 'in_progress') {
      alert('Batch is already activated');
      return;
    }

    const confirmMessage = `Activate Batch ${selectedBatch.batchId}?

This will:
✅ Calculate total material requirements from packing list
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
      
      // DISABLED: Load health status for the newly activated batch (using updated batch object)
      // await loadBatchHealth(updatedBatch);

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
    const bid = selectedBatch?.batchId || '603';
    
    if (type === 'vinPlans') {
      csvContent = `batchId,vin,carType\n${bid},VIN001${bid},TK1_Red_High\n${bid},VIN002${bid},TK1_Red_High\n${bid},VIN003${bid},TK1_Red_High`;
      filename = 'vin-cartype-template.csv';
    } else {
      // Minimal packing list template (batch chosen in UI)
      csvContent = `CASE NO,PART NO,QTY\nC10C1,A001,2\nC10C1,B001,1\nC10C2,C001,3`;
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
    const hasBoxes = (batchBoxCounts.get(batch.batchId) || 0) > 0;
    const hasVins = batch.carVins && batch.carVins.length > 0;

    if (batch.status === 'in_progress') {
      // DISABLED: Health indicator removed for performance
      return { color: 'bg-green-100 text-green-800', text: '✅ Active', icon: '🟢' };
    } else if (hasBoxes && hasVins) {
      return { color: 'bg-blue-100 text-blue-800', text: '📋 Ready', icon: '🔵' };
    } else if (hasBoxes || hasVins) {
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
            <span className="text-sm text-gray-500">{batches.filter(b => b.batchId !== 'DEFAULT').length}</span>
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

          {/* Batch List - Sorted by Priority (Upload Sequence) */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {batches
              .filter(batch => batch.batchId !== 'DEFAULT') // Hide DEFAULT batch from UI
              .sort((a, b) => {
                try {
                  const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                  const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                  
                  // Handle invalid dates
                  if (isNaN(aTime) && isNaN(bTime)) return 0;
                  if (isNaN(aTime)) return 1; // Put invalid dates at end
                  if (isNaN(bTime)) return -1;
                  
                  return aTime - bTime;
                } catch (error) {
                  console.warn('Date comparison error:', error);
                  return 0; // Keep original order if comparison fails
                }
              }) // Priority order: earlier uploaded first
              .map((batch) => {
              const statusDisplay = getStatusDisplay(batch);
              const isSelected = selectedBatch?.batchId === batch.batchId;
              // DISABLED: const healthStatus = batchHealthStatuses.get(batch.batchId);
              const isActive = batch.status === 'in_progress';
              const batchTime = (() => {
                try {
                  return batch.createdAt instanceof Date ? batch.createdAt : new Date(batch.createdAt);
                } catch (error) {
                  console.warn('Batch date parsing error:', error);
                  return new Date(); // fallback to current date
                }
              })();
              const priorityNumber = isActive ? batches.filter(b => {
                try {
                  if (b.status !== 'in_progress') return false;
                  const bTime = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                  return bTime <= batchTime;
                } catch (error) {
                  return false;
                }
              }).length : null;

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
                      {priorityNumber !== null && priorityNumber > 0 && (
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">
                          #{priorityNumber}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {batch.carType || 'No car type'} • {batch.totalCars || 0} cars
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
                  <span className="text-gray-600">Packing Boxes:</span>
                  <div className="font-medium">{batchBoxCounts.get(selectedBatch.batchId) || 0} boxes</div>
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
                    disabled={isUploading || (batchBoxCounts.get(selectedBatch.batchId) || 0) === 0}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium ${
                      (!isUploading && (batchBoxCounts.get(selectedBatch.batchId) || 0) > 0)
                        ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isUploading
                      ? '⏳ Activating...'
                      : (batchBoxCounts.get(selectedBatch.batchId) || 0) > 0
                        ? '🚀 Activate Batch (Enable Smart Health Tracking)'
                        : '📋 Need Packing List to Activate'
                    }
                  </button>
                  {(batchBoxCounts.get(selectedBatch.batchId) || 0) > 0 && (
                    <p className="mt-2 text-xs text-green-600 text-center">
                      ✅ Batch is ready for activation with smart health tracking
                      {!selectedBatch.carVins?.length && ' (VIN data optional)'}
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

              {/* DISABLED: Smart Health Status for Active Batches - too much for now with thousands of parts */}
              {selectedBatch.status === 'in_progress' && (
                <div className="mt-6 pt-4 border-t">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-800">✅ Batch Activated</h4>
                      <div className="text-xs text-blue-600">Smart tracking enabled</div>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>✅ Material requirements calculated from packing boxes</div>
                      <div>✅ Automatic consumption tracking ready</div>
                      <div>📊 Health monitoring temporarily disabled for performance</div>
                    </div>
                  </div>

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

          {/* Separate Upload Buttons */}
          <div className="mb-4 space-y-3">
            {/* Packing List Upload */}
            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  setUploadType('packingList');
                  handleCSVUpload(e);
                }}
                disabled={isUploading}
                className="hidden"
                id="packing-list-upload"
              />
              <label
                htmlFor="packing-list-upload"
                className={`w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white ${
                  isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                {isUploading && uploadType === 'packingList' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading Packing List...
                  </>
                ) : (
                  '📤 Upload Packing List (CSV/Excel)'
                )}
              </label>
            </div>

            {/* VIN/CarType Upload */}
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setUploadType('vinPlans');
                  handleCSVUpload(e);
                }}
                disabled={isUploading}
                className="hidden"
                id="vin-cartype-upload"
              />
              <label
                htmlFor="vin-cartype-upload"
                className={`w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white ${
                  isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                }`}
              >
                {isUploading && uploadType === 'vinPlans' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading VIN/CarType...
                  </>
                ) : (
                  '📤 Upload VIN/CarType CSV'
                )}
              </label>
            </div>
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
                  {uploadResult.skippedDetails && uploadResult.skippedDetails.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-orange-600 font-medium">
                        ⚠️ View {uploadResult.skippedDetails.length} skipped row{uploadResult.skippedDetails.length !== 1 ? 's' : ''}
                      </summary>
                      <div className="mt-2 max-h-60 overflow-y-auto border border-orange-200 rounded bg-orange-50 p-2">
                        <table className="w-full text-xs">
                          <thead className="border-b border-orange-300 bg-orange-100">
                            <tr>
                              <th className="text-left p-1">Row #</th>
                              <th className="text-left p-1">CASE NO</th>
                              <th className="text-left p-1">PART NO</th>
                              <th className="text-left p-1">QTY</th>
                              <th className="text-left p-1">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadResult.skippedDetails.map((detail, idx) => (
                              <tr key={idx} className="border-b border-orange-200 hover:bg-orange-100">
                                <td className="p-1 font-mono font-bold">{detail.rowNumber}</td>
                                <td className="p-1 font-mono text-gray-700">
                                  {detail.extractedValues?.caseNo || '?'}
                                </td>
                                <td className="p-1 font-mono text-gray-700">
                                  {detail.extractedValues?.partNo || '?'}
                                </td>
                                <td className="p-1 font-mono text-gray-700">
                                  {detail.extractedValues?.qty || '?'}
                                </td>
                                <td className="p-1 text-orange-700">
                                  {detail.reason}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-gray-600">Show raw row data</summary>
                          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                            {uploadResult.skippedDetails.map((detail, idx) => (
                              <div key={idx} className="font-mono text-gray-500 text-xs border-l-2 border-gray-300 pl-2">
                                <span className="font-bold">Row {detail.rowNumber}:</span> {detail.rowData.join(', ')}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Mapper Modal */}
      {showColumnMapper && (
        <PackingListColumnMapper
          previews={columnPreviews}
          onConfirm={handleColumnMappingConfirm}
          onCancel={handleColumnMappingCancel}
        />
      )}

      {/* Delete Batch Modal */}
      {showDeleteModal && selectedBatch && (
        <DeleteBatchModal
          batch={selectedBatch}
          boxCount={batchBoxCounts.get(selectedBatch.batchId) || 0}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Excel Sheet Selector Modal */}
      {showSheetSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h3 className="text-xl font-bold text-gray-900">Select Excel Sheet</h3>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">
              This Excel file contains multiple sheets. Please select which sheet contains the packing list data:
            </p>

            {/* Sheet List */}
            <div className="mb-6 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {xlsxSheetNames.map((sheetName, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    idx !== xlsxSheetNames.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="sheet-select"
                    value={sheetName}
                    checked={selectedSheet === sheetName}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-900">{sheetName}</span>
                  {idx === 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">First</span>
                  )}
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSheetSelector(false);
                  setPendingWorkbook(null);
                  setXlsxSheetNames([]);
                  setSelectedSheet('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSheetSelect}
                disabled={!selectedSheet}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
