import { useState, useEffect } from 'react';
import { scanLookupService } from '../../services/scanLookupService';
import { batchManagementService } from '../../services/batchManagement';
import { ScannerInventoryTable } from './ScannerInventoryTable';
import { AddScannerEntryForm } from './AddScannerEntryForm';
import * as XLSX from 'xlsx';
import { ScannerLookupColumnMapper, ScannerColumnPreview, ScannerColumnMapping } from '../operations/ScannerLookupColumnMapper';

interface UploadResult {
  success: number;
  errors: string[];
  stats?: {
    totalRows: number;
    skippedRows: number;
    filledZones: number;
  };
}

interface UnifiedScannerInventoryProps {
  userEmail: string;
}

export function UnifiedScannerInventory({ userEmail }: UnifiedScannerInventoryProps) {
  const [availableCarTypes, setAvailableCarTypes] = useState<Array<{carCode: string; name: string}>>([]);
  const [selectedCarType, setSelectedCarType] = useState<string>('TK1');
  const [carTypesLoading, setCarTypesLoading] = useState(false);
  const [lookupCount, setLookupCount] = useState(0);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  // Excel sheet selector state
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [xlsxSheetNames, setXlsxSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Column mapping state
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnPreviews, setColumnPreviews] = useState<ScannerColumnPreview[]>([]);
  const [pendingCsvText, setPendingCsvText] = useState<string>('');

  // Refresh key to trigger table reloads
  const [refreshKey, setRefreshKey] = useState(0);

  // Load car types on mount
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

  // Load lookup count when car type changes
  useEffect(() => {
    if (selectedCarType) {
      loadLookupCount();
    }
  }, [selectedCarType, refreshKey]);

  const loadLookupCount = async () => {
    try {
      const lookups = await scanLookupService.getAllLookups(selectedCarType);
      setLookupCount(lookups.length);
    } catch (error) {
      console.error('Failed to load lookup count:', error);
    }
  };

  // Handle CSV file upload
  // Generate column previews from CSV text
  const generateColumnPreviews = (csvText: string): ScannerColumnPreview[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
    const previews: ScannerColumnPreview[] = [];

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      const samples: string[] = [];
      for (let rowIndex = 1; rowIndex < Math.min(6, lines.length); rowIndex++) {
        const parts = lines[rowIndex].split(',').map(p => p.trim().replace(/^"(.*)"$/, '$1'));
        if (parts[colIndex]) {
          samples.push(parts[colIndex]);
        }
      }

      previews.push({
        columnIndex: colIndex,
        headerName: headers[colIndex] || `Column ${colIndex + 1}`,
        sampleValues: samples
      });
    }

    return previews;
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      // If Excel file, parse it and show sheet selector
      if (isXlsx) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

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
          const previews = generateColumnPreviews(csvText);

          if (previews.length === 0) {
            alert('❌ Could not parse Excel file. Please check the file format.');
            event.target.value = '';
            return;
          }

          setPendingCsvText(csvText);
          setColumnPreviews(previews);
          setShowColumnMapper(true);
        } else {
          // Multiple sheets - show selector
          setPendingWorkbook(workbook);
          setXlsxSheetNames(sheetNames);
          setSelectedSheet(sheetNames[0]);
          setShowSheetSelector(true);
        }
        event.target.value = '';
        return;
      }

      // Handle regular CSV file - show column mapper
      const text = await file.text();
      const previews = generateColumnPreviews(text);

      if (previews.length === 0) {
        alert('❌ Could not parse CSV file. Please check the file format.');
        event.target.value = '';
        return;
      }

      setPendingCsvText(text);
      setColumnPreviews(previews);
      setShowColumnMapper(true);
      event.target.value = '';

    } catch (error) {
      console.error('File upload failed:', error);
      alert(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      event.target.value = '';
    }
  };

  // Handle sheet selection confirmation
  const handleSheetSelect = async () => {
    if (!pendingWorkbook || !selectedSheet) return;

    try {
      const worksheet = pendingWorkbook.Sheets[selectedSheet];
      const csvText = XLSX.utils.sheet_to_csv(worksheet);

      setShowSheetSelector(false);
      setPendingWorkbook(null);

      const previews = generateColumnPreviews(csvText);

      if (previews.length === 0) {
        alert('❌ Could not parse selected sheet.');
        return;
      }

      setPendingCsvText(csvText);
      setColumnPreviews(previews);
      setShowColumnMapper(true);
    } catch (error) {
      console.error('Sheet processing failed:', error);
      alert('❌ Failed to process selected sheet.');
    }
  };

  // Handle column mapping cancellation
  const handleColumnMappingCancel = () => {
    setShowColumnMapper(false);
    setPendingCsvText('');
    setColumnPreviews([]);
  };

  // Handle column mapping confirmation and process the file
  const handleColumnMappingConfirm = async (mapping: ScannerColumnMapping) => {
    setIsUploading(true);
    setUploadResult(null);
    setShowColumnMapper(false);

    try {
      const lines = pendingCsvText.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('File must have at least a header row and one data row');
      }

      // Use the user-confirmed mapping
      const skuIndex = mapping.sku;
      const zoneIndex = mapping.zone;
      const nameIndex = mapping.itemName;
      const qtyIndex = mapping.expectedQuantity;
      const perCarQtyIndex = mapping.perCarQuantity;

      console.log(`📋 User-Confirmed Column Mapping:`);
      console.log(`   SKU: Column ${skuIndex + 1}`);
      console.log(`   Zone: Column ${zoneIndex + 1}`);
      console.log(`   ItemName: Column ${nameIndex >= 0 ? nameIndex + 1 : 'not mapped'}`);
      console.log(`   Quantity: Column ${qtyIndex >= 0 ? qtyIndex + 1 : 'not mapped'}`);
      console.log(`   PerCarQty: Column ${perCarQtyIndex >= 0 ? perCarQtyIndex + 1 : 'not mapped'}`);

      const lookups = [];
      let currentZone = ''; // Track current zone for merged cell handling
      let skippedRows = 0;
      let filledZones = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"(.*)"$/, '$1'));

        if (parts.length < Math.max(skuIndex + 1, zoneIndex + 1)) {
          skippedRows++;
          continue;
        }

        let sku = parts[skuIndex]?.trim();
        let targetZone = parts[zoneIndex]?.trim();
        const itemName = nameIndex >= 0 ? (parts[nameIndex] || '') : '';
        const expectedQuantity = qtyIndex >= 0 && parts[qtyIndex] && parts[qtyIndex].trim() ? parseInt(parts[qtyIndex]) : null;
        const perCarQuantity = perCarQtyIndex >= 0 && parts[perCarQtyIndex] && parts[perCarQtyIndex].trim() ? parseInt(parts[perCarQtyIndex]) : null;

        // IMPORTANT: Update currentZone BEFORE checking SKU validity
        // This ensures we capture the zone even if the first row has invalid SKU (like "/" for process steps)
        if (targetZone) {
          currentZone = targetZone;
        }

        // Handle merged cell zones
        if (!targetZone && currentZone) {
          targetZone = currentZone;
          filledZones++;
        }

        // Skip invalid SKU entries (NOW HAPPENS AFTER ZONE CAPTURE)
        if (!sku || sku === '/' || sku.startsWith('//') || sku.length === 0) {
          skippedRows++;
          continue;
        }

        if (!targetZone) {
          skippedRows++;
          continue;
        }

        sku = sku.toUpperCase();

        if (!/^[A-Za-z0-9\-_ ]+$/.test(targetZone)) {
          skippedRows++;
          continue;
        }

        if (expectedQuantity !== null && (isNaN(expectedQuantity) || expectedQuantity < 0)) {
          skippedRows++;
          continue;
        }

        // Skip exact duplicates within this CSV file
        const duplicateIndex = lookups.findIndex(lookup =>
          lookup.sku === sku &&
          lookup.targetZone === targetZone &&
          lookup.itemName === itemName &&
          lookup.expectedQuantity === expectedQuantity
        );

        if (duplicateIndex >= 0) {
          skippedRows++;
          continue;
        }

        const lookupData: any = {
          sku,
          targetZone,
          itemName,
          updatedBy: userEmail
        };

        if (expectedQuantity !== null) {
          lookupData.expectedQuantity = expectedQuantity;
        }

        if (perCarQuantity !== null && !isNaN(perCarQuantity) && perCarQuantity > 0) {
          lookupData.perCarQuantity = perCarQuantity;
        }

        lookups.push(lookupData);
      }

      console.log(`📊 CSV Cleaning Summary:`);
      console.log(`   📥 Total rows processed: ${lines.length - 1}`);
      console.log(`   ✅ Valid entries: ${lookups.length}`);
      console.log(`   🔧 Zones filled from merged cells: ${filledZones}`);
      console.log(`   ⚠️ Rows skipped: ${skippedRows}`);

      if (lookups.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      console.log(`📥 Importing ${lookups.length} scanner lookups for car type ${selectedCarType}... (Replace mode: ${replaceMode})`);

      let result;
      if (replaceMode) {
        // Replace mode: clear all existing data for this car type first (optimized with batch deletes)
        await scanLookupService.clearLookupsForCarType(selectedCarType);
        result = await scanLookupService.bulkImport(lookups, selectedCarType, userEmail);
        console.log('✅ CSV replace completed:', result);
      } else {
        // Update mode: add/update only
        result = await scanLookupService.bulkImport(lookups, selectedCarType, userEmail);
        console.log('✅ CSV update completed:', result);
      }

      const resultWithStats: UploadResult = {
        ...result,
        stats: {
          totalRows: lines.length - 1,
          skippedRows,
          filledZones
        }
      };

      setUploadResult(resultWithStats);

      // Refresh the table
      setRefreshKey(prev => prev + 1);

    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadResult({ success: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] });
    } finally {
      setIsUploading(false);
    }
  };

  // Download current scanner data as CSV
  const handleDownloadCSV = async () => {
    try {
      console.log(`📥 Downloading scanner data for car type ${selectedCarType}...`);
      const allLookups = await scanLookupService.getAllLookups(selectedCarType);

      if (allLookups.length === 0) {
        alert(`No scanner data to download for car type ${selectedCarType}`);
        return;
      }

      const headers = ['SKU', 'Zone', 'ItemName', 'ExpectedQuantity', 'PerCarQuantity', 'CarType', 'UpdatedBy', 'UpdatedAt'];
      const csvContent = [
        headers.join(','),
        ...allLookups.map(lookup => [
          lookup.sku,
          lookup.targetZone,
          `"${lookup.itemName || ''}"`,
          lookup.expectedQuantity || '',
          lookup.perCarQuantity || '',
          lookup.carType,
          lookup.updatedBy,
          lookup.updatedAt.toLocaleDateString()
        ].join(','))
      ].join('\n');

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

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Car Type Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Car Type</label>
        {carTypesLoading ? (
          <div className="text-xs text-gray-600">Loading car types...</div>
        ) : (
          <select
            value={selectedCarType}
            onChange={(e) => setSelectedCarType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableCarTypes.map(carType => (
              <option key={carType.carCode} value={carType.carCode}>
                {carType.name} ({carType.carCode})
              </option>
            ))}
          </select>
        )}
        <p className="text-xs text-gray-500 mt-2">
          All operations apply to this car type only
        </p>
      </div>

      {/* Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{lookupCount}</div>
          <div className="text-sm text-gray-600">Total Entries for {selectedCarType}</div>
        </div>
      </div>

      {/* Bulk Operations */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Bulk Operations</h4>

        {/* Replace Mode Toggle */}
        <div className="mb-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={replaceMode}
              onChange={(e) => setReplaceMode(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className={`text-sm ${replaceMode ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              Replace all data (clears existing before upload)
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadCSV}
            className="px-4 py-2 bg-green-100 text-green-700 border border-green-300 rounded-lg hover:bg-green-200 transition-colors"
          >
            Download CSV
          </button>

          <label className="block">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCSVUpload}
              disabled={isUploading}
              className="hidden"
            />
            <div className={`w-full px-4 py-2 rounded-lg border transition-colors cursor-pointer text-center ${
              isUploading
                ? 'bg-blue-50 text-blue-600 border-blue-300'
                : replaceMode
                ? 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200'
                : 'bg-purple-100 text-purple-600 border-purple-300 hover:bg-purple-200'
            }`}>
              {isUploading
                ? 'Uploading...'
                : replaceMode
                ? 'Replace All Data'
                : 'Upload CSV (v2 Fixed)'
              }
            </div>
          </label>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className={`mt-3 p-3 rounded text-sm ${
            uploadResult.success > 0 && uploadResult.errors.length === 0
              ? 'bg-green-50 text-green-700 border border-green-200'
              : uploadResult.errors.length > 0
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {uploadResult.success > 0 && (
              <div>Imported {uploadResult.success} entries</div>
            )}
            {uploadResult.errors.length > 0 && (
              <div>{uploadResult.errors.length} errors</div>
            )}

            {uploadResult.stats && (
              <div className="mt-2 pt-2 border-t border-current/20 text-xs">
                <div>
                  Processed {uploadResult.stats.totalRows} rows
                  {uploadResult.stats.filledZones > 0 && (
                    <span>, filled {uploadResult.stats.filledZones} empty zones</span>
                  )}
                  {uploadResult.stats.skippedRows > 0 && (
                    <span>, skipped {uploadResult.stats.skippedRows} invalid rows</span>
                  )}
                </div>
                {uploadResult.stats.filledZones > 0 && (
                  <div className="mt-1 font-medium">
                    Auto-fixed Excel merged cell zones!
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add New Entry */}
      <AddScannerEntryForm
        carType={selectedCarType}
        userEmail={userEmail}
        onAdd={handleRefresh}
      />

      {/* Data Table */}
      <ScannerInventoryTable
        key={`${selectedCarType}-${refreshKey}`}
        carType={selectedCarType}
        hideCarTypeSelector={true}
        onRefresh={handleRefresh}
        userEmail={userEmail}
      />

      {/* Excel Sheet Selector Modal */}
      {showSheetSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h3 className="text-xl font-bold text-gray-900">Select Excel Sheet</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This Excel file contains multiple sheets. Please select which sheet contains the scanner lookup data:
            </p>
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

      {/* Column Mapper Modal */}
      {showColumnMapper && (
        <ScannerLookupColumnMapper
          previews={columnPreviews}
          onConfirm={handleColumnMappingConfirm}
          onCancel={handleColumnMappingCancel}
        />
      )}
    </div>
  );
}
