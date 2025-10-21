// QA Section Component - Quality Assurance management with tabs
import { useState } from 'react';
import QAInspectionManager from '../qa/inspection/QAInspectionManager';
import QAInspectionAnalytics from '../qa/inspection/QAInspectionAnalytics';
import ChecklistConfiguration from '../qa/config/ChecklistConfiguration';

interface QASectionProps {
  onRefresh?: () => void;
}

type QATabType = 'manager' | 'analytics' | 'configuration';

export function QASection({ onRefresh: _onRefresh }: QASectionProps) {
  const [activeTab, setActiveTab] = useState<QATabType>('manager');

  return (
    <div>
      {/* Sub-tabs for QA Section */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('manager')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'manager'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Inspections Manager
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('configuration')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'configuration'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Configuration
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'manager' && <QAInspectionManager />}
        {activeTab === 'analytics' && <QAInspectionAnalytics />}
        {activeTab === 'configuration' && <ChecklistConfiguration />}
      </div>
    </div>
  );
}