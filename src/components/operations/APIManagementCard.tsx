import { memo } from 'react';

interface APIManagementCardProps {
  isDevAdmin: boolean;
}

export const APIManagementCard = memo(function APIManagementCard({
  isDevAdmin,
}: APIManagementCardProps) {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">API & Integrations</h3>
        <p className="text-sm text-gray-500 mb-4">
          External system integrations and API management
        </p>
        <div className="space-y-2 text-xs text-gray-400">
          <div>🔗 Third-party integrations</div>
          <div>📡 API endpoints</div>
          <div>🔐 API key management</div>
          <div>📝 Integration logs</div>
        </div>
        {isDevAdmin && (
          <button
            disabled
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
          >
            Future Feature
          </button>
        )}
      </div>
    </div>
  );
});