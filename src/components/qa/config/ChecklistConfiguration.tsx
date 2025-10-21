// Checklist Configuration Component - Manager interface for uploading checklist CSVs
import { useState } from 'react';
import { checklistCSVService, LANGUAGE_NAMES, type LanguageCode } from '../../../services/checklistCSVService';
import { inspectionService } from '../../../services/inspectionService';
import type { InspectionTemplate } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';

const logger = createModuleLogger('ChecklistConfiguration');

const LANGUAGES: LanguageCode[] = ['en', 'ms', 'zh', 'my', 'bn'];

export default function ChecklistConfiguration() {
  const [uploadedFiles, setUploadedFiles] = useState<Map<LanguageCode, File>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState<InspectionTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  // Load current template
  const loadCurrentTemplate = async () => {
    setIsLoadingTemplate(true);
    try {
      const template = await inspectionService.getTemplate('vehicle_inspection_v1');
      setCurrentTemplate(template);
    } catch (error) {
      logger.error('Failed to load current template:', error);
      setUploadStatus('Failed to load current template');
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (language: LanguageCode, file: File | null) => {
    const newFiles = new Map(uploadedFiles);
    if (file) {
      newFiles.set(language, file);
    } else {
      newFiles.delete(language);
    }
    setUploadedFiles(newFiles);
  };

  // Upload and process CSV files
  const handleUpload = async () => {
    if (uploadedFiles.size === 0) {
      setUploadStatus('Please upload at least the English CSV file');
      return;
    }

    if (!uploadedFiles.has('en')) {
      setUploadStatus('English CSV is required as the base language');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Processing CSV files...');

    try {
      // Parse all uploaded CSV files
      const parsedData = new Map();

      for (const [lang, file] of uploadedFiles.entries()) {
        const content = await file.text();
        const parsed = checklistCSVService.parseCSV(content, lang);
        parsedData.set(lang, parsed);
      }

      setUploadStatus('Validating structure...');

      // Create multilingual template
      const template = checklistCSVService.createMultilingualTemplate(
        parsedData,
        'vehicle_inspection_v1',
        '2.0'
      );

      setUploadStatus('Saving to database...');

      // Save to Firestore
      await inspectionService.createTemplate(template);

      setUploadStatus('✅ Checklist uploaded successfully!');
      setUploadedFiles(new Map());

      // Reload current template
      await loadCurrentTemplate();

    } catch (error) {
      logger.error('Failed to upload checklist:', error);
      setUploadStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Download current template as CSV
  const handleDownload = (language: LanguageCode) => {
    if (!currentTemplate) {
      setUploadStatus('No template loaded. Please load the current template first.');
      return;
    }

    try {
      const csv = checklistCSVService.exportToCSV(currentTemplate, language);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `checklist_${language}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setUploadStatus(`✅ Downloaded ${LANGUAGE_NAMES[language]} CSV`);
    } catch (error) {
      logger.error('Failed to download CSV:', error);
      setUploadStatus(`❌ Failed to download ${LANGUAGE_NAMES[language]} CSV`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Checklist Configuration</h2>
        <p className="text-gray-600">
          Upload CSV files to configure the inspection checklist in multiple languages.
          English is required, other languages are optional (will fall back to English if missing).
        </p>
      </div>

      {/* Current Template Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Template</h3>

        {!currentTemplate && !isLoadingTemplate && (
          <button
            onClick={loadCurrentTemplate}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Load Current Template
          </button>
        )}

        {isLoadingTemplate && (
          <p className="text-gray-600">Loading current template...</p>
        )}

        {currentTemplate && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Template ID:</strong> {currentTemplate.templateId}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Version:</strong> {currentTemplate.version}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Type:</strong> {currentTemplate.isMultilingual ? 'Multilingual' : 'Legacy (English only)'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sections:</strong> {Object.keys(currentTemplate.sections).length}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Download Current Template</h4>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleDownload(lang)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-300"
                  >
                    📄 {LANGUAGE_NAMES[lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Checklist</h3>

        {/* CSV Format Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">CSV Format</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>Required columns: <code className="bg-blue-100 px-1 rounded">SectionID, SectionName, ItemNumber, ItemName, DefectType, Required</code></p>
            <p className="mt-2">Example:</p>
            <pre className="bg-white p-2 rounded border border-blue-200 overflow-x-auto text-xs">
{`SectionID,SectionName,ItemNumber,ItemName,DefectType,Required
right_outside,Right Outside,,,,
,,1,Front fender surface,,Yes
,,,,Not installed properly,
,,,,Scratches,
,,2,Front fender leaf,,Yes
,,,,Not installed properly,`}
            </pre>
          </div>
        </div>

        {/* File Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {LANGUAGES.map(lang => (
            <div key={lang} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">
                  {LANGUAGE_NAMES[lang]}
                  {lang === 'en' && <span className="text-red-500 ml-1">*</span>}
                </h4>
                {uploadedFiles.has(lang) && (
                  <span className="text-green-600 text-xs">✓ Uploaded</span>
                )}
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(lang, e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              {uploadedFiles.has(lang) && (
                <p className="text-xs text-gray-500 mt-2 truncate">
                  {uploadedFiles.get(lang)!.name}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={isUploading || uploadedFiles.size === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Processing...' : 'Upload and Save Checklist'}
          </button>

          {uploadedFiles.size > 0 && (
            <button
              onClick={() => setUploadedFiles(new Map())}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Status Message */}
        {uploadStatus && (
          <div className={`mt-4 p-4 rounded-lg ${
            uploadStatus.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
            uploadStatus.startsWith('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Download the current template in English to use as a reference</li>
          <li>Create CSV files for each language (English is required, others optional)</li>
          <li>Upload all CSV files - they will be validated for matching structure</li>
          <li>The system will create a multilingual template automatically</li>
          <li>Workers will see the checklist in their selected language</li>
          <li>Missing translations will fall back to English automatically</li>
        </ol>
      </div>
    </div>
  );
}
