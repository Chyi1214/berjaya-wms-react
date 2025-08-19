// Test Data Section Component - Handles mock data generation for testing
interface TestDataSectionProps {
  isLoading: boolean;
  handleGenerateMockData: () => Promise<void>;
  handleGenerateTransactionTest: () => Promise<void>;
}

export function TestDataSection({
  isLoading,
  handleGenerateMockData,
  handleGenerateTransactionTest
}: TestDataSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎭 Test Data Generation</h3>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        
        {/* Generate Mock Data */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 mb-2">🎲</div>
          <h4 className="font-medium text-blue-900 mb-1">Generate Complete Test Data</h4>
          <p className="text-blue-700 text-sm mb-3">Creates mock inventory counts, transactions, and test scenarios</p>
          <button 
            onClick={handleGenerateMockData}
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            {isLoading ? '⏳ Generating...' : '🎲 Generate Mock Data'}
          </button>
        </div>

        {/* Transaction Test Case */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-600 mb-2">🔄</div>
          <h4 className="font-medium text-purple-900 mb-1">Transaction Test Case</h4>
          <p className="text-purple-700 text-sm mb-3">Creates specific scenario to test OTP transaction workflow</p>
          <button 
            onClick={handleGenerateTransactionTest}
            disabled={isLoading}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            {isLoading ? '⏳ Generating...' : '🔄 Generate Transaction Test'}
          </button>
        </div>
      </div>
    </div>
  );
}