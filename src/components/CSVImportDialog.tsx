// CSV Import Dialog - File upload and data preview component
import React, { useState, useRef } from 'react';
import { InventoryCountEntry } from '../types';
import { csvImportService, CSVParseResult } from '../services/csvImport';

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: InventoryCountEntry[], importType: 'checked' | 'expected' | 'yesterday') => Promise<void>;
}

export function CSVImportDialog({ isOpen, onClose, onImport }: CSVImportDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult<InventoryCountEntry> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importType, setImportType] = useState<'checked' | 'expected' | 'yesterday'>('checked');
  const [previewData, setPreviewData] = useState<InventoryCountEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setParseResult(null);
      setPreviewData([]);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const validation = csvImportService.validateFile(file);
    if (!validation.valid) {
      alert(`File validation failed:\n${validation.errors.join('\n')}`);
      return;
    }

    setSelectedFile(file);
    setParseResult(null);
    setPreviewData([]);
  };

  // Parse selected file
  const handleParseFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const content = await csvImportService.readFileContent(selectedFile);
      const result = csvImportService.parseInventoryCSV(content, {
        skipFirstRow: true,
        validateData: true,
        allowPartialImport: true
      });

      setParseResult(result);
      setPreviewData(result.data.slice(0, 10)); // Show first 10 rows as preview

      if (!result.success && result.errors.length > 0) {
        console.warn('CSV parsing warnings:', result.errors);
      }
    } catch (error) {
      alert(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle import confirmation
  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.data.length === 0) return;

    setIsProcessing(true);
    try {
      await onImport(parseResult.data, importType);
      
      // Show success message
      alert(`✅ Successfully imported ${parseResult.validRows} items to ${importType} table!`);
      
      // Close dialog
      onClose();
    } catch (error) {
      alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  // File input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📤 Import CSV Data</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: File Upload */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Select CSV File</h3>
            
            {/* Download Template */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-900 font-medium">Need a template?</p>
                  <p className="text-blue-700 text-sm">Download a sample CSV file with the correct format</p>
                </div>
                <button
                  onClick={() => csvImportService.downloadTemplate()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                >
                  📥 Download Template
                </button>
              </div>
            </div>

            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="text-green-600">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-green-700">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div className="text-gray-500">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="font-medium mb-2">Drop CSV file here or click to browse</p>
                  <p className="text-sm">Supports .csv files up to 5MB</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                  >
                    Browse Files
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Step 2: Parse & Preview */}
          {selectedFile && !parseResult && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Parse File</h3>
              <button
                onClick={handleParseFile}
                disabled={isProcessing}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded"
              >
                {isProcessing ? '⏳ Parsing...' : '🔍 Parse & Preview'}
              </button>
            </div>
          )}

          {/* Step 3: Review Results */}
          {parseResult && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Step 3: Review Results</h3>
              
              {/* Parse Summary */}
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-600 text-sm font-medium">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-900">{parseResult.totalRows}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-600 text-sm font-medium">Valid Rows</p>
                  <p className="text-2xl font-bold text-green-900">{parseResult.validRows}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm font-medium">Errors</p>
                  <p className="text-2xl font-bold text-red-900">{parseResult.errors.length}</p>
                </div>
              </div>

              {/* Errors Display */}
              {parseResult.errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ Validation Errors:</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {parseResult.errors.slice(0, 10).map((error, index) => (
                      <p key={index} className="text-red-700 text-sm">{error}</p>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <p className="text-red-600 text-sm font-medium">
                        ... and {parseResult.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {previewData.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">📋 Data Preview (first 10 rows):</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Counted By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.sku}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.amount}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.location}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.countedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parseResult.validRows > 10 && (
                    <p className="text-gray-500 text-sm mt-2">
                      ... and {parseResult.validRows - 10} more valid rows
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Import Configuration */}
          {parseResult && parseResult.validRows > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Step 4: Import to Table</h3>
              
              {/* Table Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select target table:
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="checked"
                      checked={importType === 'checked'}
                      onChange={(e) => setImportType(e.target.value as any)}
                      className="mr-2"
                    />
                    📋 Checked Items
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="expected"
                      checked={importType === 'expected'}
                      onChange={(e) => setImportType(e.target.value as any)}
                      className="mr-2"
                    />
                    📊 Expected Inventory
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="yesterday"
                      checked={importType === 'yesterday'}
                      onChange={(e) => setImportType(e.target.value as any)}
                      className="mr-2"
                    />
                    🗓️ Yesterday Results
                  </label>
                </div>
              </div>

              {/* Import Warning */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Warning:</strong> This will replace all data in the {importType} table. 
                  Current data will be lost. Make sure to export existing data if needed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            {parseResult && parseResult.validRows > 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded"
              >
                {isProcessing ? '⏳ Importing...' : `✅ Import ${parseResult.validRows} Items`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CSVImportDialog;