// Cost Tracking Dashboard - Visual dashboard for monitoring Firebase and API costs
import { useState, useEffect } from 'react';
import { costTracker } from '../../services/costTracking/costTracker';
import { pricingCalculator, ServiceCostEstimate } from '../../services/costTracking/pricingCalculator';
import { bigQueryService, DailyCostSummary } from '../../services/bigQueryService';

export function CostTrackingDashboard() {
  const refreshInterval = 10; // seconds
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [bigQueryData, setBigQueryData] = useState<DailyCostSummary | null>(null);
  const [serviceCosts, setServiceCosts] = useState<ServiceCostEstimate[]>([]);
  const [totalCosts, setTotalCosts] = useState({
    estimated: 0,
    actual: 0,
    accuracy: 0,
  });

  // Refresh data
  const refreshData = () => {
    // Get all service metrics
    const allMetrics = costTracker.getAllMetrics();

    // Calculate costs for each service
    const costs: ServiceCostEstimate[] = [];
    let totalEstimated = 0;

    for (const metrics of allMetrics) {
      const serviceCost = pricingCalculator.calculateServiceCost(
        metrics.serviceName,
        metrics.operations
      );

      totalEstimated += serviceCost.totalCost;

      costs.push({
        ...serviceCost,
        percentageOfTotal: 0, // Will calculate after we have total
      });
    }

    // Calculate percentages
    for (const cost of costs) {
      cost.percentageOfTotal = totalEstimated > 0 ? (cost.totalCost / totalEstimated) * 100 : 0;
    }

    // Sort by total cost (highest first)
    costs.sort((a, b) => b.totalCost - a.totalCost);

    setServiceCosts(costs);

    // Update total costs
    setTotalCosts(prev => ({
      estimated: totalEstimated,
      actual: prev.actual,
      accuracy: prev.actual > 0 ? (totalEstimated / prev.actual) * 100 : 0,
    }));

    setLastRefresh(new Date());
  };

  // Fetch BigQuery data (real costs)
  const fetchBigQueryData = async () => {
    if (!bigQueryService.isAvailable()) {
      return;
    }

    try {
      const data = await bigQueryService.getTodayCosts();
      if (data) {
        setBigQueryData(data);
        setTotalCosts(prev => ({
          estimated: prev.estimated,
          actual: data.totalCost,
          accuracy: data.totalCost > 0 ? (prev.estimated / data.totalCost) * 100 : 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch BigQuery data:', error);
    }
  };

  // Auto-refresh
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Fetch BigQuery data once on mount
  useEffect(() => {
    fetchBigQueryData();
  }, []);

  // Get total operations
  const totalOps = costTracker.getTotalOperations();
  const startDate = costTracker.getStartDate();

  // Debug: Log storage bytes
  console.log('💰 Total operations:', {
    storageBytes: totalOps.storageBytes,
    storageKB: (totalOps.storageBytes / 1024).toFixed(2),
    storageMB: (totalOps.storageBytes / 1024 / 1024).toFixed(2),
    reads: totalOps.reads,
    writes: totalOps.writes
  });

  // Calculate total estimated cost
  const estimatedCost = pricingCalculator.calculateTotalCost(totalOps);

  // Debug: Log calculated costs
  console.log('💰 Calculated costs:', {
    storageCost: estimatedCost.storageCost.total.toFixed(6),
    firestoreCost: estimatedCost.firestoreCost.total.toFixed(6),
    geminiCost: estimatedCost.geminiCost.total.toFixed(6),
    totalCost: estimatedCost.totalEstimatedCost.toFixed(6)
  });

  // Export data as CSV
  const exportToCSV = () => {
    const headers = ['Service', 'Reads', 'Writes', 'Deletes', 'Storage (bytes)', 'API Calls', 'API Tokens', 'Firestore Cost', 'Storage Cost', 'Gemini Cost', 'Total Cost', '% of Total'];
    const rows = serviceCosts.map(s => [
      s.serviceName,
      s.operations.reads,
      s.operations.writes,
      s.operations.deletes,
      s.operations.storageBytes,
      s.operations.apiCalls,
      `${s.operations.apiTokensInput + s.operations.apiTokensOutput}`,
      `$${s.firestoreCost.toFixed(6)}`,
      `$${s.storageCost.toFixed(6)}`,
      `$${s.geminiCost.toFixed(6)}`,
      `$${s.totalCost.toFixed(6)}`,
      `${s.percentageOfTotal.toFixed(1)}%`,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cost Tracking Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tracking since: {startDate.toLocaleString()} | Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Now
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Estimated Cost */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Estimated Cost (Today)</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            ${estimatedCost.totalEstimatedCost.toFixed(6)}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <div>Firestore: ${estimatedCost.firestoreCost.total.toFixed(6)}</div>
            <div>Storage: ${estimatedCost.storageCost.total.toFixed(6)}</div>
            <div>Gemini: ${estimatedCost.geminiCost.total.toFixed(6)}</div>
          </div>
        </div>

        {/* Actual Cost (from BigQuery) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Actual Cost (BigQuery)</h3>
          {bigQueryData ? (
            <>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ${bigQueryData.totalCost.toFixed(4)}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                <div>Firestore: ${bigQueryData.firestoreCost.toFixed(4)}</div>
                <div>Storage: ${bigQueryData.storageCost.toFixed(4)}</div>
                <div>Gemini: ${bigQueryData.geminiCost.toFixed(4)}</div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-2">
              {bigQueryService.isAvailable() ? 'Loading...' : 'Not configured'}
            </p>
          )}
        </div>

        {/* Total Operations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Operations</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {(totalOps.reads + totalOps.writes + totalOps.deletes).toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <div>Reads: {totalOps.reads.toLocaleString()}</div>
            <div>Writes: {totalOps.writes.toLocaleString()}</div>
            <div>Deletes: {totalOps.deletes.toLocaleString()}</div>
          </div>
        </div>

        {/* API Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Gemini API Usage</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {totalOps.apiCalls.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <div>Input: {(totalOps.apiTokensInput / 1000).toFixed(1)}K tokens</div>
            <div>Output: {(totalOps.apiTokensOutput / 1000).toFixed(1)}K tokens</div>
            <div>Storage: {(totalOps.storageBytes / (1024 * 1024)).toFixed(2)} MB</div>
          </div>
        </div>
      </div>

      {/* Accuracy Indicator */}
      {bigQueryData && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Tracking Accuracy</h3>
              <p className="text-xs text-gray-500 mt-1">
                How close our estimates are to actual costs
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {totalCosts.accuracy.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {totalCosts.accuracy > 90 ? '(Excellent)' : totalCosts.accuracy > 75 ? '(Good)' : '(Needs calibration)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Breakdown Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Cost Breakdown by Feature</h2>
          <p className="text-sm text-gray-500 mt-1">
            Detailed breakdown showing which parts of your app are most expensive
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service/Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firestore Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gemini Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceCosts.map((service, index) => (
                <tr key={service.serviceName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {service.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    <div>R: {service.operations.reads.toLocaleString()}</div>
                    <div>W: {service.operations.writes.toLocaleString()}</div>
                    {service.operations.deletes > 0 && <div>D: {service.operations.deletes.toLocaleString()}</div>}
                    {service.operations.apiCalls > 0 && <div>API: {service.operations.apiCalls.toLocaleString()}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${service.firestoreCost.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${service.storageCost.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${service.geminiCost.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${service.totalCost.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(service.percentageOfTotal, 100)}%` }}
                        ></div>
                      </div>
                      {service.percentageOfTotal.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {serviceCosts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No operations tracked yet</p>
              <p className="text-sm mt-2">Start using your app to see cost data appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* BigQuery Setup Notice */}
      {!bigQueryService.isAvailable() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">BigQuery Not Configured</h3>
          <p className="text-sm text-yellow-700 mt-1">
            To see real costs from Google Cloud Platform, you need to set up BigQuery billing export.
            See the setup guide for instructions.
          </p>
        </div>
      )}
    </div>
  );
}
