// Operations Tab - Placeholder for future scanner and system operations
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { scanLookupService } from '../services/scanLookupService';
import { qualityAssuranceService } from '../services/qualityAssuranceService';

interface OperationsTabProps {
  onRefresh?: () => void;
}

export function OperationsTab({ onRefresh }: OperationsTabProps) {
  const { isDevAdmin, hasPermission, user } = useAuth();
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{success: number; errors: string[]} | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [qaStatus, setQaStatus] = useState<'idle' | 'initializing' | 'ready' | 'error'>('idle');

  // Check permissions for different operations
  const canViewSystemHealth = isDevAdmin || hasPermission('system.settings');

  // Initialize scanner test data
  const handleInitializeScanner = async () => {
    if (!user?.email) return;
    
    setScannerStatus('initializing');
    try {
      await scanLookupService.generateTestData(user.email);
      setScannerStatus('ready');
      console.log('✅ Scanner test data initialized');
    } catch (error) {
      console.error('Failed to initialize scanner data:', error);
      setScannerStatus('error');
    }
  };

  // Check what data exists in scanner lookup table
  const handleCheckScannerData = async () => {
    try {
      console.log('🔍 Checking scanner data...');
      const allLookups = await scanLookupService.getAllLookups();
      console.log(`📊 Found ${allLookups.length} scanner entries:`, allLookups);
      
      // Test a specific lookup
      const testResult = await scanLookupService.getLookupBySKU('A001');
      console.log('🎯 A001 lookup result:', testResult);
      
      alert(`Scanner database has ${allLookups.length} entries. Check console for details.`);
    } catch (error) {
      console.error('Failed to check scanner data:', error);
      alert('Failed to check scanner data. Check console for errors.');
    }
  };

  // Handle CSV file upload for scanner lookup table
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      // Parse CSV - expect format: SKU,Zone,ItemName,ExpectedQuantity
      const header = lines[0].toLowerCase();
      if (!header.includes('sku') || !header.includes('zone')) {
        throw new Error('CSV must have SKU and Zone columns. Expected format: SKU,Zone,ItemName,ExpectedQuantity');
      }

      const lookups = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"(.*)"$/, '$1')); // Remove quotes
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const sku = parts[0].toUpperCase();
          const targetZone = parseInt(parts[1]);
          const itemName = parts[2] || '';
          const expectedQuantity = parts[3] && parts[3].trim() ? parseInt(parts[3]) : null;

          if (isNaN(targetZone) || targetZone < 1 || targetZone > 30) {
            console.warn(`Skipping invalid zone ${parts[1]} for SKU ${sku}`);
            continue;
          }

          if (expectedQuantity !== null && (isNaN(expectedQuantity) || expectedQuantity < 0)) {
            console.warn(`Skipping invalid quantity ${parts[3]} for SKU ${sku}`);
            continue;
          }

          const lookupData: any = {
            sku,
            targetZone,
            itemName,
            updatedBy: user.email
          };

          // Only add expectedQuantity if it has a valid value
          if (expectedQuantity !== null) {
            lookupData.expectedQuantity = expectedQuantity;
          }

          lookups.push(lookupData);
        }
      }

      if (lookups.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      console.log(`📥 Importing ${lookups.length} scanner lookups... (Replace mode: ${replaceMode})`);
      
      let result;
      if (replaceMode) {
        // Replace mode: clear all existing data first
        console.log('🗑️ Replace mode: clearing all existing data...');
        await scanLookupService.clearAllLookups();
        result = await scanLookupService.bulkImport(lookups, user.email);
        console.log('✅ CSV replace completed:', result);
      } else {
        // Update mode: add/update only
        result = await scanLookupService.bulkImport(lookups, user.email);
        console.log('✅ CSV update completed:', result);
      }
      
      setUploadResult(result);

    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadResult({ success: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] });
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Download current scanner data as CSV
  const handleDownloadCSV = async () => {
    try {
      console.log('📥 Downloading scanner data...');
      const allLookups = await scanLookupService.getAllLookups();
      
      if (allLookups.length === 0) {
        alert('No scanner data to download');
        return;
      }

      // Create CSV content with headers
      const headers = ['SKU', 'Zone', 'ItemName', 'ExpectedQuantity', 'UpdatedBy', 'UpdatedAt'];
      const csvContent = [
        headers.join(','),
        ...allLookups.map(lookup => [
          lookup.sku,
          lookup.targetZone,
          `"${lookup.itemName || ''}"`, // Quote item names in case they have commas
          lookup.expectedQuantity || '',
          lookup.updatedBy,
          lookup.updatedAt.toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `scanner-data-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Downloaded ${allLookups.length} scanner entries as CSV`);
    } catch (error) {
      console.error('Failed to download CSV:', error);
      alert('Failed to download scanner data');
    }
  };

  // Initialize QA checklist
  const handleInitializeQA = async () => {
    if (!user?.email) return;
    
    setQaStatus('initializing');
    try {
      const checklistId = await qualityAssuranceService.createDefaultChecklist(user.email);
      setQaStatus('ready');
      console.log('✅ QA checklist initialized:', checklistId);
    } catch (error) {
      console.error('Failed to initialize QA checklist:', error);
      setQaStatus('error');
    }
  };

  // Check QA checklists
  const handleCheckQAData = async () => {
    try {
      console.log('🔍 Checking QA data...');
      const checklists = await qualityAssuranceService.getAllChecklists();
      const inspections = await qualityAssuranceService.getTodayInspections();
      console.log(`📊 Found ${checklists.length} checklists and ${inspections.length} inspections today:`, { checklists, inspections });
      
      alert(`QA system has ${checklists.length} checklists and ${inspections.length} inspections today. Check console for details.`);
    } catch (error) {
      console.error('Failed to check QA data:', error);
      alert('Failed to check QA data. Check console for errors.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">🚀 Operations Center</h2>
        <p className="text-sm text-gray-500">
          System operations, scanner management, and bulk actions
        </p>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Scanner Operations - v3.2.0 */}
        <div className="bg-white border-2 border-green-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Scanner Dashboard</h3>
            <p className="text-sm text-gray-500 mb-4">
              Barcode scanning management and configuration
            </p>
            <div className="space-y-2 text-xs text-gray-600">
              <div>✅ Available in v3.2.0</div>
              <div>🔍 Barcode/QR code scanning</div>
              <div>📍 SKU to zone lookup</div>
              <div>⚡ Real-time item identification</div>
            </div>
            
            {/* Scanner Status */}
            <div className="mt-4 space-y-2">
              {scannerStatus === 'idle' && (
                <div className="text-sm text-gray-500">Ready to initialize scanner data</div>
              )}
              {scannerStatus === 'initializing' && (
                <div className="text-sm text-blue-600">⏳ Setting up scanner lookup table...</div>
              )}
              {scannerStatus === 'ready' && (
                <div className="text-sm text-green-600">✅ Scanner ready! Test data loaded.</div>
              )}
              {scannerStatus === 'error' && (
                <div className="text-sm text-red-600">❌ Failed to initialize scanner</div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleInitializeScanner}
                disabled={scannerStatus === 'initializing'}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  scannerStatus === 'ready' 
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : scannerStatus === 'error'
                    ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {scannerStatus === 'initializing' && '⏳ Initializing...'}
                {scannerStatus === 'ready' && '✅ Scanner Ready'}
                {scannerStatus === 'error' && '🔄 Retry Setup'}
                {scannerStatus === 'idle' && '📱 Initialize Scanner'}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCheckScannerData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  🔍 Check DB
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="px-4 py-2 bg-green-100 text-green-700 border border-green-300 rounded-lg hover:bg-green-200 transition-colors text-sm"
                >
                  💾 Download
                </button>
              </div>

              {/* CSV Upload */}
              <div className="border-t pt-2">
                {/* Replace Mode Toggle */}
                <div className="mb-2">
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={replaceMode}
                      onChange={(e) => setReplaceMode(e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className={replaceMode ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      🗑️ Replace all data (clears existing before upload)
                    </span>
                  </label>
                </div>

                <label className="block">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <div className={`w-full px-4 py-2 rounded-lg border border-dashed transition-colors cursor-pointer text-center text-sm ${
                    isUploading 
                      ? 'bg-blue-50 text-blue-600 border-blue-300'
                      : replaceMode
                      ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                      : 'bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100'
                  }`}>
                    {isUploading 
                      ? '⏳ Uploading CSV...' 
                      : replaceMode
                      ? '🗑️ Replace All Data'
                      : '📤 Add/Update Data'
                    }
                  </div>
                </label>
                
                {/* CSV Upload Result */}
                {uploadResult && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    uploadResult.success > 0 && uploadResult.errors.length === 0
                      ? 'bg-green-50 text-green-700'
                      : uploadResult.errors.length > 0
                      ? 'bg-yellow-50 text-yellow-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {uploadResult.success > 0 && (
                      <div>✅ Imported {uploadResult.success} entries</div>
                    )}
                    {uploadResult.errors.length > 0 && (
                      <div>⚠️ {uploadResult.errors.length} errors</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CSV Upload Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-blue-600 text-lg mr-3">📋</div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Upload Instructions</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p><strong>Required Format:</strong> SKU,Zone,ItemName,ExpectedQuantity</p>
                <p><strong>Example:</strong></p>
                <div className="bg-blue-100 border border-blue-300 rounded p-2 font-mono text-xs">
                  SKU,Zone,ItemName,ExpectedQuantity<br/>
                  A001,8,Engine Part A,50<br/>
                  B002,5,Body Panel B,25<br/>
                  E001,15,Electronic Module A,100
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span>💡</span>
                  <a 
                    href="/scanner-template.csv" 
                    download
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Download sample template
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QA Management - v4.1.0 */}
        <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">QA Management</h3>
            <p className="text-sm text-gray-500 mb-4">
              Quality assurance checklists and inspection setup
            </p>
            <div className="space-y-2 text-xs text-gray-600">
              <div>✅ Available in v4.1.0</div>
              <div>📋 Quality checklists</div>
              <div>🔍 Car inspections</div>
              <div>📊 Quality reports</div>
            </div>
            
            {/* QA Status */}
            <div className="mt-4 space-y-2">
              {qaStatus === 'idle' && (
                <div className="text-sm text-gray-500">Ready to initialize QA system</div>
              )}
              {qaStatus === 'initializing' && (
                <div className="text-sm text-orange-600">⏳ Setting up QA checklists...</div>
              )}
              {qaStatus === 'ready' && (
                <div className="text-sm text-green-600">✅ QA system ready! Default checklist created.</div>
              )}
              {qaStatus === 'error' && (
                <div className="text-sm text-red-600">❌ Failed to initialize QA system</div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleInitializeQA}
                disabled={qaStatus === 'initializing'}
                className={`w-full px-4 py-2 rounded-lg transition-colors ${
                  qaStatus === 'ready' 
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : qaStatus === 'error'
                    ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {qaStatus === 'initializing' && '⏳ Initializing...'}
                {qaStatus === 'ready' && '✅ QA Ready'}
                {qaStatus === 'error' && '🔄 Retry Setup'}
                {qaStatus === 'idle' && '✅ Initialize QA'}
              </button>
              
              <button
                onClick={handleCheckQAData}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                🔍 Check QA Data
              </button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">System Health</h3>
            <p className="text-sm text-gray-500 mb-4">
              System monitoring and maintenance tools
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <div>📈 Performance metrics</div>
              <div>🗄️ Database health</div>
              <div>👥 User activity logs</div>
              <div>⚠️ Error monitoring</div>
            </div>
            {canViewSystemHealth && (
              <button
                disabled
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
              >
                Future Feature
              </button>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🗃️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Management</h3>
            <p className="text-sm text-gray-500 mb-4">
              Advanced data operations and analytics
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <div>📊 Data analytics</div>
              <div>🔍 Advanced search</div>
              <div>📋 Custom reports</div>
              <div>💾 Data backup/restore</div>
            </div>
            <button
              disabled
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
            >
              Future Feature
            </button>
          </div>
        </div>

        {/* API Management */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">API & Integrations</h3>
            <p className="text-sm text-gray-500 mb-4">
              External system integrations and API management
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <div>🔗 Third-party integrations</div>
              <div>📡 API endpoints</div>
              <div>🔐 API key management</div>
              <div>📝 Integration logs</div>
            </div>
            {isDevAdmin && (
              <button
                disabled
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
              >
                Future Feature
              </button>
            )}
          </div>
        </div>

        {/* Workflow Automation */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Automation</h3>
            <p className="text-sm text-gray-500 mb-4">
              Workflow automation and smart rules
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <div>📋 Automated workflows</div>
              <div>⏰ Scheduled tasks</div>
              <div>🚨 Smart alerts</div>
              <div>🔄 Auto-reconciliation</div>
            </div>
            <button
              disabled
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
            >
              Future Feature
            </button>
          </div>
        </div>

      </div>

      {/* Current Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-blue-600 text-lg mr-3">ℹ️</div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Development Roadmap</h4>
            <p className="text-sm text-blue-700">
              <strong>✅ New:</strong> Quality Assurance (v4.1.0) - QA car inspections now available with quality checklists!
              <br />
              <strong>Previous:</strong> Scanner functionality (v3.2.0) - Barcode scanning available in Logistics role.
              <br />
              <strong>Next Up:</strong> Advanced QA reporting and analytics dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {isDevAdmin && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">⚡ Quick Actions (DevAdmin)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              🔄 Refresh Data
            </button>
            <button
              disabled
              className="px-3 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
            >
              📊 Generate Report
            </button>
            <button
              disabled
              className="px-3 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
            >
              🧹 Clean Cache
            </button>
            <button
              disabled
              className="px-3 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
            >
              ⚙️ System Config
            </button>
          </div>
        </div>
      )}
    </div>
  );
}