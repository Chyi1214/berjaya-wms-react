import { useEffect, useMemo, useState } from 'react';
import { carTrackingService } from '../../services/carTrackingService';
import { batchManagementService } from '../../services/batchManagement';
import { Car, CarStatus } from '../../types/production';

interface VinPlanRecord { batchId: string; vin: string; carType: string }

export function VinMonitorPanel() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState('');
  const [vinPlans, setVinPlans] = useState<VinPlanRecord[]>([]);
  const [health, setHealth] = useState<{ ready: Set<string>; blocked: Map<string, number> } | null>(null);
  const [missingByVin, setMissingByVin] = useState<Map<string, Array<{ sku: string; required: number; available: number; shortfall: number }>>>(new Map());
  const [expandedVin, setExpandedVin] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await carTrackingService.getCars();
        setCars(data);
      } catch (e) {
        setError('Failed to load VINs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived lists

  const filtered = useMemo(() => {
    if (!batchId) return cars;
    const set = new Set(vinPlans.filter(p => p.batchId === batchId).map(p => p.vin.toUpperCase()));
    return cars.filter(c => set.has(c.vin.toUpperCase()));
  }, [cars, vinPlans, batchId]);

  const readyCount = health ? health.ready.size : 0;
  const blockedCount = health ? health.blocked.size : 0;

  const loadVinPlans = async (id: string) => {
    try {
      const snap = await (await import('firebase/firestore')).getDocs(
        (await import('firebase/firestore')).query(
          (await import('firebase/firestore')).collection((await import('../../services/firebase')).db, 'vin_plans'),
          (await import('firebase/firestore')).where('batchId', '==', id)
        )
      );
      const plans: VinPlanRecord[] = snap.docs.map(d => ({
        batchId: d.data().batchId,
        vin: (d.data().vin || '').toUpperCase(),
        carType: d.data().carType
      }));
      setVinPlans(plans);
    } catch (e) {
      console.error('Failed to load VIN plans', e);
      setVinPlans([]);
    }
  };

  const computeHealth = async () => {
    if (!batchId) return;
    try {
      const report = await batchManagementService.computeBatchHealthByVIN(batchId);
      const ready = new Set(report.results.filter(r => r.status === 'ready').map(r => r.vin.toUpperCase()));
      const blocked = new Map<string, number>();
      const missingMap = new Map<string, Array<{ sku: string; required: number; available: number; shortfall: number }>>();
      for (const r of report.results) {
        if (r.status === 'blocked') {
          blocked.set(r.vin.toUpperCase(), r.missing?.length || 1);
          if (r.missing && r.missing.length > 0) {
            missingMap.set(r.vin.toUpperCase(), r.missing);
          }
        }
      }
      setHealth({ ready, blocked });
      setMissingByVin(missingMap);
    } catch (e) {
      console.error('Failed to compute VIN health', e);
      setHealth(null);
      setMissingByVin(new Map());
    }
  };

  const onBatchChange = async (value: string) => {
    setBatchId(value);
    setHealth(null);
    if (value) await loadVinPlans(value);
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">VINs Overview</h3>
          <p className="text-sm text-gray-600">Track each car status and (optional) batch readiness</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by Batch ID (optional)"
            value={batchId}
            onChange={(e) => onBatchChange(e.target.value)}
            className="px-3 py-2 border rounded w-64"
          />
          <button
            onClick={computeHealth}
            disabled={!batchId}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              batchId ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Compute VIN Health
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-600">Loading VINs...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="bg-gray-50 border rounded px-3 py-1">Total VINs: <span className="font-medium">{filtered.length}</span></div>
            {health && (
              <>
                <div className="bg-green-50 border border-green-200 rounded px-3 py-1 text-green-800">Ready: <span className="font-medium">{readyCount}</span></div>
                <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1 text-yellow-800">Blocked: <span className="font-medium">{blockedCount}</span></div>
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">VIN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Zone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Car Type</th>
                  {batchId && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch Health</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((c) => {
                  const vinUpper = c.vin.toUpperCase();
                  const plan = vinPlans.find(p => p.vin === vinUpper);
                  const isReady = health?.ready.has(vinUpper);
                  const isBlocked = health?.blocked.has(vinUpper);
                  return (
                    <>
                      <tr key={c.vin} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-mono">{c.vin}</td>
                        <td className="px-4 py-2 text-sm">
                          {c.status === CarStatus.COMPLETED ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Completed</span>
                          ) : c.status === CarStatus.ON_HOLD ? (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">On Hold</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">In Production</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">{c.currentZone ?? '-'}</td>
                        <td className="px-4 py-2 text-sm">{plan?.carType || c.carType || `${c.type} ${c.color}`}</td>
                        {batchId && (
                          <td className="px-4 py-2 text-sm">
                            {isReady ? (
                              <span className="text-green-700">Ready ✅</span>
                            ) : isBlocked ? (
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-700">Blocked ⚠️</span>
                                <button
                                  className="text-blue-600 hover:underline text-xs"
                                  onClick={() => setExpandedVin(expandedVin === vinUpper ? null : vinUpper)}
                                >
                                  {expandedVin === vinUpper ? 'Hide missing' : 'View missing'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                      {batchId && expandedVin === vinUpper && isBlocked && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="text-xs text-gray-700">
                              <div className="font-medium mb-1">Missing SKUs:</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(missingByVin.get(vinUpper) || []).map((m, idx) => (
                                  <div key={idx} className="bg-white border rounded p-2">
                                    <div className="font-mono font-medium">{m.sku}</div>
                                    <div>Required: {m.required}</div>
                                    <div>Available: {m.available}</div>
                                    <div className="text-red-700">Shortfall: {m.shortfall}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
