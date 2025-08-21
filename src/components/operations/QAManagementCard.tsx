import { memo } from 'react';
import { qualityAssuranceService } from '../../services/qualityAssuranceService';

interface QAManagementCardProps {
  user: { email: string } | null;
  qaStatus: 'idle' | 'initializing' | 'ready' | 'error';
  setQaStatus: (status: 'idle' | 'initializing' | 'ready' | 'error') => void;
}

export const QAManagementCard = memo(function QAManagementCard({
  user,
  qaStatus,
  setQaStatus,
}: QAManagementCardProps) {
  // Initialize QA checklist
  const handleInitializeQA = async () => {
    if (!user?.email) return;
    
    setQaStatus('initializing');
    try {
      const checklistId = await qualityAssuranceService.createDefaultChecklist(user.email);
      setQaStatus('ready');
      console.log('✅ QA checklist initialized:', checklistId);
    } catch (error) {
      console.error('Failed to initialize QA checklist:', error);
      setQaStatus('error');
    }
  };

  // Check QA checklists
  const handleCheckQAData = async () => {
    try {
      console.log('🔍 Checking QA data...');
      const checklists = await qualityAssuranceService.getAllChecklists();
      const inspections = await qualityAssuranceService.getTodayInspections();
      console.log(`📊 Found ${checklists.length} checklists and ${inspections.length} inspections today:`, { checklists, inspections });
      
      alert(`QA system has ${checklists.length} checklists and ${inspections.length} inspections today. Check console for details.`);
    } catch (error) {
      console.error('Failed to check QA data:', error);
      alert('Failed to check QA data. Check console for errors.');
    }
  };

  return (
    <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">QA Management</h3>
        <p className="text-sm text-gray-500 mb-4">
          Quality assurance checklists and inspection setup
        </p>
        <div className="space-y-2 text-xs text-gray-600">
          <div>✅ Available in v4.1.0</div>
          <div>📋 Quality checklists</div>
          <div>🔍 Car inspections</div>
          <div>📊 Quality reports</div>
        </div>
        
        {/* QA Status */}
        <div className="mt-4 space-y-2">
          {qaStatus === 'idle' && (
            <div className="text-sm text-gray-500">Ready to initialize QA system</div>
          )}
          {qaStatus === 'initializing' && (
            <div className="text-sm text-orange-600">⏳ Setting up QA checklists...</div>
          )}
          {qaStatus === 'ready' && (
            <div className="text-sm text-green-600">✅ QA system ready! Default checklist created.</div>
          )}
          {qaStatus === 'error' && (
            <div className="text-sm text-red-600">❌ Failed to initialize QA system</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleInitializeQA}
            disabled={qaStatus === 'initializing'}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              qaStatus === 'ready' 
                ? 'bg-green-100 text-green-700 border border-green-300'
                : qaStatus === 'error'
                ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {qaStatus === 'initializing' && '⏳ Initializing...'}
            {qaStatus === 'ready' && '✅ QA Ready'}
            {qaStatus === 'error' && '🔄 Retry Setup'}
            {qaStatus === 'idle' && '✅ Initialize QA'}
          </button>
          
          <button
            onClick={handleCheckQAData}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            🔍 Check QA Data
          </button>
        </div>
      </div>
    </div>
  );
});