import React, { memo, useState, useEffect } from 'react';
import { scanLookupService } from '../../services/scanLookupService';
import { batchManagementService } from '../../services/batchManagement';

interface UploadResult {
  success: number;
  errors: string[];
  stats?: {
    totalRows: number;
    skippedRows: number;
    filledZones: number;
  };
}

interface ScannerOperationsCardProps {
  user: { email: string } | null;
  scannerStatus: 'idle' | 'initializing' | 'ready' | 'error';
  setScannerStatus: (status: 'idle' | 'initializing' | 'ready' | 'error') => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  uploadResult: UploadResult | null;
  setUploadResult: (result: UploadResult | null) => void;
  replaceMode: boolean;
  setReplaceMode: (mode: boolean) => void;
}

export const ScannerOperationsCard = memo(function ScannerOperationsCard({
  user,
  scannerStatus,
  setScannerStatus,
  isUploading,
  setIsUploading,
  uploadResult,
  setUploadResult,
  replaceMode,
  setReplaceMode,
}: ScannerOperationsCardProps) {
  // Car type selection (v7.19.0)
  const [availableCarTypes, setAvailableCarTypes] = useState<Array<{carCode: string; name: string}>>([]);
  const [selectedCarType, setSelectedCarType] = useState<string>('TK1');
  const [carTypesLoading, setCarTypesLoading] = useState(false);

  // Load car types on mount (v7.19.0)
  useEffect(() => {
    const loadCarTypes = async () => {
      try {
        setCarTypesLoading(true);
        await batchManagementService.ensureTK1CarTypeExists();
        const carTypes = await batchManagementService.getAllCarTypes();
        setAvailableCarTypes(carTypes.map(ct => ({ carCode: ct.carCode, name: ct.name })));

        // Default to TK1 if available
        if (carTypes.some(ct => ct.carCode === 'TK1')) {
          setSelectedCarType('TK1');
        } else if (carTypes.length > 0) {
          setSelectedCarType(carTypes[0].carCode);
        }
      } catch (error) {
        console.error('Failed to load car types:', error);
      } finally {
        setCarTypesLoading(false);
      }
    };

    loadCarTypes();
  }, []);

  // Initialize scanner test data
  const handleInitializeScanner = async () => {
    if (!user?.email) return;
    
    setScannerStatus('initializing');
    try {
      await scanLookupService.generateTestData(user.email);
      setScannerStatus('ready');
      console.log('✅ Scanner test data initialized');
    } catch (error) {
      console.error('Failed to initialize scanner data:', error);
      setScannerStatus('error');
    }
  };

  // Check what data exists in scanner lookup table (v7.19.0: car-type-filtered)
  const handleCheckScannerData = async () => {
    try {
      console.log('🔍 Checking scanner data for car type:', selectedCarType);
      const allLookups = await scanLookupService.getAllLookups(selectedCarType);
      console.log(`📊 Found ${allLookups.length} scanner entries for ${selectedCarType}:`, allLookups);

      // Test a specific lookup (if A001 exists for this car type)
      const testResult = await scanLookupService.getLookupBySKU('A001', selectedCarType);
      console.log(`🎯 A001 lookup result for ${selectedCarType}:`, testResult);

      alert(`Scanner database has ${allLookups.length} entries for car type ${selectedCarType}. Check console for details.`);
    } catch (error) {
      console.error('Failed to check scanner data:', error);
      alert('Failed to check scanner data. Check console for errors.');
    }
  };

  // Handle CSV file upload for scanner lookup table
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      // Parse CSV by header names (more robust than position-based)
      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());
      
      // Find column indices by header names (flexible matching) - v7.19.0: added perCarQuantity
      const skuIndex = headers.findIndex(h => h.includes('sku') || h.includes('part no') || h.includes('partno'));
      const zoneIndex = headers.findIndex(h => h.includes('zone') || h.includes('target') || h.includes('location'));
      const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('item') || h.includes('part name'));
      const qtyIndex = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('expected'));
      const perCarQtyIndex = headers.findIndex(h => h.includes('per car') || h.includes('percar') || h.includes('per_car'));

      if (skuIndex === -1) {
        throw new Error('CSV must have a SKU column (SKU, PART NO, or similar)');
      }
      if (zoneIndex === -1) {
        throw new Error('CSV must have a Zone column (Zone, Target, Location, or similar)');
      }

      console.log(`📋 CSV Column Mapping:`);
      console.log(`   SKU: Column ${skuIndex + 1} (${headers[skuIndex]})`);
      console.log(`   Zone: Column ${zoneIndex + 1} (${headers[zoneIndex]})`);
      console.log(`   ItemName: Column ${nameIndex + 1} (${nameIndex >= 0 ? headers[nameIndex] : 'not found'})`);
      console.log(`   Quantity: Column ${qtyIndex + 1} (${qtyIndex >= 0 ? headers[qtyIndex] : 'not found'})`);
      console.log(`   PerCarQty: Column ${perCarQtyIndex + 1} (${perCarQtyIndex >= 0 ? headers[perCarQtyIndex] : 'not found'})`);

      const lookups = [];
      let currentZone = ''; // Track current zone for merged cell handling
      let skippedRows = 0;
      let filledZones = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"(.*)"$/, '$1')); // Remove quotes
        
        if (parts.length < Math.max(skuIndex + 1, zoneIndex + 1)) {
          skippedRows++;
          continue;
        }
        
        let sku = parts[skuIndex]?.trim();
        let targetZone = parts[zoneIndex]?.trim();
        const itemName = nameIndex >= 0 ? (parts[nameIndex] || '') : '';
        const expectedQuantity = qtyIndex >= 0 && parts[qtyIndex] && parts[qtyIndex].trim() ? parseInt(parts[qtyIndex]) : null;
        const perCarQuantity = perCarQtyIndex >= 0 && parts[perCarQtyIndex] && parts[perCarQtyIndex].trim() ? parseInt(parts[perCarQtyIndex]) : null;

        // Skip invalid SKU entries (empty, "/", or other invalid patterns)
        if (!sku || sku === '/' || sku.startsWith('//') || sku.length === 0) {
          console.warn(`Row ${i + 1}: Skipping invalid SKU "${sku}"`);
          skippedRows++;
          continue;
        }
        
        // Handle merged cell zones (Excel exports empty cells for merged ranges)
        if (!targetZone && currentZone) {
          targetZone = currentZone;
          filledZones++;
          console.log(`Row ${i + 1}: Filled empty zone for ${sku} with ${targetZone}`);
        } else if (targetZone) {
          currentZone = targetZone; // Update current zone when we find a new one
        }
        
        // Skip if still no zone available
        if (!targetZone) {
          console.warn(`Row ${i + 1}: No zone available for SKU ${sku}`);
          skippedRows++;
          continue;
        }

        // Normalize SKU to uppercase for consistency
        sku = sku.toUpperCase();

        // Validate zone format - allow alphanumeric, spaces, dashes, underscores
        if (!/^[A-Za-z0-9\-_ ]+$/.test(targetZone)) {
          console.warn(`Row ${i + 1}: Skipping invalid zone format "${targetZone}" for SKU ${sku}`);
          skippedRows++;
          continue;
        }

        // Validate expected quantity if provided
        if (expectedQuantity !== null && (isNaN(expectedQuantity) || expectedQuantity < 0)) {
          console.warn(`Row ${i + 1}: Skipping invalid quantity ${parts[3]} for SKU ${sku}`);
          skippedRows++;
          continue;
        }

        // Only skip if this is an EXACT duplicate row (same SKU, Zone, ItemName, and Quantity)
        // This prevents importing the exact same row twice from the same CSV file
        // Components can legitimately exist in multiple zones, so we keep all valid combinations
        const duplicateIndex = lookups.findIndex(lookup => 
          lookup.sku === sku && 
          lookup.targetZone === targetZone && 
          lookup.itemName === itemName &&
          lookup.expectedQuantity === expectedQuantity
        );
        
        if (duplicateIndex >= 0) {
          console.warn(`Row ${i + 1}: Skipping identical duplicate row ${sku} in ${targetZone}`);
          skippedRows++;
          continue;
        }

        const lookupData: any = {
          sku,
          targetZone,
          itemName,
          updatedBy: user.email
        };

        // Only add expectedQuantity if it has a valid value
        if (expectedQuantity !== null) {
          lookupData.expectedQuantity = expectedQuantity;
        }

        // Only add perCarQuantity if it has a valid value (v7.19.0)
        if (perCarQuantity !== null && !isNaN(perCarQuantity) && perCarQuantity > 0) {
          lookupData.perCarQuantity = perCarQuantity;
        }

        lookups.push(lookupData);
      }

      // Report cleaning statistics
      console.log(`📊 CSV Cleaning Summary:`);
      console.log(`   📥 Total rows processed: ${lines.length - 1}`);
      console.log(`   ✅ Valid entries: ${lookups.length}`);
      console.log(`   🔧 Zones filled from merged cells: ${filledZones}`);
      console.log(`   ⚠️ Rows skipped: ${skippedRows}`);
      
      if (filledZones > 0) {
        console.log(`   🎯 Automatically fixed ${filledZones} empty zones from Excel merged cells`);
      }

      if (lookups.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      console.log(`📥 Importing ${lookups.length} scanner lookups for car type ${selectedCarType}... (Replace mode: ${replaceMode})`);

      let result;
      if (replaceMode) {
        // Replace mode: clear all existing data for this car type first (v7.19.0)
        console.log(`🗑️ Replace mode: clearing all existing data for ${selectedCarType}...`);
        const existingLookups = await scanLookupService.getAllLookups(selectedCarType);
        for (const lookup of existingLookups) {
          await scanLookupService.deleteLookup(lookup.sku, lookup.carType, lookup.targetZone);
        }
        result = await scanLookupService.bulkImport(lookups, selectedCarType, user.email);
        console.log('✅ CSV replace completed:', result);
      } else {
        // Update mode: add/update only (v7.19.0: car-type-specific)
        result = await scanLookupService.bulkImport(lookups, selectedCarType, user.email);
        console.log('✅ CSV update completed:', result);
      }
      
      // Include cleaning statistics in the result
      const resultWithStats: UploadResult = {
        ...result,
        stats: {
          totalRows: lines.length - 1,
          skippedRows,
          filledZones
        }
      };
      
      setUploadResult(resultWithStats);

    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadResult({ success: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] });
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Download current scanner data as CSV (v7.19.0: car-type-filtered, includes perCarQuantity)
  const handleDownloadCSV = async () => {
    try {
      console.log(`📥 Downloading scanner data for car type ${selectedCarType}...`);
      const allLookups = await scanLookupService.getAllLookups(selectedCarType);

      if (allLookups.length === 0) {
        alert(`No scanner data to download for car type ${selectedCarType}`);
        return;
      }

      // Create CSV content with headers (v7.19.0: added CarType and PerCarQuantity)
      const headers = ['SKU', 'Zone', 'ItemName', 'ExpectedQuantity', 'PerCarQuantity', 'CarType', 'UpdatedBy', 'UpdatedAt'];
      const csvContent = [
        headers.join(','),
        ...allLookups.map(lookup => [
          lookup.sku,
          lookup.targetZone,
          `"${lookup.itemName || ''}"`, // Quote item names in case they have commas
          lookup.expectedQuantity || '',
          lookup.perCarQuantity || '',
          lookup.carType,
          lookup.updatedBy,
          lookup.updatedAt.toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `scanner-data-${selectedCarType}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Downloaded ${allLookups.length} scanner entries for ${selectedCarType} as CSV`);
    } catch (error) {
      console.error('Failed to download CSV:', error);
      alert('Failed to download scanner data');
    }
  };

  return (
    <div className="bg-white border-2 border-green-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">📱</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Scanner Dashboard</h3>
        <p className="text-sm text-gray-500 mb-4">
          Barcode scanning management and configuration
        </p>

        {/* Car Type Selector (v7.19.0) */}
        <div className="mb-4 bg-purple-50 border border-purple-300 rounded-lg p-3">
          <div className="text-sm font-medium text-purple-900 mb-2">🚗 Car Type</div>
          {carTypesLoading ? (
            <div className="text-xs text-purple-600">⏳ Loading car types...</div>
          ) : (
            <select
              value={selectedCarType}
              onChange={(e) => setSelectedCarType(e.target.value)}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              {availableCarTypes.map(carType => (
                <option key={carType.carCode} value={carType.carCode}>
                  {carType.name} ({carType.carCode})
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-purple-600 mt-2">
            All operations apply to this car type only
          </p>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div>✅ Available in v3.2.0 (v7.19.0: Multi-car support)</div>
          <div>🔍 Barcode/QR code scanning</div>
          <div>📍 SKU to zone lookup (car-type-specific)</div>
          <div>⚡ Real-time item identification</div>
          <div>🚗 Per-car quantity tracking</div>
        </div>
        
        {/* Scanner Status */}
        <div className="mt-4 space-y-2">
          {scannerStatus === 'idle' && (
            <div className="text-sm text-gray-500">Ready to initialize scanner data</div>
          )}
          {scannerStatus === 'initializing' && (
            <div className="text-sm text-blue-600">⏳ Setting up scanner lookup table...</div>
          )}
          {scannerStatus === 'ready' && (
            <div className="text-sm text-green-600">✅ Scanner ready! Test data loaded.</div>
          )}
          {scannerStatus === 'error' && (
            <div className="text-sm text-red-600">❌ Failed to initialize scanner</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleInitializeScanner}
            disabled={scannerStatus === 'initializing'}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              scannerStatus === 'ready' 
                ? 'bg-green-100 text-green-700 border border-green-300'
                : scannerStatus === 'error'
                ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {scannerStatus === 'initializing' && '⏳ Initializing...'}
            {scannerStatus === 'ready' && '✅ Scanner Ready'}
            {scannerStatus === 'error' && '🔄 Retry Setup'}
            {scannerStatus === 'idle' && '📱 Initialize Scanner'}
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCheckScannerData}
              className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              🔍 Check DB
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-green-100 text-green-700 border border-green-300 rounded-lg hover:bg-green-200 transition-colors text-sm"
            >
              💾 Download
            </button>
          </div>

          {/* CSV Upload */}
          <div className="border-t pt-2">
            {/* Replace Mode Toggle */}
            <div className="mb-2">
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className={replaceMode ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  🗑️ Replace all data (clears existing before upload)
                </span>
              </label>
            </div>

            <label className="block">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={isUploading}
                className="hidden"
              />
              <div className={`w-full px-4 py-2 rounded-lg border border-dashed transition-colors cursor-pointer text-center text-sm ${
                isUploading 
                  ? 'bg-blue-50 text-blue-600 border-blue-300'
                  : replaceMode
                  ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                  : 'bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100'
              }`}>
                {isUploading 
                  ? '⏳ Uploading CSV...' 
                  : replaceMode
                  ? '🗑️ Replace All Data'
                  : '📤 Add/Update Data'
                }
              </div>
            </label>
            
            {/* CSV Upload Result */}
            {uploadResult && (
              <div className={`mt-2 p-2 rounded text-xs ${
                uploadResult.success > 0 && uploadResult.errors.length === 0
                  ? 'bg-green-50 text-green-700'
                  : uploadResult.errors.length > 0
                  ? 'bg-yellow-50 text-yellow-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {uploadResult.success > 0 && (
                  <div>✅ Imported {uploadResult.success} entries</div>
                )}
                {uploadResult.errors.length > 0 && (
                  <div>⚠️ {uploadResult.errors.length} errors</div>
                )}
                
                {/* Show cleaning statistics if available */}
                {uploadResult.stats && (
                  <div className="mt-1 pt-1 border-t border-current/20">
                    <div className="text-xs opacity-75">
                      📊 Processed {uploadResult.stats.totalRows} rows
                      {uploadResult.stats.filledZones > 0 && (
                        <span>, 🔧 filled {uploadResult.stats.filledZones} empty zones</span>
                      )}
                      {uploadResult.stats.skippedRows > 0 && (
                        <span>, ⚠️ skipped {uploadResult.stats.skippedRows} invalid rows</span>
                      )}
                    </div>
                    {uploadResult.stats.filledZones > 0 && (
                      <div className="text-xs mt-1 font-medium">
                        🎯 Auto-fixed Excel merged cell zones!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});