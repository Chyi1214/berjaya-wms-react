// Item Master Tab - Manages the item catalog view and operations
import { useState } from 'react';
import { ItemMaster } from '../types';
import { itemMasterService } from '../services/itemMaster';
import { ItemForm } from './ItemForm';

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

  // CSV Import functions
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>, replaceMode: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      console.log(`📥 Uploading Items CSV file: ${file.name} (Replace mode: ${replaceMode})`);
      
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse CSV headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
      console.log('📊 CSV Headers:', headers);
      console.log('📊 First few lines of CSV:', lines.slice(0, 5));
      
      // Find column indices
      const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'));
      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'));
      const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
      const unitIndex = headers.findIndex(h => h.toLowerCase().includes('unit'));

      if (skuIndex === -1 || nameIndex === -1) {
        throw new Error('CSV must contain SKU and Name columns');
      }

      // Parse data rows
      const itemsToImport: Omit<ItemMaster, 'createdAt' | 'updatedAt'>[] = [];
      let skippedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim().replace(/['"]/g, ''));
        
        const sku = parts[skuIndex]?.trim();
        const name = parts[nameIndex]?.trim();
        const category = categoryIndex >= 0 ? parts[categoryIndex]?.trim() : undefined;
        const unit = unitIndex >= 0 ? parts[unitIndex]?.trim() : undefined;

        // Debug first few rows
        if (i <= 3) {
          console.log(`🔍 Row ${i + 1} debug:`, {
            parts,
            skuIndex,
            nameIndex,
            sku,
            name,
            category,
            unit
          });
        }

        // Skip invalid rows
        if (!sku || !name) {
          console.warn(`Row ${i + 1}: Skipping invalid item - missing SKU or Name (sku: "${sku}", name: "${name}")`);
          skippedRows++;
          continue;
        }

        itemsToImport.push({
          sku: sku.toUpperCase(),
          name,
          ...(category && { category }),
          ...(unit && { unit })
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
      event.target.value = '';
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
                accept=".csv"
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
                accept=".csv"
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
    </>
  );
}