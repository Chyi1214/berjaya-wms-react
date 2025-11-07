// Item Master Tab - Manages the item catalog view and operations
import { useState } from 'react';
import { ItemMaster } from '../types';
import { itemMasterService } from '../services/itemMaster';
import { dataCleanupService } from '../services/dataCleanup';
import { ItemForm } from './ItemForm';
import * as XLSX from 'xlsx';
import { ScannerLookupColumnMapper, ScannerColumnPreview, ScannerColumnMapping } from './operations/ScannerLookupColumnMapper';

interface ItemMasterTabProps {
  items: ItemMaster[];
  onDataChange: () => void;
  onExport: () => void;
  onExportAll: () => void;
  onGenerateMockData: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  hasAnyData: boolean;
}

export function ItemMasterTab({
  items,
  onDataChange,
  onExport,
  onExportAll,
  onGenerateMockData,
  isLoading,
  setIsLoading,
  hasAnyData
}: ItemMasterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);

  // CSV Import state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Excel sheet selector state
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [xlsxSheetNames, setXlsxSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [pendingReplaceMode, setPendingReplaceMode] = useState(false);

  // Column mapping state
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [columnPreviews, setColumnPreviews] = useState<ScannerColumnPreview[]>([]);
  const [pendingCsvText, setPendingCsvText] = useState<string>('');
  const [pendingReplaceModeForMapper, setPendingReplaceModeForMapper] = useState(false);

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Item CRUD operations
  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: ItemMaster) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (sku: string) => {
    if (!confirm(`Delete item "${sku}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await itemMasterService.deleteItem(sku);
      await onDataChange();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleFormSave = async () => {
    setShowItemForm(false);
    setEditingItem(null);
    await onDataChange();
  };

  // One-time alignment: Fix inventory item names to match Item Master
  const handleAlignInventoryNames = async () => {
    if (!confirm('Align all inventory item names to match Item Master?')) return;
    setIsLoading(true);
    try {
      const result = await dataCleanupService.cleanupInventoryData();
      alert(`Alignment complete.\nItem names fixed: ${result.itemNamesFixed}\nBOM entries removed: ${result.bomsRemoved}`);
      await onDataChange();
    } catch (error) {
      console.error('Failed to align inventory names:', error);
      alert('Failed to align inventory names.');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert Excel worksheet to UTF-8 CSV (preserves Chinese characters)
  const sheetToUtf8Csv = (worksheet: XLSX.WorkSheet): string => {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as any[][];
    return jsonData.map((row: any[]) => {
      return row.map((cell: any) => {
        const cellStr = cell?.toString() || '';
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
  };

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

  // CSV Import functions
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>, replaceMode: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      // If Excel file, parse it and show sheet selector
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
          const csvText = sheetToUtf8Csv(worksheet); // UTF-8 safe conversion
          const previews = generateColumnPreviews(csvText);

          if (previews.length === 0) {
            alert('❌ Could not parse Excel file. Please check the file format.');
            event.target.value = '';
            return;
          }

          setPendingCsvText(csvText);
          setColumnPreviews(previews);
          setPendingReplaceModeForMapper(replaceMode);
          setShowColumnMapper(true);
        } else {
          // Multiple sheets - show selector
          setPendingWorkbook(workbook);
          setXlsxSheetNames(sheetNames);
          setSelectedSheet(sheetNames[0]); // Default to first sheet
          setPendingReplaceMode(replaceMode);
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
      setPendingReplaceModeForMapper(replaceMode);
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
      const csvText = sheetToUtf8Csv(worksheet); // UTF-8 safe conversion

      // Close sheet selector
      setShowSheetSelector(false);
      setPendingWorkbook(null);

      // Generate column previews and show mapper
      const previews = generateColumnPreviews(csvText);

      if (previews.length === 0) {
        alert('❌ Could not parse selected sheet.');
        return;
      }

      setPendingCsvText(csvText);
      setColumnPreviews(previews);
      setPendingReplaceModeForMapper(pendingReplaceMode);
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
      const replaceMode = pendingReplaceModeForMapper;
      console.log(`📥 Uploading Items file (Replace mode: ${replaceMode})`);

      const lines = pendingCsvText.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Use the user-confirmed mapping
      const skuIndex = mapping.sku;
      const nameIndex = mapping.itemName; // itemName maps to Name for Item Master
      const categoryIndex = mapping.zone >= 0 ? mapping.zone : -1; // zone maps to Category for Item Master
      const unitIndex = mapping.expectedQuantity >= 0 ? mapping.expectedQuantity : -1; // expectedQuantity maps to Unit for Item Master

      console.log(`📋 User-Confirmed Column Mapping:`);
      console.log(`   SKU: Column ${skuIndex + 1}`);
      console.log(`   Name: Column ${nameIndex + 1}`);
      console.log(`   Category: Column ${categoryIndex >= 0 ? categoryIndex + 1 : 'not mapped'}`);
      console.log(`   Unit: Column ${unitIndex >= 0 ? unitIndex + 1 : 'not mapped'}`);

      // Parse data rows
      const itemsToImport: Omit<ItemMaster, 'createdAt' | 'updatedAt'>[] = [];
      let skippedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim().replace(/['"]/g, ''));
        
        const sku = (parts[skuIndex] || '').trim();
        const name = (parts[nameIndex] || '').trim();
        const category = categoryIndex >= 0 ? (parts[categoryIndex] || '').trim() : undefined;
        const unit = unitIndex >= 0 ? (parts[unitIndex] || '').trim() : undefined;
        
        // Clean up empty strings
        const cleanSku = sku || undefined;
        const cleanName = name || undefined;
        const cleanCategory = category && category !== '' ? category : undefined;
        const cleanUnit = unit && unit !== '' ? unit : undefined;

        // Debug first few rows
        if (i <= 3) {
          console.log(`🔍 Row ${i + 1} debug:`, {
            parts,
            skuIndex,
            nameIndex,
            cleanSku,
            cleanName,
            cleanCategory,
            cleanUnit
          });
        }

        // Skip invalid rows
        if (!cleanSku || !cleanName) {
          console.warn(`Row ${i + 1}: Skipping invalid item - missing SKU or Name (sku: "${cleanSku}", name: "${cleanName}")`);
          skippedRows++;
          continue;
        }

        itemsToImport.push({
          sku: cleanSku.toUpperCase(),
          name: cleanName,
          ...(cleanCategory && { category: cleanCategory }),
          ...(cleanUnit && { unit: cleanUnit })
        });
      }

      console.log(`📊 Items CSV Summary:`);
      console.log(`   📥 Total rows processed: ${lines.length - 1}`);
      console.log(`   ✅ Valid items: ${itemsToImport.length}`);
      console.log(`   ⚠️ Rows skipped: ${skippedRows}`);

      if (itemsToImport.length === 0) {
        throw new Error('No valid items found in CSV file');
      }

      // Import items
      const result = await itemMasterService.bulkImportItems(
        itemsToImport, 
        replaceMode ? 'replace' : 'update'
      );
      
      setUploadResult(result);
      console.log('✅ Items CSV import completed:', result);
      
      // Refresh data
      console.log('🔄 Refreshing Item Master data after import...');
      await onDataChange();
      console.log('✅ Item Master data refresh completed.');

    } catch (error) {
      console.error('Items CSV upload failed:', error);
      setUploadResult({ 
        success: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = [
      'SKU,Name,Category,Unit',
      'A001,Engine Part A,Engine,PCS',
      'B001,Body Panel B,Body,PCS', 
      'E001,Electronic Module,Electronics,PCS',
      'F001,Frame Component,Frame,KG'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'items-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Downloaded items CSV template');
  };

  return (
    <>
      {/* Action Bar */}
      <div className="flex flex-col space-y-4 mb-6">
        {/* Search and Quick Stats */}
        <div className="flex justify-between items-center">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Quick Stats */}
          <div className="text-sm text-gray-500 mr-4">
            <span>
              {items.length} items total
              {items.length > 0 && (
                <span className="ml-2">
                  • {new Set(items.map(i => i.category)).size} categories
                </span>
              )}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Data Actions */}
          <div className="flex items-center space-x-2">
            {!hasAnyData && (
              <button
                onClick={onGenerateMockData}
                disabled={isLoading}
                className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                🎲 Generate Test Data
              </button>
            )}
            
            {filteredItems.length > 0 && (
              <button
                onClick={onExport}
                disabled={isLoading}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                📥 Export Items
              </button>
            )}
            
            {hasAnyData && (
              <button
                onClick={onExportAll}
                disabled={isLoading}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                📥 Export All
              </button>
            )}

            {/* Align Inventory Names Button */}
            <button
              onClick={handleAlignInventoryNames}
              disabled={isLoading}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50"
              title="Update all inventory item names to match Item Master"
            >
              🛠 Align Inventory Names
            </button>

            {/* CSV Import Buttons */}
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              📄 Template
            </button>

            <div className="flex items-center space-x-1">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleCSVUpload(e, false)}
                disabled={isUploading}
                className="hidden"
                id="csv-upload-update"
              />
              <label
                htmlFor="csv-upload-update"
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm cursor-pointer disabled:opacity-50"
              >
                {isUploading ? '⏳ Uploading...' : '📤 Import (Update)'}
              </label>

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleCSVUpload(e, true)}
                disabled={isUploading}
                className="hidden"
                id="csv-upload-replace"
              />
              <label
                htmlFor="csv-upload-replace"
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm cursor-pointer disabled:opacity-50"
              >
                {isUploading ? '⏳ Uploading...' : '📤 Import (Replace)'}
              </label>
            </div>
          </div>
          
          {/* Spacer */}
          <div className="flex-1"></div>
          
          {/* Primary Action */}
          <button
            onClick={handleAddItem}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-white font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
          >
            ➕ Add Item
          </button>
        </div>
      </div>

      {/* Upload Result Display */}
      {uploadResult && (
        <div className={`mb-6 p-4 rounded-lg border ${
          uploadResult.success > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            <div className="text-2xl">
              {uploadResult.success > 0 ? '✅' : '❌'}
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${
                uploadResult.success > 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                Items CSV Import Result
              </h4>
              <div className="mt-2 space-y-1 text-sm">
                {uploadResult.success > 0 && (
                  <p className="text-green-700">
                    ✅ Successfully imported {uploadResult.success} items
                  </p>
                )}
                
                {uploadResult.stats && (
                  <div className="text-gray-600">
                    <p>📊 Total rows: {uploadResult.stats.totalRows}</p>
                    {uploadResult.stats.created > 0 && (
                      <p>➕ New items created: {uploadResult.stats.created}</p>
                    )}
                    {uploadResult.stats.updated > 0 && (
                      <p>🔄 Items updated: {uploadResult.stats.updated}</p>
                    )}
                    {uploadResult.stats.skippedRows > 0 && (
                      <p>⚠️ Rows skipped: {uploadResult.stats.skippedRows}</p>
                    )}
                  </div>
                )}
                
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="text-red-700">
                    <p className="font-medium">Errors:</p>
                    <ul className="mt-1 space-y-1">
                      {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {uploadResult.errors.length > 5 && (
                        <li>• ... and {uploadResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setUploadResult(null)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-6">📦</div>
          {items.length === 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in your catalog yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first item or importing existing data</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  ➕ Add First Item
                </button>
                <button
                  onClick={onGenerateMockData}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                >
                  🎲 Load Sample Data
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items match your search</h3>
              <p className="text-gray-500">Try adjusting your search terms or browse all items</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.sku}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{item.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.category || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.unit || '-'}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.sku)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <ItemForm
          item={editingItem}
          onClose={handleFormClose}
          onSave={handleFormSave}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}

      {/* Excel Sheet Selector Modal */}
      {showSheetSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h3 className="text-xl font-bold text-gray-900">Select Excel Sheet</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This Excel file contains multiple sheets. Please select which sheet contains the item master data:
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
          mode="itemMaster"
        />
      )}
    </>
  );
}
