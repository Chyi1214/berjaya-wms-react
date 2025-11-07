// Scanner Section Component - Scanner management for inventory tab
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UnifiedScannerInventory } from '../scanner/UnifiedScannerInventory';
import { SupplierBoxScanManager } from '../scanner/SupplierBoxScanManager';

interface ScannerSectionProps {
  onRefresh?: () => void;
}

type TabType = 'inventory' | 'qr_tracking';

export function ScannerSection({ onRefresh: _onRefresh }: ScannerSectionProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  const tabs = [
    { id: 'inventory' as TabType, label: '📋 Scanner Inventory', description: 'Manage scanner lookup data with bulk and individual operations' },
    { id: 'qr_tracking' as TabType, label: '📦 QR Tracking', description: 'Supplier box QR scan tracking and management' }
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
        {/* Scanner Inventory Tab */}
        {activeTab === 'inventory' && (
          <UnifiedScannerInventory userEmail={user.email} />
        )}

        {/* QR Tracking Tab */}
        {activeTab === 'qr_tracking' && (
          <SupplierBoxScanManager />
        )}
      </div>
    </div>
  );
}