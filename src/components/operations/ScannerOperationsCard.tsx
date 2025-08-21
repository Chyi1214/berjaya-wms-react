import React, { memo } from 'react';
import { scanLookupService } from '../../services/scanLookupService';

interface ScannerOperationsCardProps {
  user: { email: string } | null;
  scannerStatus: 'idle' | 'initializing' | 'ready' | 'error';
  setScannerStatus: (status: 'idle' | 'initializing' | 'ready' | 'error') => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  uploadResult: { success: number; errors: string[] } | null;
  setUploadResult: (result: { success: number; errors: string[] } | null) => void;
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

  // Check what data exists in scanner lookup table
  const handleCheckScannerData = async () => {
    try {
      console.log('🔍 Checking scanner data...');
      const allLookups = await scanLookupService.getAllLookups();
      console.log(`📊 Found ${allLookups.length} scanner entries:`, allLookups);
      
      // Test a specific lookup
      const testResult = await scanLookupService.getLookupBySKU('A001');
      console.log('🎯 A001 lookup result:', testResult);
      
      alert(`Scanner database has ${allLookups.length} entries. Check console for details.`);
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

      // Parse CSV - expect format: SKU,Zone,ItemName,ExpectedQuantity
      const header = lines[0].toLowerCase();
      if (!header.includes('sku') || !header.includes('zone')) {
        throw new Error('CSV must have SKU and Zone columns. Expected format: SKU,Zone,ItemName,ExpectedQuantity');
      }

      const lookups = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"(.*)"$/, '$1')); // Remove quotes
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const sku = parts[0].toUpperCase();
          const targetZone = parts[1].trim(); // Keep as string to support alphanumeric zones
          const itemName = parts[2] || '';
          const expectedQuantity = parts[3] && parts[3].trim() ? parseInt(parts[3]) : null;

          // Validate zone format - allow alphanumeric, dashes, underscores
          if (!targetZone || !/^[A-Za-z0-9\-_]+$/.test(targetZone)) {
            console.warn(`Skipping invalid zone format "${parts[1]}" for SKU ${sku}`);
            continue;
          }

          if (expectedQuantity !== null && (isNaN(expectedQuantity) || expectedQuantity < 0)) {
            console.warn(`Skipping invalid quantity ${parts[3]} for SKU ${sku}`);
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

          lookups.push(lookupData);
        }
      }

      if (lookups.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      console.log(`📥 Importing ${lookups.length} scanner lookups... (Replace mode: ${replaceMode})`);
      
      let result;
      if (replaceMode) {
        // Replace mode: clear all existing data first
        console.log('🗑️ Replace mode: clearing all existing data...');
        await scanLookupService.clearAllLookups();
        result = await scanLookupService.bulkImport(lookups, user.email);
        console.log('✅ CSV replace completed:', result);
      } else {
        // Update mode: add/update only
        result = await scanLookupService.bulkImport(lookups, user.email);
        console.log('✅ CSV update completed:', result);
      }
      
      setUploadResult(result);

    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadResult({ success: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] });
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Download current scanner data as CSV
  const handleDownloadCSV = async () => {
    try {
      console.log('📥 Downloading scanner data...');
      const allLookups = await scanLookupService.getAllLookups();
      
      if (allLookups.length === 0) {
        alert('No scanner data to download');
        return;
      }

      // Create CSV content with headers
      const headers = ['SKU', 'Zone', 'ItemName', 'ExpectedQuantity', 'UpdatedBy', 'UpdatedAt'];
      const csvContent = [
        headers.join(','),
        ...allLookups.map(lookup => [
          lookup.sku,
          lookup.targetZone,
          `"${lookup.itemName || ''}"`, // Quote item names in case they have commas
          lookup.expectedQuantity || '',
          lookup.updatedBy,
          lookup.updatedAt.toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `scanner-data-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Downloaded ${allLookups.length} scanner entries as CSV`);
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
        <div className="space-y-2 text-xs text-gray-600">
          <div>✅ Available in v3.2.0</div>
          <div>🔍 Barcode/QR code scanning</div>
          <div>📍 SKU to zone lookup</div>
          <div>⚡ Real-time item identification</div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});