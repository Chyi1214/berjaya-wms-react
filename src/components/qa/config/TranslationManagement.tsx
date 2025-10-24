// Translation Management - Upload single-language translation patches
import { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import { checklistCSVService, LANGUAGE_NAMES } from '../../../services/checklistCSVService';
import type { InspectionTemplate, LanguageCode, TranslationStatus } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { useAuth } from '../../../contexts/AuthContext';

const logger = createModuleLogger('TranslationManagement');

const TRANSLATION_LANGUAGES: LanguageCode[] = ['ms', 'zh', 'my', 'bn'];

export default function TranslationManagement() {
  const { user } = useAuth();
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('ms');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [englishUploadFile, setEnglishUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const tmpl = await inspectionService.getTemplate('vehicle_inspection_v1');
      if (tmpl) {
        setTemplate(tmpl);
      } else {
        setMessage({ type: 'error', text: 'Template not found' });
      }
    } catch (error) {
      logger.error('Failed to load template:', error);
      setMessage({ type: 'error', text: 'Failed to load template' });
    } finally {
      setLoading(false);
    }
  };

  const getTranslationStatus = (language: LanguageCode): TranslationStatus => {
    if (!template?.translations?.[language]) {
      return 'missing';
    }
    return template.translations[language].status;
  };

  const getStatusIcon = (status: TranslationStatus) => {
    switch (status) {
      case 'synced':
        return '✅';
      case 'outdated':
        return '⚠️';
      case 'missing':
        return '❌';
    }
  };

  const getStatusText = (status: TranslationStatus) => {
    switch (status) {
      case 'synced':
        return 'Synced';
      case 'outdated':
        return 'Outdated';
      case 'missing':
        return 'Not Uploaded';
    }
  };

  const getStatusColor = (status: TranslationStatus) => {
    switch (status) {
      case 'synced':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'outdated':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'missing':
        return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  const handleDownloadSample = (language: LanguageCode) => {
    if (!template) {
      setMessage({ type: 'error', text: 'No template loaded' });
      return;
    }

    try {
      const csv = checklistCSVService.exportToCSV(template, language);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inspection_template_${language}_sample.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `✅ Downloaded ${LANGUAGE_NAMES[language]} sample` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to download sample:', error);
      setMessage({ type: 'error', text: 'Failed to download sample' });
    }
  };

  const handleFileSelect = (file: File | null) => {
    setUploadFile(file);
    setValidationErrors([]);
    setMessage(null);
  };

  const handleUploadPatch = async () => {
    if (!uploadFile || !template) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    try {
      setUploading(true);
      setValidationErrors([]);
      setMessage({ type: 'info', text: 'Validating translation...' });

      // Parse the CSV
      const content = await uploadFile.text();
      const parsedData = checklistCSVService.parseCSV(content, selectedLanguage);

      // Validate against English master
      const validation = checklistCSVService.validateTranslationPatch(
        template,
        parsedData,
        selectedLanguage
      );

      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setMessage({
          type: 'error',
          text: `❌ Validation failed: Translation does not match English template structure`
        });
        return;
      }

      setMessage({ type: 'info', text: 'Applying translation patch...' });

      // Apply the translation patch
      const updatedTemplate = checklistCSVService.applyTranslationPatch(
        template,
        parsedData,
        selectedLanguage,
        user?.email
      );

      // Save to database
      await inspectionService.createTemplate(updatedTemplate);

      setMessage({
        type: 'success',
        text: `✅ ${LANGUAGE_NAMES[selectedLanguage]} translation uploaded successfully!`
      });

      // Reload template
      await loadTemplate();

      // Clear form
      setUploadFile(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      logger.error('Failed to upload translation:', error);
      setMessage({
        type: 'error',
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadEnglishCSV = async () => {
    if (!englishUploadFile || !template) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    // Show confirmation dialog
    const confirmMessage =
      'WARNING: Uploading a new English template will DELETE ALL existing language translations!\n\n' +
      'All translation patches will be removed and you will need to re-upload them.\n\n' +
      'Are you sure you want to continue?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUploading(true);
      setValidationErrors([]);
      setMessage({ type: 'info', text: 'Parsing English CSV...' });

      // Parse the CSV for English
      const content = await englishUploadFile.text();
      const parsedData = checklistCSVService.parseCSV(content, 'en');

      setMessage({ type: 'info', text: 'Applying new English template...' });

      // Convert parsed data to template format
      const newTemplate = checklistCSVService.convertToTemplate(parsedData, template.templateId);

      // Delete all translation metadata (fresh start)
      const updatedTemplate: InspectionTemplate = {
        ...newTemplate,
        version: template.version, // Keep existing version
        createdAt: template.createdAt,
        updatedAt: new Date(),
        isMultilingual: true, // Enable multilingual support
        translations: {} // Clear all translations
      };

      // Save to database
      await inspectionService.createTemplate(updatedTemplate);

      setMessage({
        type: 'success',
        text: '✅ New English template uploaded successfully! All language patches have been deleted.'
      });

      // Reload template
      await loadTemplate();

      // Clear form
      setEnglishUploadFile(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      logger.error('Failed to upload English template:', error);
      setMessage({
        type: 'error',
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading template...</div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800">Template not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* English Template Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">English Template (Master)</h3>
        <div className="mb-4">
          <div className="text-sm text-gray-600">Last Updated</div>
          <div className="text-lg font-semibold text-gray-900">
            {new Date(template.updatedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleDownloadSample('en')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📄 Download English Sample
          </button>
        </div>
      </div>

      {/* Upload New English Template (CSV) */}
      <div className="bg-white rounded-lg shadow p-6 border-2 border-orange-200">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-xl font-bold text-orange-900 mb-1">Upload New English Template (CSV)</h3>
            <p className="text-sm text-orange-800">
              Warning: This will DELETE all existing language translations! Use for bulk imports only.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select English CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setEnglishUploadFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
            {englishUploadFile && (
              <p className="text-sm text-gray-500 mt-2">Selected: {englishUploadFile.name}</p>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex gap-2">
            <button
              onClick={handleUploadEnglishCSV}
              disabled={!englishUploadFile || uploading}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
            >
              {uploading ? 'Uploading...' : '⬆️ Upload New English Template'}
            </button>
            {englishUploadFile && (
              <button
                onClick={() => setEnglishUploadFile(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Translation Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Translation Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRANSLATION_LANGUAGES.map((lang) => {
            const status = getTranslationStatus(lang);
            const metadata = template.translations?.[lang];

            return (
              <div
                key={lang}
                className={`border rounded-lg p-4 ${getStatusColor(status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatusIcon(status)}</span>
                    <div>
                      <div className="font-semibold">{LANGUAGE_NAMES[lang]}</div>
                      <div className="text-sm">{getStatusText(status)}</div>
                    </div>
                  </div>
                </div>

                {metadata && (
                  <div className="mt-2 text-sm">
                    <div>Updated: {new Date(metadata.lastUpdated).toLocaleDateString()}</div>
                    {metadata.uploadedBy && (
                      <div className="text-xs mt-1">By: {metadata.uploadedBy}</div>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <button
                    onClick={() => handleDownloadSample(lang)}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    📄 Download Sample
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Translation Patch */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Translation Patch</h3>

        <div className="space-y-4">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {TRANSLATION_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_NAMES[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Translation CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadFile && (
              <p className="text-sm text-gray-500 mt-2">Selected: {uploadFile.name}</p>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex gap-2">
            <button
              onClick={handleUploadPatch}
              disabled={!uploadFile || uploading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
            >
              {uploading ? 'Uploading...' : '⬆️ Upload & Validate'}
            </button>
            {uploadFile && (
              <button
                onClick={() => handleFileSelect(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="font-semibold text-red-900 mb-2">Validation Errors:</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">How Translation Patches Work</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Download the sample CSV for your language (shows current structure)</li>
          <li>Translate the text in your CSV (keep structure identical to English)</li>
          <li>Upload your translation - it will be validated against the English template</li>
          <li>If validation passes, the translation is applied and marked as "Synced"</li>
          <li>If English template is updated later, your translation will be marked "Outdated"</li>
          <li>Workers will see English text until you upload an updated translation</li>
        </ol>
      </div>
    </div>
  );
}
