import { useState } from 'react';
import { ColumnPreview, ColumnMapping } from '../../services/packingBoxesService';

interface PackingListColumnMapperProps {
  previews: ColumnPreview[];
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

type MappingType = 'caseNo' | 'partNo' | 'qty' | 'ignore';

export function PackingListColumnMapper({
  previews,
  onConfirm,
  onCancel
}: PackingListColumnMapperProps) {
  // Initialize with suggested mappings
  const [columnMappings, setColumnMappings] = useState<Map<number, MappingType>>(
    new Map(previews.map(p => [p.columnIndex, p.suggestedMapping]))
  );

  const handleMappingChange = (columnIndex: number, mapping: MappingType) => {
    // If user selects a required field that's already assigned elsewhere, swap them
    if (mapping !== 'ignore') {
      const existingColumnWithSameMapping = Array.from(columnMappings.entries()).find(
        ([idx, map]) => idx !== columnIndex && map === mapping
      );

      if (existingColumnWithSameMapping) {
        const newMappings = new Map(columnMappings);
        newMappings.set(existingColumnWithSameMapping[0], 'ignore');
        newMappings.set(columnIndex, mapping);
        setColumnMappings(newMappings);
        return;
      }
    }

    setColumnMappings(new Map(columnMappings.set(columnIndex, mapping)));
  };

  const handleConfirm = () => {
    // Validate that all required fields are mapped
    const caseNoCol = Array.from(columnMappings.entries()).find(([_, m]) => m === 'caseNo');
    const partNoCol = Array.from(columnMappings.entries()).find(([_, m]) => m === 'partNo');
    const qtyCol = Array.from(columnMappings.entries()).find(([_, m]) => m === 'qty');

    if (!caseNoCol || !partNoCol || !qtyCol) {
      alert('⚠️ Please map all required fields:\n• CASE NO\n• PART NO\n• QTY');
      return;
    }

    const mapping: ColumnMapping = {
      caseNoIndex: caseNoCol[0],
      partNoIndex: partNoCol[0],
      qtyIndex: qtyCol[0]
    };

    onConfirm(mapping);
  };

  const getMappingColor = (mapping: MappingType): string => {
    switch (mapping) {
      case 'caseNo': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'partNo': return 'bg-green-100 text-green-800 border-green-300';
      case 'qty': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Check if all required mappings are set
  const isValid = Array.from(columnMappings.values()).filter(m => m === 'caseNo').length === 1 &&
                  Array.from(columnMappings.values()).filter(m => m === 'partNo').length === 1 &&
                  Array.from(columnMappings.values()).filter(m => m === 'qty').length === 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">🗺️ Map CSV Columns</h2>
          <p className="text-sm text-gray-600 mt-1">
            Match each column to the correct field. The system has auto-suggested mappings based on column headers.
          </p>
        </div>

        {/* Column Preview Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {previews.map((preview) => {
              const currentMapping = columnMappings.get(preview.columnIndex) || 'ignore';

              return (
                <div
                  key={preview.columnIndex}
                  className={`border-2 rounded-lg p-4 ${getMappingColor(currentMapping)}`}
                >
                  {/* Column Header */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Column {preview.columnIndex + 1}</div>
                    <div className="font-medium text-gray-900 truncate" title={preview.header}>
                      {preview.header || '(Empty)'}
                    </div>
                  </div>

                  {/* Sample Data */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Sample Data:</div>
                    <div className="space-y-1">
                      {preview.sampleData.length > 0 ? (
                        preview.sampleData.map((sample, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded truncate"
                            title={sample}
                          >
                            {sample}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400 italic">No data</div>
                      )}
                    </div>
                  </div>

                  {/* Mapping Selector */}
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Map to:</label>
                    <select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(preview.columnIndex, e.target.value as MappingType)}
                      className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ignore">🚫 Ignore</option>
                      <option value="caseNo">📦 CASE NO</option>
                      <option value="partNo">🔧 PART NO</option>
                      <option value="qty">🔢 QTY</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="p-6 border-t bg-gray-50">
          {/* Validation Status */}
          <div className="mb-4">
            {isValid ? (
              <div className="text-sm text-green-600 flex items-center gap-2">
                <span>✅</span>
                <span>All required fields are mapped. Ready to import!</span>
              </div>
            ) : (
              <div className="text-sm text-orange-600 flex items-center gap-2">
                <span>⚠️</span>
                <span>Please ensure CASE NO, PART NO, and QTY are each mapped to exactly one column.</span>
              </div>
            )}
          </div>

          {/* Mapping Summary */}
          <div className="mb-4 p-3 bg-white rounded border">
            <div className="text-xs font-medium text-gray-700 mb-2">Current Mapping:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-600">CASE NO:</span>
                <span className="ml-2 font-medium">
                  {previews.find(p => columnMappings.get(p.columnIndex) === 'caseNo')?.header || 'Not mapped'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">PART NO:</span>
                <span className="ml-2 font-medium">
                  {previews.find(p => columnMappings.get(p.columnIndex) === 'partNo')?.header || 'Not mapped'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">QTY:</span>
                <span className="ml-2 font-medium">
                  {previews.find(p => columnMappings.get(p.columnIndex) === 'qty')?.header || 'Not mapped'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                isValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isValid ? '✅ Confirm & Import' : '⚠️ Map Required Fields'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
