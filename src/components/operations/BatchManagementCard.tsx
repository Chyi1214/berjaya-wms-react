import { memo, useState } from 'react';
import { batchManagementService } from '../../services/batchManagement';

interface BatchManagementCardProps {
  user: { email: string } | null;
  onRefresh?: () => void;
}

interface UploadResult {
  success: number;
  errors: string[];
  stats: {
    totalRows: number;
    skippedRows: number;
  };
}

export const BatchManagementCard = memo(function BatchManagementCard({
  user,
  onRefresh
}: BatchManagementCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadType, setUploadType] = useState<'carTypes' | 'batches' | 'vinPlans' | 'packingList'>('carTypes');
  const [healthBatchId, setHealthBatchId] = useState('');
  
  // Handle CSV file upload
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      let result: UploadResult;
      
      if (uploadType === 'carTypes') {
        result = await batchManagementService.uploadCarTypesFromCSV(text, user.email);
      } else if (uploadType === 'batches') {
        result = await batchManagementService.uploadBatchesFromCSV(text, user.email);
      } else if (uploadType === 'vinPlans') {
        result = await batchManagementService.uploadVinPlansFromCSV(text, user.email);
      } else {
        result = await batchManagementService.uploadPackingListFromCSV(text, user.email);
      }
      
      setUploadResult(result);
      
      if (result.success > 0) {
        console.log(`✅ Successfully uploaded ${result.success} ${uploadType}`);
        onRefresh?.();
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      setUploadResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
        stats: { totalRows: 0, skippedRows: 0 }
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Generate sample data
  const handleGenerateSampleData = async () => {
    if (!user?.email) return;
    
    setIsUploading(true);
    try {
      await batchManagementService.generateSampleData(user.email);
      console.log('✅ Sample batch data generated');
      alert('Sample batch data generated successfully!');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to generate sample data:', error);
      alert('Failed to generate sample data. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // Check batch data
  const handleCheckBatchData = async () => {
    try {
      console.log('🔍 Checking batch management data...');
      
      const [carTypes, batches] = await Promise.all([
        batchManagementService.getAllCarTypes(),
        batchManagementService.getAllBatches()
      ]);
      
      console.log(`📊 Batch Management Status:
- Car Types: ${carTypes.length}
- Batches: ${batches.length}
- Car Types Details:`, carTypes);
      console.log('- Batch Details:', batches);
      
      alert(`Batch Management System:\n• ${carTypes.length} Car Types\n• ${batches.length} Batches\n\nCheck console for detailed information.`);
    } catch (error) {
      console.error('Failed to check batch data:', error);
      alert('Failed to check batch data. Check console for errors.');
    }
  };

  // Perform batch health check
  const handleBatchHealthCheck = async () => {
    if (!user?.email) return;
    
    try {
      // Get all batches first
      const batches = await batchManagementService.getAllBatches();
      if (batches.length === 0) {
        alert('No batches found. Create some batches first.');
        return;
      }
      
      console.log('🏥 Performing batch health checks...');
      const healthChecks = [];
      
      for (const batch of batches) {
        try {
          const healthCheck = await batchManagementService.performBatchHealthCheck(batch.batchId, user.email);
          healthChecks.push(healthCheck);
        } catch (error) {
          console.error(`Failed health check for batch ${batch.batchId}:`, error);
        }
      }
      
      // Display results
      console.log('📊 Batch Health Check Results:', healthChecks);
      
      const healthySummary = healthChecks.filter(hc => hc.healthStatus === 'healthy').length;
      const warningSummary = healthChecks.filter(hc => hc.healthStatus === 'warning').length;
      const criticalSummary = healthChecks.filter(hc => hc.healthStatus === 'critical').length;
      
      alert(`Batch Health Check Complete:
🟢 Healthy: ${healthySummary}
🟡 Warning: ${warningSummary}  
🔴 Critical: ${criticalSummary}

Check console for detailed breakdown.`);
    } catch (error) {
      console.error('Failed to perform batch health checks:', error);
      alert('Failed to perform batch health checks. Check console for errors.');
    }
  };

  // Download sample CSV templates
  const downloadTemplate = (type: 'carTypes' | 'batches') => {
    let csvContent = '';
    let filename = '';
    
    if (type === 'carTypes') {
      csvContent = `carCode,name,description
TK1_Red_High,Truck Model 1 - Red High Spec,Premium red truck with high-end features
TK1_Red_Low,Truck Model 1 - Red Basic,Basic red truck with standard features
T9_Blue_Low,Truck Model 9 - Blue Basic,Basic blue truck with standard features`;
      filename = 'car-types-template.csv';
    } else {
      csvContent = `batchId,carType,vin,name,components
603,TK1_Red_High,VIN001603,Production Batch 603,A001:50:Engine Part A|B001:25:Body Panel B|C001:10:Control Module C
603,TK1_Red_High,VIN002603,Production Batch 603,A001:50:Engine Part A|B001:25:Body Panel B|C001:10:Control Module C
603,TK1_Red_High,VIN003603,Production Batch 603,A001:50:Engine Part A|B001:25:Body Panel B|C001:10:Control Module C
604,TK1_Red_Low,VIN001604,Production Batch 604,A001:30:Engine Part A|B001:15:Body Panel B
604,TK1_Red_Low,VIN002604,Production Batch 604,A001:30:Engine Part A|B001:15:Body Panel B`;
      filename = 'batches-template.csv';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🏭</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Batch Management</h3>
        <p className="text-sm text-gray-500 mb-4">
          Manage production batches, car types, and VIN mappings (Eugene Section 5.3)
        </p>
        
        {/* Upload Type Selection */}
        <div className="mb-4">
          <div className="flex justify-center space-x-4 flex-wrap gap-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType"
                value="carTypes"
                checked={uploadType === 'carTypes'}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Car Types</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType" 
                value="batches"
                checked={uploadType === 'batches'}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Batches + VINs</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType" 
                value="vinPlans"
                checked={uploadType === 'vinPlans'}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">VIN Plan CSV</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="uploadType" 
                value="packingList"
                checked={uploadType === 'packingList'}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Packing List CSV</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* CSV Upload */}
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={isUploading}
              className="hidden"
              id="batch-csv-upload"
            />
            <label
              htmlFor="batch-csv-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isUploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                `📤 Upload ${uploadType === 'carTypes' ? 'Car Types' : 'Batches'} CSV`
              )}
            </label>
          </div>

          {/* Template Downloads */}
          <div className="flex justify-center space-x-2 flex-wrap gap-2">
            <button
              onClick={() => downloadTemplate('carTypes')}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              📄 Car Types Template
            </button>
            <button
              onClick={() => downloadTemplate('batches')}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              📄 Batches Template
            </button>
            <button
              onClick={() => {
                const csv = `batchId,vin,carType\n603,VIN001603,TK1_Red_High\n603,VIN002603,TK1_Red_High\n603,VIN003603,TK1_Red_High`;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vin-plan-template.csv';
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              📄 VIN Plan Template
            </button>
            <button
              onClick={() => {
                const csv = `batchId,sku,quantity,location,boxId,notes\n603,A001,50,logistics,BOX-1,\n603,B001,25,logistics,BOX-1,\n603,C001,10,logistics,BOX-2,`;
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'packing-list-template.csv';
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              📄 Packing List Template
            </button>
          </div>

          {/* Management Actions */}
          <div className="flex justify-center space-x-2 flex-wrap gap-2">
            <button
              onClick={handleGenerateSampleData}
              disabled={isUploading}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              🔧 Generate Sample Data
            </button>
            <button
              onClick={handleCheckBatchData}
              className="px-3 py-2 text-sm font-medium rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            >
              🔍 Check Batch Data
            </button>
            <button
              onClick={handleBatchHealthCheck}
              disabled={isUploading}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              🏥 Health Check
            </button>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Batch ID for VIN Health"
                value={healthBatchId}
                onChange={(e) => setHealthBatchId(e.target.value)}
                className="px-2 py-1 text-sm border rounded"
              />
              <button
                onClick={async () => {
                  if (!healthBatchId) { alert('Enter a Batch ID'); return; }
                  try {
                    const report = await batchManagementService.computeBatchHealthByVIN(healthBatchId);
                    console.log('📊 VIN-level Health Report:', report);
                    alert(`VIN Health for ${healthBatchId}:\nReady: ${report.summary.readyVins}\nBlocked: ${report.summary.blockedVins}`);
                  } catch (err) {
                    console.error('VIN health failed:', err);
                    alert('Failed to compute VIN health');
                  }
                }}
                className="px-3 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                🚗 VIN Health
              </button>
            </div>
          </div>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-left">
            <div className="text-sm">
              <div className="text-green-600 font-medium">
                ✅ Successfully processed: {uploadResult.success}
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="text-red-600 mt-1">
                  ❌ Errors: {uploadResult.errors.length}
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs">Show details</summary>
                    <div className="text-xs mt-1 space-y-1">
                      {uploadResult.errors.map((error, i) => (
                        <div key={i}>{error}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              <div className="text-gray-600 text-xs mt-1">
                📊 Processed {uploadResult.stats.totalRows} rows, skipped {uploadResult.stats.skippedRows}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
