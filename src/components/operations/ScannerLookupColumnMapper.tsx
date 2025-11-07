import { useState } from 'react';

export interface ScannerColumnPreview {
  columnIndex: number;
  headerName: string;
  sampleValues: string[];
}

export interface ScannerColumnMapping {
  sku: number;
  zone: number;
  itemName: number;
  expectedQuantity: number;
  perCarQuantity: number;
}

interface ScannerLookupColumnMapperProps {
  previews: ScannerColumnPreview[];
  onConfirm: (mapping: ScannerColumnMapping) => void;
  onCancel: () => void;
  mode?: 'scanner' | 'itemMaster'; // Add mode to support different use cases
}

type MappingType = 'sku' | 'zone' | 'itemName' | 'expectedQuantity' | 'perCarQuantity' | 'ignore';

export function ScannerLookupColumnMapper({
  previews,
  onConfirm,
  onCancel,
  mode = 'scanner'
}: ScannerLookupColumnMapperProps) {

  // Field labels based on mode
  const fieldLabels = mode === 'itemMaster' ? {
    sku: 'SKU / Part Number',
    zone: 'Category',
    itemName: 'Name / Description',
    expectedQuantity: 'Unit',
    perCarQuantity: 'Per Car Quantity'
  } : {
    sku: 'SKU / Part Number',
    zone: 'Target Zone',
    itemName: 'Item Name',
    expectedQuantity: 'Expected Quantity',
    perCarQuantity: 'Per Car Quantity'
  };
  // Initialize with auto-detected mappings
  const [columnMappings, setColumnMappings] = useState<Map<number, MappingType>>(() => {
    const initialMap = new Map<number, MappingType>();

    previews.forEach(preview => {
      const header = preview.headerName.toLowerCase();

      // Auto-detect based on header names
      if (header.includes('sku') || header.includes('part no') || header.includes('partno') || header === 'part_no') {
        initialMap.set(preview.columnIndex, 'sku');
      } else if (header.includes('zone') || header.includes('target') || header.includes('location')) {
        initialMap.set(preview.columnIndex, 'zone');
      } else if (header.includes('name') || header.includes('item') || header.includes('part name') || header === 'item_name') {
        initialMap.set(preview.columnIndex, 'itemName');
      } else if ((header.includes('quantity') || header.includes('qty') || header.includes('expected')) &&
                 !header.includes('per car') && !header.includes('percar')) {
        initialMap.set(preview.columnIndex, 'expectedQuantity');
      } else if (header.includes('per car') || header.includes('percar') || header.includes('per_car')) {
        initialMap.set(preview.columnIndex, 'perCarQuantity');
      } else {
        initialMap.set(preview.columnIndex, 'ignore');
      }
    });

    return initialMap;
  });

  const handleMappingChange = (columnIndex: number, newMapping: MappingType) => {
    setColumnMappings(prev => {
      const newMap = new Map(prev);

      // If mapping to a required field, clear any other column mapped to same field
      if (newMapping !== 'ignore') {
        newMap.forEach((value, key) => {
          if (value === newMapping && key !== columnIndex) {
            newMap.set(key, 'ignore');
          }
        });
      }

      newMap.set(columnIndex, newMapping);
      return newMap;
    });
  };

  const handleConfirm = () => {
    // Find columns for each required field
    let skuCol = -1;
    let zoneCol = -1;
    let itemNameCol = -1;
    let qtyCol = -1;
    let perCarQtyCol = -1;

    columnMappings.forEach((mapping, colIndex) => {
      if (mapping === 'sku') skuCol = colIndex;
      else if (mapping === 'zone') zoneCol = colIndex;
      else if (mapping === 'itemName') itemNameCol = colIndex;
      else if (mapping === 'expectedQuantity') qtyCol = colIndex;
      else if (mapping === 'perCarQuantity') perCarQtyCol = colIndex;
    });

    // Validate required fields based on mode
    if (skuCol === -1) {
      alert('❌ SKU column is required. Please map a column to SKU.');
      return;
    }

    if (mode === 'itemMaster') {
      if (itemNameCol === -1) {
        alert('❌ Name column is required for Item Master. Please map a column to Name.');
        return;
      }
    } else {
      if (zoneCol === -1) {
        alert('❌ Zone column is required for Scanner. Please map a column to Zone.');
        return;
      }
    }

    const finalMapping: ScannerColumnMapping = {
      sku: skuCol,
      zone: zoneCol,
      itemName: itemNameCol,
      expectedQuantity: qtyCol,
      perCarQuantity: perCarQtyCol
    };

    onConfirm(finalMapping);
  };

  // Check if required fields are mapped based on mode
  const hasSKU = Array.from(columnMappings.values()).includes('sku');
  const hasZone = Array.from(columnMappings.values()).includes('zone');
  const hasItemName = Array.from(columnMappings.values()).includes('itemName');
  const canConfirm = mode === 'itemMaster' ? (hasSKU && hasItemName) : (hasSKU && hasZone);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🗺️</span>
            <h3 className="text-xl font-bold text-gray-900">Map Scanner Lookup Columns</h3>
          </div>
          <p className="text-sm text-gray-600">
            Match your file's columns to the scanner lookup fields. <strong className="text-red-600">SKU</strong> and <strong className="text-red-600">Zone</strong> are required.
          </p>
        </div>

        {/* Column Mappings */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {previews.map((preview) => (
              <div key={preview.columnIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  {/* Column Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Column {preview.columnIndex + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {preview.headerName}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Samples: </span>
                      {preview.sampleValues.slice(0, 3).join(', ')}
                      {preview.sampleValues.length > 3 && '...'}
                    </div>
                  </div>

                  {/* Mapping Selector */}
                  <div className="w-48">
                    <select
                      value={columnMappings.get(preview.columnIndex) || 'ignore'}
                      onChange={(e) => handleMappingChange(preview.columnIndex, e.target.value as MappingType)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 ${
                        columnMappings.get(preview.columnIndex) === 'sku' || columnMappings.get(preview.columnIndex) === 'zone'
                          ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500'
                          : columnMappings.get(preview.columnIndex) === 'ignore'
                          ? 'border-gray-300 bg-white text-gray-700 focus:ring-blue-500'
                          : 'border-green-300 bg-green-50 text-green-700 focus:ring-green-500'
                      }`}
                    >
                      <option value="sku">{fieldLabels.sku} (Required)</option>
                      <option value="zone">{fieldLabels.zone} {mode === 'itemMaster' ? '(Optional)' : '(Required)'}</option>
                      <option value="itemName">{fieldLabels.itemName} {mode === 'itemMaster' ? '(Required)' : '(Optional)'}</option>
                      <option value="expectedQuantity">{fieldLabels.expectedQuantity} (Optional)</option>
                      {mode !== 'itemMaster' && <option value="perCarQuantity">{fieldLabels.perCarQuantity} (Optional)</option>}
                      <option value="ignore">❌ Ignore Column</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {/* Validation Status */}
          <div className="mb-4 text-sm">
            <div className="flex items-center gap-2">
              {hasSKU ? (
                <span className="text-green-600">✅ SKU mapped</span>
              ) : (
                <span className="text-red-600">❌ SKU required</span>
              )}
              {mode === 'itemMaster' ? (
                hasItemName ? (
                  <span className="text-green-600">✅ Name mapped</span>
                ) : (
                  <span className="text-red-600">❌ Name required</span>
                )
              ) : (
                hasZone ? (
                  <span className="text-green-600">✅ Zone mapped</span>
                ) : (
                  <span className="text-red-600">❌ Zone required</span>
                )
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {canConfirm ? 'Confirm & Import' : 'Map Required Fields First'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
