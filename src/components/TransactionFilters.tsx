// Transaction Filters Component - Filter and search transactions
import { useState, useEffect } from 'react';
import { TransactionFilter, TransactionType, TransactionStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { batchAllocationService } from '../services/batchAllocationService';

interface TransactionFiltersProps {
  filters: TransactionFilter;
  onFiltersChange: (filters: TransactionFilter) => void;
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const { t } = useLanguage();
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  // Load available batches
  useEffect(() => {
    loadAvailableBatches();
  }, []);

  const loadAvailableBatches = async () => {
    try {
      const config = await batchAllocationService.getBatchConfig();
      if (config) {
        setAvailableBatches(config.availableBatches);
      }
    } catch (error) {
      console.error('Failed to load batch configuration:', error);
    }
  };

  const updateFilter = (key: keyof TransactionFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          🔍 {t('transactions.filterTransactions')}
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            {t('common.clear')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Search Term */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.search')}
          </label>
          <input
            type="text"
            value={filters.searchTerm || ''}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            placeholder="SKU, item name, notes..."
            className="input-primary text-sm"
          />
        </div>

        {/* SKU Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('inventory.sku')}
          </label>
          <input
            type="text"
            value={filters.sku || ''}
            onChange={(e) => updateFilter('sku', e.target.value)}
            placeholder="a001, b002..."
            className="input-primary text-sm"
          />
        </div>

        {/* Transaction Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('transactions.transactionType')}
          </label>
          <select
            value={filters.transactionType || ''}
            onChange={(e) => updateFilter('transactionType', e.target.value)}
            className="input-primary text-sm"
          >
            <option value="">All types</option>
            <option value={TransactionType.COUNT}>{t('transactions.count')}</option>
            <option value={TransactionType.ADJUSTMENT}>{t('transactions.adjustment')}</option>
            <option value={TransactionType.TRANSFER_IN}>{t('transactions.transferIn')}</option>
            <option value={TransactionType.TRANSFER_OUT}>{t('transactions.transferOut')}</option>
            <option value={TransactionType.INITIAL_STOCK}>{t('transactions.initialStock')}</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="input-primary text-sm"
          >
            <option value="">All statuses</option>
            <option value={TransactionStatus.COMPLETED}>{t('transactions.completed')}</option>
            <option value={TransactionStatus.PENDING}>{t('transactions.pending')}</option>
            <option value={TransactionStatus.CANCELLED}>{t('transactions.cancelled')}</option>
          </select>
        </div>

        {/* Batch Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📦 Batch
          </label>
          <select
            value={filters.batchId || ''}
            onChange={(e) => updateFilter('batchId', e.target.value)}
            className="input-primary text-sm"
          >
            <option value="">All batches</option>
            <option value="UNASSIGNED">🚫 Unassigned</option>
            {availableBatches.map(batchId => (
              <option key={batchId} value={batchId}>
                Batch {batchId}
              </option>
            ))}
          </select>
        </div>

        {/* Rectification Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            🔄 Rectifications
          </label>
          <select
            value={filters.includeRectifications === undefined ? '' : filters.includeRectifications ? 'true' : 'false'}
            onChange={(e) => updateFilter('includeRectifications', e.target.value === '' ? undefined : e.target.value === 'true')}
            className="input-primary text-sm"
          >
            <option value="">Show all</option>
            <option value="false">Hide rectifications</option>
            <option value="true">Show only rectifications</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('inventory.location')}
          </label>
          <select
            value={filters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value)}
            className="input-primary text-sm"
          >
            <option value="">All locations</option>
            <option value="logistics">{t('roles.logistics')}</option>
            {Array.from({ length: 25 }, (_, i) => {
              const zoneId = i + 1;
              let zoneName;

              if (zoneId === 24) {
                zoneName = 'CP7';
              } else if (zoneId === 25) {
                zoneName = 'CP8';
              } else {
                zoneName = `${t('production.zone')} ${zoneId}`;
              }

              return (
                <option key={zoneId} value={`production_zone_${zoneId}`}>
                  {zoneName}
                </option>
              );
            })}
          </select>
        </div>

        {/* Performed By Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('transactions.performedBy')}
          </label>
          <input
            type="text"
            value={filters.performedBy || ''}
            onChange={(e) => updateFilter('performedBy', e.target.value)}
            placeholder="user@example.com"
            className="input-primary text-sm"
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value ? new Date(e.target.value) : undefined)}
            className="input-primary text-sm"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
            onChange={(e) => updateFilter('dateTo', e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined)}
            className="input-primary text-sm"
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value) return null;
              
              let displayValue = value;
              if (value instanceof Date) {
                displayValue = value.toLocaleDateString();
              }
              
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  <span className="font-medium">{key}:</span>
                  <span className="ml-1">{String(displayValue)}</span>
                  <button
                    onClick={() => updateFilter(key as keyof TransactionFilter, undefined)}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionFilters;