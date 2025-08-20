// QA Inspection View - Individual inspection interface
import React, { useState, useEffect, useContext } from 'react';
import { Car, QAChecklist, QAInspection, QACheckStatus, QACheckResult } from '../../types';
import { qualityAssuranceService } from '../../services/qualityAssuranceService';
import { AuthContext } from '../../contexts/AuthContext';

interface QAInspectionViewProps {
  car: Car;
  checklist: QAChecklist;
  onComplete: (inspection: QAInspection) => void;
  onBack: () => void;
}

const QAInspectionView: React.FC<QAInspectionViewProps> = ({
  car,
  checklist,
  onComplete,
  onBack
}) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.authenticatedUser;
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Map<string, QACheckResult>>(new Map());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(new Date());

  // Start inspection when component mounts
  useEffect(() => {
    startInspection();
  }, []);

  const startInspection = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      const id = await qualityAssuranceService.startInspection(
        car,
        checklist.id,
        user.email,
        user.displayName || user.email
      );
      setInspectionId(id);
    } catch (error) {
      console.error('Failed to start inspection:', error);
      setError('Failed to start inspection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckResult = async (itemId: string, status: QACheckStatus) => {
    if (!inspectionId || !user) return;

    try {
      const noteText = notes.get(itemId) || '';
      
      await qualityAssuranceService.updateCheckResult(
        inspectionId,
        itemId,
        status,
        noteText,
        user.email
      );

      // Update local state
      const result: QACheckResult = {
        itemId,
        status,
        notes: noteText,
        checkedAt: new Date(),
        checkedBy: user.email
      };

      setCheckResults(prev => new Map(prev.set(itemId, result)));
    } catch (error) {
      console.error('Failed to update check result:', error);
      setError('Failed to save check result. Please try again.');
    }
  };

  const handleNotesChange = (itemId: string, noteText: string) => {
    setNotes(prev => new Map(prev.set(itemId, noteText)));
  };

  const handleCompleteInspection = async () => {
    if (!inspectionId) return;

    try {
      setLoading(true);
      const inspection = await qualityAssuranceService.getInspection(inspectionId);
      if (inspection) {
        onComplete(inspection);
      }
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      setError('Failed to complete inspection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress
  const totalItems = checklist.items.length;
  const checkedItems = checkResults.size;
  const passedItems = Array.from(checkResults.values()).filter(r => r.status === QACheckStatus.PASSED).length;
  const failedItems = Array.from(checkResults.values()).filter(r => r.status === QACheckStatus.FAILED).length;
  const requiredItems = checklist.items.filter(item => item.isRequired).length;
  const requiredPassed = checklist.items.filter(item => {
    const result = checkResults.get(item.id);
    return item.isRequired && result?.status === QACheckStatus.PASSED;
  }).length;

  const isComplete = checkedItems === totalItems;
  const requiredFailed = checklist.items.some(item => {
    const result = checkResults.get(item.id);
    return item.isRequired && result?.status === QACheckStatus.FAILED;
  });

  const overallResult = isComplete ? (requiredFailed ? 'fail' : 'pass') : 'pending';
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  if (loading && !inspectionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting inspection...</p>
        </div>
      </div>
    );
  }

  if (error && !inspectionId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 mt-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={startInspection}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group items by category
  const itemsByCategory = checklist.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof checklist.items>);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Inspecting Car: {car.vin}
            </h2>
            <p className="text-sm text-gray-600">
              {car.type} • {car.color} • {car.series}
              {car.currentZone && ` • Zone ${car.currentZone}`}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Checklist: {checklist.name}
            </div>
            <div className="text-sm text-gray-600">
              Started: {startTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {checkedItems} / {totalItems} items
            </span>
            <span className="text-sm font-medium text-gray-700">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{checkedItems}</div>
            <div className="text-xs text-gray-600">Checked</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{passedItems}</div>
            <div className="text-xs text-gray-600">Passed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{failedItems}</div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{requiredPassed}/{requiredItems}</div>
            <div className="text-xs text-gray-600">Required</div>
          </div>
        </div>

        {/* Overall Status */}
        {isComplete && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            overallResult === 'pass' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            <div className="text-lg font-bold">
              {overallResult === 'pass' ? '✅ PASSED' : '❌ FAILED'}
            </div>
            <div className="text-sm mt-1">
              {overallResult === 'pass' 
                ? 'All required checks passed' 
                : 'Some required checks failed'
              }
            </div>
          </div>
        )}
      </div>

      {/* Checklist Items by Category */}
      <div className="space-y-4">
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {category}
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {items.sort((a, b) => a.order - b.order).map(item => {
                const result = checkResults.get(item.id);
                const currentNotes = notes.get(item.id) || '';
                
                return (
                  <div key={item.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {item.name}
                          </h4>
                          {item.isRequired && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        
                        {item.instructions && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.instructions}
                          </p>
                        )}
                      </div>
                      
                      {result && (
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          result.status === QACheckStatus.PASSED 
                            ? 'bg-green-100 text-green-800'
                            : result.status === QACheckStatus.FAILED
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status === QACheckStatus.PASSED ? '✅ PASS' :
                           result.status === QACheckStatus.FAILED ? '❌ FAIL' : 
                           '⏭️ SKIP'}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 mb-3">
                      <button
                        onClick={() => handleCheckResult(item.id, QACheckStatus.PASSED)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          result?.status === QACheckStatus.PASSED
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                        disabled={loading}
                      >
                        ✅ Pass
                      </button>
                      
                      <button
                        onClick={() => handleCheckResult(item.id, QACheckStatus.FAILED)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          result?.status === QACheckStatus.FAILED
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        disabled={loading}
                      >
                        ❌ Fail
                      </button>
                      
                      {!item.isRequired && (
                        <button
                          onClick={() => handleCheckResult(item.id, QACheckStatus.SKIPPED)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            result?.status === QACheckStatus.SKIPPED
                              ? 'bg-yellow-600 text-white'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                          disabled={loading}
                        >
                          ⏭️ Skip
                        </button>
                      )}
                    </div>
                    
                    {/* Notes */}
                    <div>
                      <textarea
                        value={currentNotes}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        placeholder="Add notes (optional)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                    </div>
                    
                    {result?.checkedAt && (
                      <div className="text-xs text-gray-500 mt-2">
                        Checked at: {result.checkedAt.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between space-x-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel Inspection
          </button>
          
          <button
            onClick={handleCompleteInspection}
            disabled={!isComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isComplete && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Completing...' : 'Complete Inspection'}
          </button>
        </div>
        
        {!isComplete && (
          <p className="text-sm text-gray-600 text-center mt-2">
            Complete all {totalItems} checks to finish inspection
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
};

export default QAInspectionView;