// Excel Translation Component - Translate Excel files from Chinese to English
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createModuleLogger } from '../../services/logger';

const logger = createModuleLogger('ExcelTranslation');

// Google Cloud Translation API endpoint
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';

export function ExcelTranslation() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file =>
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );

    if (validFiles.length === 0) {
      setError('Please select Excel files (.xlsx or .xls)');
      setFiles([]);
    } else if (validFiles.length > 10) {
      setError('Maximum 10 files allowed at once');
      setFiles([]);
    } else {
      setFiles(validFiles);
      setError(null);
    }
  };

  const isChinese = (text: string): boolean => {
    // Check if the text contains Chinese characters
    return /[\u4e00-\u9fa5]/.test(text);
  };

  const processExcel = async () => {
    if (files.length === 0) return;

    try {
      setProcessing(true);
      setError(null);

      // Get API key from environment
      const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        setError('Google Translate API key not configured. Please add VITE_GOOGLE_TRANSLATE_API_KEY to your .env file.');
        setProcessing(false);
        return;
      }

      // Process each file
      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        setProgress(`Processing file ${fileIdx + 1}/${files.length}: ${file.name}`);

        // Read the file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });

        // First pass: collect all Chinese text with their cell references
        const textsToTranslate: Array<{ sheetName: string; cellAddress: string; text: string; index: number }> = [];
        let textIndex = 0;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

          for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];

              if (cell && cell.t === 's' && cell.v && isChinese(cell.v)) {
                textsToTranslate.push({
                  sheetName,
                  cellAddress,
                  text: cell.v,
                  index: textIndex++,
                });
              }
            }
          }
        }

        if (textsToTranslate.length === 0) {
          logger.warn(`No Chinese text found in ${file.name}`);
          continue;
        }

        setProgress(`File ${fileIdx + 1}/${files.length}: Translating ${textsToTranslate.length} cells...`);

        // Batch translate all texts at once using Google Cloud Translation API
        const translations = new Map<number, string>();

        try {
          // Google Translate API supports batch translation (up to 128 texts per request)
          // We'll batch them in chunks of 100 to be safe
          const BATCH_SIZE = 100;
          let processedCount = 0;

          for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
            const batch = textsToTranslate.slice(i, i + BATCH_SIZE);
            const textsToTranslateAPI = batch.map(item => item.text);

            setProgress(`File ${fileIdx + 1}/${files.length}: Translating ${processedCount}/${textsToTranslate.length}...`);

            const response = await fetch(`${GOOGLE_TRANSLATE_API}?key=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                q: textsToTranslateAPI,
                source: 'zh-CN',
                target: 'en',
                format: 'text',
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Google Translate API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Map translations back to their indices
            batch.forEach((item, idx) => {
              const translatedText = data.data.translations[idx]?.translatedText;
              if (translatedText) {
                translations.set(item.index, translatedText);
              } else {
                translations.set(item.index, item.text); // Fallback to original
              }
            });

            processedCount += batch.length;
          }

          logger.info('Google Translate batch translation completed', {
            file: file.name,
            count: textsToTranslate.length,
            translated: translations.size
          });
        } catch (err) {
          logger.error('Google Translate API failed:', err);
          setError(`Translation failed for ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setProcessing(false);
          return;
        }

        setProgress(`File ${fileIdx + 1}/${files.length}: Applying translations...`);

        // Apply translations back to cells and ensure ALL cells have wrap text enabled
        let cellsTranslated = 0;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

          // Process all cells in the worksheet
          for (let row = range.s.r; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];

              if (cell) {
                // Initialize style if it doesn't exist
                if (!cell.s) {
                  cell.s = {};
                }
                if (!cell.s.alignment) {
                  cell.s.alignment = {};
                }

                // Enable text wrapping for ALL cells
                cell.s.alignment.wrapText = true;
              }
            }
          }
        }

        // Now apply translations
        for (const item of textsToTranslate) {
          const translation = translations.get(item.index);
          if (translation) {
            const worksheet = workbook.Sheets[item.sheetName];
            const cell = worksheet[item.cellAddress];
            if (cell) {
              // Update the cell value
              cell.v = translation;
              cellsTranslated++;
            }
          }
        }

        // Generate new file with all formatting preserved
        const newFileName = file.name.replace(/\.(xlsx|xls)$/, '_translated.xlsx');
        const wbout = XLSX.write(workbook, {
          bookType: 'xlsx',
          type: 'array',
          cellStyles: true,
        });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = newFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logger.info('Excel translation completed', {
          fileName: file.name,
          cellsTranslated,
          totalCells: textsToTranslate.length,
        });
      }

      setProgress(`All ${files.length} file(s) translated successfully!`);

      setTimeout(() => {
        setProgress('');
        setFiles([]);
      }, 3000);

    } catch (err) {
      logger.error('Excel processing failed:', err);
      setError('Failed to process Excel file. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📊</span>
            Excel Translation (Chinese → English)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload up to 10 Excel files with Chinese content to translate them to English
          </p>
        </div>

        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
                disabled={processing}
                multiple
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer block"
              >
                <div className="text-6xl mb-4">📁</div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {files.length > 0 ? `${files.length} file(s) selected` : 'Choose Excel Files'}
                </p>
                <p className="text-sm text-gray-600">
                  Click to select up to 10 .xlsx or .xls files
                </p>
              </label>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && !processing && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Size: {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Process Button */}
            {files.length > 0 && !processing && (
              <button
                onClick={processExcel}
                className="mt-6 w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>🌐</span>
                <span>Translate {files.length} File{files.length > 1 ? 's' : ''} to English</span>
              </button>
            )}

            {/* Processing Status */}
            {processing && (
              <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
                <p className="text-center text-gray-700 font-medium">
                  {progress}
                </p>
                <p className="text-center text-sm text-gray-500 mt-2">
                  Please wait... This may take a while depending on file size.
                </p>
              </div>
            )}

            {/* Success Message */}
            {progress && !processing && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-center text-green-800 font-medium">
                  ✓ {progress}
                </p>
                <p className="text-center text-sm text-green-600 mt-1">
                  The translated files have been downloaded to your device.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-center text-red-800 font-medium">
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">How it works:</h4>
              <ol className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Select up to 10 Excel files containing Chinese text</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Click "Translate to English" button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Wait for Google Translate to process all cells in all files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">4.</span>
                  <span>Download the translated files automatically</span>
                </li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                <strong>Note:</strong> Uses Google Cloud Translation API. Only cells with Chinese characters will be translated.
                All formatting, formulas, borders, and structure will be preserved. Text wrapping is enabled for all cells.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                <strong>Setup:</strong> Requires VITE_GOOGLE_TRANSLATE_API_KEY environment variable.
                Get your API key from Google Cloud Console → APIs & Services → Credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
