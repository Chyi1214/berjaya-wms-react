import { useState } from 'react';
import { batchManagementService } from '../../services/batchManagement';
import * as XLSX from 'xlsx';

interface UploadResult {
  success: number;
  errors: string[];
  stats: { totalRows: number; skippedRows: number };
}

export function UploadsPanel({ userEmail, onRefresh }: { userEmail?: string | null; onRefresh?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'vinPlans' | 'packing') => {
    const file = e.target.files?.[0];
    if (!file || !userEmail) return;
    setBusy(true);
    setResult(null);
    try {
      let text: string;

      // Check if file is Excel
      const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isXlsx) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Use first sheet (simple approach for this panel)
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        text = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        // Handle regular CSV
        text = await file.text();
      }

      let r: UploadResult;
      if (kind === 'vinPlans') {
        r = await batchManagementService.uploadVinPlansFromCSV(text, userEmail);
      } else {
        r = await batchManagementService.uploadPackingListFromCSV(text, userEmail);
      }
      setResult(r);
      onRefresh?.();
    } catch (err) {
      setResult({ success: 0, errors: [String(err)], stats: { totalRows: 0, skippedRows: 0 } });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* VIN Plan */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">VIN Plan CSV</h3>
            <p className="text-sm text-gray-600">Columns: batchId, vin, carType</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCSV('vin-plan-template.csv', 'batchId,vin,carType\n603,VIN001603,TK1_Red_High')}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              📄 Template
            </button>
            <label className={`px-3 py-2 text-xs text-white rounded ${busy ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}>
              📤 Upload
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => handleUpload(e, 'vinPlans')} />
            </label>
          </div>
        </div>
      </div>

      {/* Packing List */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Packing List CSV</h3>
            <p className="text-sm text-gray-600">Columns: batchId, sku, quantity, location?, boxId?, notes?</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCSV('packing-list-template.csv', 'batchId,sku,quantity,location,boxId,notes\n603,A001,50,logistics,BOX-1,')}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              📄 Template
            </button>
            <label className={`px-3 py-2 text-xs text-white rounded ${busy ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}>
              📤 Upload
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => handleUpload(e, 'packing')} />
            </label>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gray-50 border rounded-lg p-3 text-sm">
          <div className="text-green-700">✅ Processed: {result.success}</div>
          {result.errors.length > 0 && (
            <details className="mt-1 text-red-700">
              <summary>Errors: {result.errors.length}</summary>
              <div className="mt-1 text-xs space-y-1">
                {result.errors.map((e, i) => (<div key={i}>{e}</div>))}
              </div>
            </details>
          )}
          <div className="text-gray-600 text-xs mt-1">Rows: {result.stats.totalRows}, Skipped: {result.stats.skippedRows}</div>
        </div>
      )}
    </div>
  );
}

