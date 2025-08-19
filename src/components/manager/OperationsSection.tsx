// Operations Section Component - Wrapper for operations/scanner functionality  
import { Suspense, lazy } from 'react';

// Lazy load the OperationsTab
const OperationsTab = lazy(() => import('../OperationsTab').then(module => ({ default: module.OperationsTab })));

interface OperationsSectionProps {
  onRefresh: () => void;
}

export function OperationsSection({ onRefresh }: OperationsSectionProps) {
  return (
    <div className="p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Loading Operations Center...</p>
          </div>
        </div>
      }>
        <OperationsTab 
          onRefresh={onRefresh}
        />
      </Suspense>
    </div>
  );
}