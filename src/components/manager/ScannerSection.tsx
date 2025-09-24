// Scanner Section Component - Scanner management for inventory tab
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ScannerOperationsCard, CSVUploadInstructionsCard } from '../operations';
import { ScannerInventoryTable } from '../scanner/ScannerInventoryTable';
import { AddScannerEntryForm } from '../scanner/AddScannerEntryForm';

interface UploadResult {
  success: number;
  errors: string[];
  stats?: {
    totalRows: number;
    skippedRows: number;
    filledZones: number;
  };
}

interface ScannerSectionProps {
  onRefresh?: () => void;
}

type TabType = 'inventory' | 'csv' | 'instructions';

export function ScannerSection({ onRefresh: _onRefresh }: ScannerSectionProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    _onRefresh?.();
  };

  const tabs = [
    { id: 'inventory' as TabType, label: '📋 Inventory List', description: 'View and manage individual scanner entries' },
    { id: 'csv' as TabType, label: '📤 CSV Operations', description: 'Bulk upload and download operations' },
    { id: 'instructions' as TabType, label: '📚 Instructions', description: 'CSV format guide and templates' }
  ];

  if (!user?.email) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Please log in to manage scanner data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">🔍 Scanner Management</h2>
        <p className="text-sm text-gray-500">
          Barcode scanner operations, CSV data management, and lookup configuration
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Inventory List Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Add New Entry Form */}
            <AddScannerEntryForm
              onAdd={handleRefresh}
              userEmail={user.email}
              existingSKUs={[]}
            />

            {/* Inventory Table */}
            <ScannerInventoryTable
              key={refreshKey}
              onRefresh={handleRefresh}
              userEmail={user.email}
            />
          </div>
        )}

        {/* CSV Operations Tab */}
        {activeTab === 'csv' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScannerOperationsCard
              user={user}
              scannerStatus={scannerStatus}
              setScannerStatus={setScannerStatus}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              uploadResult={uploadResult}
              setUploadResult={setUploadResult}
              replaceMode={replaceMode}
              setReplaceMode={setReplaceMode}
            />
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Pro Tip</h3>
                <p className="text-sm text-blue-700">
                  After bulk CSV operations, switch to the Inventory List tab to verify your data and make individual adjustments if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Tab */}
        {activeTab === 'instructions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CSVUploadInstructionsCard />
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🎯 Best Practices</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Use the Inventory List tab for quick individual changes</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Use CSV operations for bulk imports and data backups</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Zone names can be numeric (8, 22) or alphanumeric (DF02, Z001)</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span>Same SKU can exist in multiple zones for different locations</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-500">⚠️</span>
                    <span>Always verify data after bulk operations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}