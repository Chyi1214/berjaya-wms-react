// Scanner Section Component - Scanner management for inventory tab
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ScannerOperationsCard, CSVUploadInstructionsCard } from '../operations';

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

export function ScannerSection({ onRefresh: _onRefresh }: ScannerSectionProps) {
  const { user } = useAuth();
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">🔍 Scanner Management</h2>
        <p className="text-sm text-gray-500">
          Barcode scanner operations, CSV data management, and lookup configuration
        </p>
      </div>

      {/* Scanner Operations */}
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
        <CSVUploadInstructionsCard />
      </div>
    </div>
  );
}