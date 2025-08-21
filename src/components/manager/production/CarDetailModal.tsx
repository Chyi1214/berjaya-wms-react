import { memo } from 'react';
import { Car } from '../../../types';
import { formatTime } from './utils';

interface CarDetailModalProps {
  car: Car | null;
  onClose: () => void;
}

export const CarDetailModal = memo(function CarDetailModal({ 
  car, 
  onClose 
}: CarDetailModalProps) {
  if (!car) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-50"></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Car Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">VIN</p>
                <p className="font-mono font-medium">{car.vin}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium">{car.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Color</p>
                <p className="font-medium">{car.color}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Series</p>
                <p className="font-medium">{car.series}</p>
              </div>
            </div>

            {car.zoneHistory.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Zone History</h4>
                <div className="space-y-2">
                  {car.zoneHistory.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">Zone {entry.zoneId}</span>
                      <div className="text-sm text-gray-600">
                        {entry.timeSpent ? formatTime(entry.timeSpent) : 'In progress'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});