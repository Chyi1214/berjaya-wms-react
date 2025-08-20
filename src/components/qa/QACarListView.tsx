// QA Car List View - Shows all cars available for inspection
import React from 'react';
import { Car, QAInspection } from '../../types';

interface QACarListViewProps {
  cars: Car[];
  inspections: QAInspection[];
  onCarSelect: (vin: string) => void;
  onRefresh: () => void;
}

const QACarListView: React.FC<QACarListViewProps> = ({ 
  cars, 
  inspections, 
  onCarSelect,
  onRefresh 
}) => {
  // Get inspection status for a car
  const getInspectionStatus = (vin: string) => {
    const carInspections = inspections.filter(i => i.vin === vin);
    if (carInspections.length === 0) return 'not_inspected';
    
    const latestInspection = carInspections[0]; // Already sorted by date desc
    return latestInspection.status;
  };

  const getInspectionResult = (vin: string) => {
    const carInspections = inspections.filter(i => i.vin === vin);
    if (carInspections.length === 0) return null;
    
    const latestInspection = carInspections[0];
    return latestInspection.overallResult;
  };

  const getStatusColor = (vin: string) => {
    const status = getInspectionStatus(vin);
    const result = getInspectionResult(vin);
    
    switch (status) {
      case 'not_inspected':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return result === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (vin: string) => {
    const status = getInspectionStatus(vin);
    const result = getInspectionResult(vin);
    
    switch (status) {
      case 'not_inspected':
        return 'Not Inspected';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return result === 'pass' ? 'Passed' : 'Failed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (vin: string) => {
    const status = getInspectionStatus(vin);
    const result = getInspectionResult(vin);
    
    switch (status) {
      case 'not_inspected':
        return '⏳';
      case 'in_progress':
        return '🔍';
      case 'completed':
        return result === 'pass' ? '✅' : '❌';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  if (cars.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚗</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Cars Available
        </h3>
        <p className="text-gray-600 mb-4">
          There are no cars in production or completed today.
        </p>
        <button
          onClick={onRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{cars.length}</div>
          <div className="text-sm text-gray-600">Total Cars</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {cars.filter(car => getInspectionStatus(car.vin) === 'not_inspected').length}
          </div>
          <div className="text-sm text-gray-600">Not Inspected</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {cars.filter(car => 
              getInspectionStatus(car.vin) === 'completed' && 
              getInspectionResult(car.vin) === 'pass'
            ).length}
          </div>
          <div className="text-sm text-gray-600">Passed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">
            {cars.filter(car => 
              getInspectionStatus(car.vin) === 'completed' && 
              getInspectionResult(car.vin) === 'fail'
            ).length}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>

      {/* Car List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Cars for Inspection</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {cars.map(car => {
            const canInspect = ['not_inspected', 'failed'].includes(getInspectionStatus(car.vin));
            
            return (
              <div
                key={car.vin}
                className={`p-6 transition-colors ${
                  canInspect 
                    ? 'hover:bg-gray-50 cursor-pointer' 
                    : 'opacity-60'
                }`}
                onClick={canInspect ? () => onCarSelect(car.vin) : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getStatusIcon(car.vin)}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {car.vin}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(car.vin)}`}>
                          {getStatusText(car.vin)}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>Type: {car.type}</span>
                        <span>Color: {car.color}</span>
                        <span>Series: {car.series}</span>
                        {car.currentZone && (
                          <span>Zone: {car.currentZone}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {canInspect && (
                      <div className="text-sm text-blue-600 font-medium">
                        Click to inspect →
                      </div>
                    )}
                    
                    {!canInspect && getInspectionStatus(car.vin) === 'completed' && (
                      <div className="text-sm text-gray-500">
                        ✓ Inspection complete
                      </div>
                    )}
                    
                    {getInspectionStatus(car.vin) === 'in_progress' && (
                      <div className="text-sm text-blue-600">
                        🔍 Being inspected
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Inspection History Preview */}
                {inspections.filter(i => i.vin === car.vin).length > 0 && (
                  <div className="mt-3 pl-10 text-xs text-gray-500">
                    Last inspection: {inspections.find(i => i.vin === car.vin)?.startedAt.toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on any car with "Not Inspected" or "Failed" status to start inspection</li>
          <li>• Cars that have already passed inspection cannot be re-inspected</li>
          <li>• Cars currently being inspected by others will show "Being inspected"</li>
          <li>• Failed inspections can be retried after addressing the issues</li>
        </ul>
      </div>
    </div>
  );
};

export default QACarListView;