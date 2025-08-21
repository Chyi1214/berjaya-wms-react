// Scan Result Display - Shows scan results and zone information
import { ScanResult } from '../../types';

interface ScanResultDisplayProps {
  result: ScanResult;
  onNewScan: () => void;
}

export function ScanResultDisplay({ result, onNewScan }: ScanResultDisplayProps) {
  const { scannedCode, lookup, allLookups, timestamp } = result;
  
  // Debug logging for iPhone issue
  console.log('📱 ScanResultDisplay received:', { scannedCode, lookup, timestamp });
  console.log('🔍 Lookup exists?', !!lookup);
  if (lookup) {
    console.log('🎯 Lookup details:', { 
      sku: lookup.sku, 
      targetZone: lookup.targetZone, 
      itemName: lookup.itemName 
    });
  }

  return (
    <div className="space-y-6">
      
      {/* Success Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-green-900 mb-2">Scan Successful!</h2>
        <p className="text-green-700">
          Scanned at {timestamp.toLocaleTimeString()}
        </p>
      </div>

      {/* Scanned Code */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📦 Scanned Item</h3>
        </div>
        <div className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {scannedCode}
            </div>
            <p className="text-gray-500">Item SKU</p>
          </div>
        </div>
      </div>

      {/* Zone Information - Now supports multiple zones! */}
      {allLookups && allLookups.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              📍 {allLookups.length === 1 ? 'Target Zone' : `Found in ${allLookups.length} Zones`}
            </h3>
          </div>
          <div className="p-6">
            <div className="text-center space-y-4">
              
              {/* Multiple Zones Display */}
              {allLookups.length > 1 ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-900 font-medium mb-3">🎯 This component is available in multiple zones:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allLookups.map((zoneLookup, index) => (
                        <div key={index} className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                          <div className="text-xl font-bold text-orange-600">
                            {zoneLookup.targetZone}
                          </div>
                          {zoneLookup.expectedQuantity && (
                            <div className="text-xs text-orange-700">
                              {zoneLookup.expectedQuantity} units
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-blue-700 text-sm mt-3">
                      <strong>Choose the zone that makes most sense for your current task</strong>
                    </p>
                  </div>
                </div>
              ) : (
                /* Single Zone Display */
                <div className="bg-orange-100 border border-orange-200 rounded-lg p-6">
                  <div className="text-4xl font-bold text-orange-600 mb-2">
                    {allLookups[0].targetZone}
                  </div>
                  <p className="text-orange-700 font-medium">Send this item to zone: <strong>{allLookups[0].targetZone}</strong></p>
                </div>
              )}

              {/* Item Details - Use first lookup for primary info */}
              {(allLookups[0].itemName || allLookups[0].expectedQuantity) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  {allLookups[0].itemName && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Item Description:</p>
                      <p className="font-medium text-gray-900">{allLookups[0].itemName}</p>
                    </div>
                  )}
                  {allLookups.length === 1 && allLookups[0].expectedQuantity && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Expected Quantity:</p>
                      <p className="font-medium text-blue-600">{allLookups[0].expectedQuantity} units</p>
                    </div>
                  )}
                </div>
              )}

              {/* Last Updated */}
              <div className="text-xs text-gray-400">
                Last updated: {allLookups[0].updatedAt.toLocaleDateString()} by {allLookups[0].updatedBy}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No Lookup Found */
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">❓</div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Item Not Found
            </h3>
            <p className="text-yellow-700 mb-4">
              No zone information found for SKU: <strong>{scannedCode}</strong>
            </p>
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>What to do:</strong><br/>
                1. Check if the SKU is correct<br/>
                2. Contact your supervisor<br/>
                3. Ask manager to add this item to the lookup table
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onNewScan}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
        >
          🔍 Scan Another Item
        </button>
        
      </div>

      {/* Quick Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Quick Reference</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Numeric Zones (1-30):</strong> Legacy production zones</p>
          <p><strong>DF01-DF99:</strong> Distribution Floor sections</p>
          <p><strong>Z001-Z999:</strong> Specialized work zones</p>
          <p><strong>A1-Z9:</strong> Assembly areas</p>
        </div>
      </div>

    </div>
  );
}

export default ScanResultDisplay;