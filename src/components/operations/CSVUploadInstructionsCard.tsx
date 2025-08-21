import { memo } from 'react';

export const CSVUploadInstructionsCard = memo(function CSVUploadInstructionsCard() {
  return (
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
  );
});