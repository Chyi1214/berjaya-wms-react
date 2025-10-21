// Operations Section Component - Batch/Lot Management & QA Inspections
import { useState } from 'react';
import QAInspectionManager from '../qa/inspection/QAInspectionManager';

interface OperationsSectionProps {
  onRefresh?: () => void;
}

export function OperationsSection({ onRefresh: _onRefresh }: OperationsSectionProps) {
  const [activeTab, setActiveTab] = useState<'batch' | 'qa'>('batch');

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('batch')}
            className={`${
              activeTab === 'batch'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            📦 Batch/Lot Management
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`${
              activeTab === 'qa'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            🔍 QA Inspections
          </button>
        </nav>
      </div>

      {/* Batch Tab Content */}
      {activeTab === 'batch' && (
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-lg font-medium text-gray-900">📦 Batch/Lot Management</h2>
            <p className="text-sm text-gray-500">
              Cross-departmental batch and lot operations that don't clearly belong to inventory or production
            </p>
          </div>

          {/* Main Batch Management Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Batch Operations</h3>
            <p className="text-gray-700 text-sm mb-4">
              Manage batches and lots across inventory and production zones
            </p>

            {/* Batch Management Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">📋 Batch Creation</h4>
                <p className="text-gray-600 text-sm mb-3">Create and manage new batches</p>
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-2">🚧</div>
                  <p>Ready for Development</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">🔄 Batch Transfers</h4>
                <p className="text-gray-600 text-sm mb-3">Cross-zone batch movements</p>
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-2">🚧</div>
                  <p>Ready for Development</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">📊 Batch Tracking</h4>
                <p className="text-gray-600 text-sm mb-3">Track batch status and history</p>
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-2">🚧</div>
                  <p>Ready for Development</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">🏷️ Lot Numbers</h4>
                <p className="text-gray-600 text-sm mb-3">Generate and manage lot numbers</p>
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-2">🚧</div>
                  <p>Ready for Development</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">📈 Batch Analytics</h4>
                <p className="text-gray-600 text-sm mb-3">Batch performance and metrics</p>
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-2">🚧</div>
                  <p>Ready for Development</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-2">⚡ Batch Processing</h4>
                <p className="text-gray-600 text-sm mb-3">Bulk operations on batches</p>
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-2">🚧</div>
                  <p>Ready for Development</p>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Why Operations Tab?</h4>
            <div className="text-blue-700 text-sm space-y-1">
              <p><strong>Cross-Departmental:</strong> Batch operations span both inventory and production</p>
              <p><strong>Unified View:</strong> Manage all batches from a single location</p>
              <p><strong>Centralized Control:</strong> Avoid confusion about where batch management belongs</p>
              <p><strong>Future Expansion:</strong> Ready for additional cross-departmental operations</p>
            </div>
          </div>
        </div>
      )}

      {/* QA Inspections Tab Content */}
      {activeTab === 'qa' && (
        <QAInspectionManager />
      )}
    </div>
  );
}
