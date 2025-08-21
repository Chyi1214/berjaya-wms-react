import { memo } from 'react';
import { ProductionStats } from '../../../types';

interface WorkerPerformanceTableProps {
  stats: ProductionStats;
}

export const WorkerPerformanceTable = memo(function WorkerPerformanceTable({ 
  stats 
}: WorkerPerformanceTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Worker Performance Today</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours Worked
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cars Worked On
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.workerStats.map((worker) => (
              <tr key={worker.email} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {worker.displayName}
                  </div>
                  <div className="text-xs text-gray-500">{worker.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{worker.hoursWorked}h</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{worker.carsWorkedOn}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {stats.workerStats.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No worker activity today</p>
          </div>
        )}
      </div>
    </div>
  );
});