// QA Inspection Analytics - Analytics and insights for inspection data
import React, { useState, useEffect, useMemo } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type { CarInspection, DefectType } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const logger = createModuleLogger('QAInspectionAnalytics');

type TimeFilter = 'today' | '7days' | '30days' | 'all' | 'custom';

const QAInspectionAnalytics: React.FC = () => {
  const [inspections, setInspections] = useState<CarInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [gateFilter, setGateFilter] = useState<string>('all'); // Filter by gate
  const [sectionFilter, setSectionFilter] = useState<string>('all'); // Filter by section

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const data = await inspectionService.getAllInspections();
      setInspections(data);
    } catch (err) {
      logger.error('Failed to load inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique gates for filtering
  const availableGates = useMemo(() => {
    const gates = new Set<string>();
    inspections.forEach((i) => {
      if (i.gateId && i.gateName) {
        gates.add(JSON.stringify({ gateId: i.gateId, gateName: i.gateName }));
      }
    });
    return Array.from(gates).map((g) => JSON.parse(g));
  }, [inspections]);

  // Get available sections
  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    inspections.forEach((i) => {
      Object.keys(i.sections).forEach((sectionId) => {
        sections.add(sectionId);
      });
    });
    return Array.from(sections);
  }, [inspections]);

  // Filter inspections by time range and gate
  const filteredInspections = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let timeFiltered: CarInspection[];

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        timeFiltered = inspections.filter(
          (i) => i.createdAt && new Date(i.createdAt) >= startDate
        );
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        timeFiltered = inspections.filter(
          (i) => i.createdAt && new Date(i.createdAt) >= startDate
        );
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        timeFiltered = inspections.filter(
          (i) => i.createdAt && new Date(i.createdAt) >= startDate
        );
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          timeFiltered = inspections;
        } else {
          startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          timeFiltered = inspections.filter(
            (i) =>
              i.createdAt &&
              new Date(i.createdAt) >= startDate &&
              new Date(i.createdAt) <= endDate
          );
        }
        break;
      case 'all':
      default:
        timeFiltered = inspections;
    }

    // Apply gate filter
    if (gateFilter === 'all') {
      return timeFiltered;
    }
    return timeFiltered.filter((i) => i.gateId === gateFilter);
  }, [inspections, timeFilter, customStartDate, customEndDate, gateFilter]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalCars = filteredInspections.length;
    const completedCars = filteredInspections.filter(
      (i) => i.status === 'completed'
    ).length;

    // Dynamically discover defect types from actual data
    const defectsByType: Record<DefectType, number> = {};

    // Section defect counts
    const defectsBySection: Record<string, number> = {};

    // Item defect counts by section
    const defectsByItemAndSection: Record<string, number> = {};

    // Inspector activity
    const inspectorStats: Record<
      string,
      { carsInspected: number; defectsFound: number; name: string }
    > = {};

    // Daily defect counts for trend
    const dailyDefects: Record<string, number> = {};

    let totalDefects = 0;

    filteredInspections.forEach((inspection) => {
      Object.entries(inspection.sections).forEach(([sectionId, section]) => {
        // Apply section filter
        if (sectionFilter !== 'all' && sectionId !== sectionFilter) {
          return; // Skip this section if it doesn't match the filter
        }

        // Track inspector activity
        if (section.inspector) {
          if (!inspectorStats[section.inspector]) {
            inspectorStats[section.inspector] = {
              carsInspected: 0,
              defectsFound: 0,
              name: section.inspectorName || section.inspector,
            };
          }
          inspectorStats[section.inspector].carsInspected++;
        }

        // Count defects
        Object.entries(section.results).forEach(([itemName, result]) => {
          // Initialize counter if this defect type hasn't been seen yet
          if (!defectsByType[result.defectType]) {
            defectsByType[result.defectType] = 0;
          }
          defectsByType[result.defectType]++;

          if (result.defectType !== 'Ok') {
            totalDefects++;

            // Track by section
            if (!defectsBySection[sectionId]) {
              defectsBySection[sectionId] = 0;
            }
            defectsBySection[sectionId]++;

            // Track by item and section combined
            const itemKey = `${itemName} (${sectionId.replace(/_/g, ' ')})`;
            if (!defectsByItemAndSection[itemKey]) {
              defectsByItemAndSection[itemKey] = 0;
            }
            defectsByItemAndSection[itemKey]++;

            // Track inspector defects
            if (section.inspector) {
              inspectorStats[section.inspector].defectsFound++;
            }

            // Track daily trend
            if (inspection.createdAt) {
              const date = new Date(inspection.createdAt).toLocaleDateString();
              dailyDefects[date] = (dailyDefects[date] || 0) + 1;
            }
          }

          // Count additional defects (backwards compatibility: treat undefined as empty array)
          const additionalDefects = result.additionalDefects || [];
          additionalDefects.forEach((additionalDefect) => {
            // Initialize counter if this defect type hasn't been seen yet
            if (!defectsByType[additionalDefect.defectType]) {
              defectsByType[additionalDefect.defectType] = 0;
            }
            defectsByType[additionalDefect.defectType]++;

            // Additional defects are always actual defects (never "Ok")
            totalDefects++;

            // Track by section
            if (!defectsBySection[sectionId]) {
              defectsBySection[sectionId] = 0;
            }
            defectsBySection[sectionId]++;

            // Track by item and section combined
            const itemKey = `${itemName} (${sectionId.replace(/_/g, ' ')})`;
            if (!defectsByItemAndSection[itemKey]) {
              defectsByItemAndSection[itemKey] = 0;
            }
            defectsByItemAndSection[itemKey]++;

            // Track inspector defects
            if (section.inspector) {
              inspectorStats[section.inspector].defectsFound++;
            }

            // Track daily trend
            if (inspection.createdAt) {
              const date = new Date(inspection.createdAt).toLocaleDateString();
              dailyDefects[date] = (dailyDefects[date] || 0) + 1;
            }
          });
        });
      });
    });

    // Top problem items by section
    const topProblemItems = Object.entries(defectsByItemAndSection)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Daily trend data
    const trendData = Object.entries(dailyDefects)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, defects: count }));

    return {
      totalCars,
      completedCars,
      totalDefects,
      avgDefectsPerCar: totalCars > 0 ? (totalDefects / totalCars).toFixed(1) : '0',
      defectsByType,
      defectsBySection,
      topProblemItems,
      inspectorStats: Object.values(inspectorStats),
      trendData,
    };
  }, [filteredInspections, sectionFilter]);

  // Chart data preparation
  const defectTypeChartData = Object.entries(analytics.defectsByType)
    .filter(([type, count]) => type !== 'Ok' && count > 0)
    .map(([type, count]) => ({ name: type, value: count }));

  const sectionChartData = Object.entries(analytics.defectsBySection)
    .map(([section, count]) => ({
      name: section.replace(/_/g, ' '),
      defects: count,
    }))
    .sort((a, b) => b.defects - a.defects);

  // Top problem items chart data
  const topProblemsChartData = analytics.topProblemItems.map(([item, count]) => ({
    name: item,
    count: count,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QA Analytics</h1>
            <p className="text-gray-600 mt-1">Inspection insights and trends</p>
          </div>
          <button
            onClick={loadInspections}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Time Filters */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeFilter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeFilter('7days')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeFilter === '7days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('30days')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeFilter === '30days'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeFilter('custom')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeFilter === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range */}
        {timeFilter === 'custom' && (
          <div className="mt-4 flex gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Gate Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Gate
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGateFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                gateFilter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Gates
            </button>
            {availableGates.map((gate) => (
              <button
                key={gate.gateId}
                onClick={() => setGateFilter(gate.gateId)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  gateFilter === gate.gateId
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {gate.gateName}
              </button>
            ))}
          </div>
        </div>

        {/* Section Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Section
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSectionFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                sectionFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Sections
            </button>
            {availableSections.map((section) => (
              <button
                key={section}
                onClick={() => setSectionFilter(section)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  sectionFilter === section
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {section.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Cars Inspected</div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics.totalCars}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics.completedCars} completed
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Defects Found</div>
          <div className="text-3xl font-bold text-red-600">
            {analytics.totalDefects}
          </div>
          <div className="text-xs text-gray-500 mt-1">All types</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Defects per Car</div>
          <div className="text-3xl font-bold text-orange-600">
            {analytics.avgDefectsPerCar}
          </div>
          <div className="text-xs text-gray-500 mt-1">Per vehicle</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Most Common Defect</div>
          <div className="text-xl font-bold text-purple-600">
            {defectTypeChartData[0]?.name || 'None'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {defectTypeChartData[0]?.value || 0} occurrences
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Type Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Defect Type Breakdown
          </h2>
          {defectTypeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={defectTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No defect data available
            </div>
          )}
        </div>

        {/* Defects by Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Defects by Section
          </h2>
          {sectionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="defects" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No section data available
            </div>
          )}
        </div>
      </div>

      {/* Daily Trend Chart */}
      {analytics.trendData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Defect Trend Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="defects"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 10 Problem Items Bar Chart */}
      {topProblemsChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Problem Items (Item + Position)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Most frequent defects classified by item name and inspection section
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProblemsChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={250}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Problem Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top 10 Problem Items by Section
          </h2>
          {analytics.topProblemItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Rank
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Item Name (Section)
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">
                      Defect Count
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.topProblemItems.map(([item, count], index) => (
                    <tr key={item} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-2 text-gray-900">{item}</td>
                      <td className="px-4 py-2 text-right font-semibold text-red-600">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No defect data available
            </div>
          )}
        </div>

        {/* Inspector Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Inspector Activity
          </h2>
          {analytics.inspectorStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">
                      Inspector
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">
                      Cars
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">
                      Defects Found
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.inspectorStats
                    .sort((a, b) => b.carsInspected - a.carsInspected)
                    .map((inspector) => (
                      <tr key={inspector.name} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">
                          {inspector.name}
                        </td>
                        <td className="px-4 py-2 text-right text-blue-600 font-semibold">
                          {inspector.carsInspected}
                        </td>
                        <td className="px-4 py-2 text-right text-red-600 font-semibold">
                          {inspector.defectsFound}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No inspector data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QAInspectionAnalytics;
