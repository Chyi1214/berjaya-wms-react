// Operations Tab - Modular operations center with decomposed components
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ScannerOperationsCard,
  CSVUploadInstructionsCard,
  QAManagementCard,
  BatchManagementCard,
  SystemHealthCard,
  DataManagementCard,
  APIManagementCard,
  WorkflowAutomationCard,
  DevelopmentRoadmapCard,
  QuickActionsCard
} from './operations';

interface UploadResult {
  success: number;
  errors: string[];
  stats?: {
    totalRows: number;
    skippedRows: number;
    filledZones: number;
  };
}

interface OperationsTabProps {
  onRefresh?: () => void;
}

export function OperationsTab({ onRefresh }: OperationsTabProps) {
  const { isDevAdmin, hasPermission, user } = useAuth();
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [qaStatus, setQaStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');

  // Check permissions for different operations
  const canViewSystemHealth = isDevAdmin || hasPermission('system.settings');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">🚀 Operations Center</h2>
        <p className="text-sm text-gray-500">
          System operations, scanner management, and bulk actions
        </p>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <CSVUploadInstructionsCard />
        <QAManagementCard 
          user={user}
          qaStatus={qaStatus}
          setQaStatus={setQaStatus}
        />
        <BatchManagementCard 
          user={user}
          onRefresh={onRefresh}
        />
        <SystemHealthCard canViewSystemHealth={canViewSystemHealth} />
        <DataManagementCard />
        <APIManagementCard isDevAdmin={isDevAdmin} />
        <WorkflowAutomationCard />
      </div>

      <DevelopmentRoadmapCard />
      <QuickActionsCard isDevAdmin={isDevAdmin} onRefresh={onRefresh} />
    </div>
  );
}