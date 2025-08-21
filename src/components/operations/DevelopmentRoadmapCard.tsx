import { memo } from 'react';

export const DevelopmentRoadmapCard = memo(function DevelopmentRoadmapCard() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="text-blue-600 text-lg mr-3">ℹ️</div>
        <div>
          <h4 className="text-sm font-medium text-blue-900 mb-1">Development Roadmap</h4>
          <p className="text-sm text-blue-700">
            <strong>✅ New:</strong> Quality Assurance (v4.1.0) - QA car inspections now available with quality checklists!
            <br />
            <strong>Previous:</strong> Scanner functionality (v3.2.0) - Barcode scanning available in Logistics role.
            <br />
            <strong>Next Up:</strong> Advanced QA reporting and analytics dashboard.
          </p>
        </div>
      </div>
    </div>
  );
});