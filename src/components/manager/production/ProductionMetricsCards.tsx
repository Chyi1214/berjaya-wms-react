import { memo } from 'react';
import { ProductionStats } from '../../../types';
import { formatTime } from './utils';

interface ProductionMetricsCardsProps {
  stats: ProductionStats;
}

export const ProductionMetricsCards = memo(function ProductionMetricsCards({ 
  stats 
}: ProductionMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">🚗</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-600">Cars Today</p>
            <p className="text-xl font-semibold text-gray-900">{stats.carsStarted}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">✅</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-xl font-semibold text-gray-900">{stats.carsCompleted}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-xl font-semibold text-gray-900">{stats.carsInProgress}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">⏱️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-600">Avg Time</p>
            <p className="text-xl font-semibold text-gray-900">
              {stats.averageProductionTime > 0 ? formatTime(stats.averageProductionTime) : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});