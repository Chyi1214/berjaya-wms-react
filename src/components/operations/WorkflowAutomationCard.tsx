import { memo } from 'react';

export const WorkflowAutomationCard = memo(function WorkflowAutomationCard() {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🤖</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Automation</h3>
        <p className="text-sm text-gray-500 mb-4">
          Workflow automation and smart rules
        </p>
        <div className="space-y-2 text-xs text-gray-400">
          <div>📋 Automated workflows</div>
          <div>⏰ Scheduled tasks</div>
          <div>🚨 Smart alerts</div>
          <div>🔄 Auto-reconciliation</div>
        </div>
        <button
          disabled
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
        >
          Future Feature
        </button>
      </div>
    </div>
  );
});