// QA Inspection Dashboard - Main entry point for car inspection
import React, { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type { InspectionSection } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { BarcodeScanner } from '../../common/BarcodeScanner';
import { useLanguage } from '../../../contexts/LanguageContext';

const logger = createModuleLogger('QAInspectionDashboard');

interface QAInspectionDashboardProps {
  userEmail: string;
  userName: string;
  onStartInspection: (inspectionId: string, vin: string, section: InspectionSection) => void;
}

const QAInspectionDashboard: React.FC<QAInspectionDashboardProps> = ({
  userEmail,
  userName: _userName, // Prefix with _ to indicate intentionally unused
  onStartInspection,
}) => {
  const { t } = useLanguage();
  const [selectedSection, setSelectedSection] = useState<InspectionSection | null>(null);
  const [vinInput, setVinInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // No data needs to be preloaded - just mark as ready
      logger.info('Dashboard ready');
    } catch (err) {
      logger.error('Failed to initialize:', err);
      setError('Failed to initialize. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = (section: InspectionSection) => {
    setSelectedSection(section);
    setError(null);
  };

  // Validate VIN format
  const validateVIN = (vin: string): { valid: boolean; error?: string } => {
    // VIN must be exactly 17 characters
    if (vin.length !== 17) {
      return { valid: false, error: `Invalid VIN length: ${vin.length}/17 characters` };
    }

    // VIN must start with "PRU"
    if (!vin.startsWith('PRU')) {
      return { valid: false, error: 'Invalid VIN: must start with "PRU"' };
    }

    // VIN can only contain A-Z and 0-9, excluding I, O, Q
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vin)) {
      return { valid: false, error: 'Invalid VIN characters (must be A-Z, 0-9, excluding I, O, Q)' };
    }

    return { valid: true };
  };

  const handleBarcodeScan = async (code: string) => {
    setShowScanner(false);

    // Clean and validate the scanned code
    const cleanVin = code.trim().toUpperCase();

    // Validate VIN format
    const validation = validateVIN(cleanVin);
    if (!validation.valid) {
      setError(validation.error || 'Invalid VIN format');
      return;
    }

    setVinInput(cleanVin);
    await handleScanVIN(cleanVin);
  };

  const handleScanVIN = async (vin?: string) => {
    const vinToScan = vin || vinInput.trim().toUpperCase();

    if (!vinToScan) {
      setError('Please enter a VIN number');
      return;
    }

    // Validate VIN format
    const validation = validateVIN(vinToScan);
    if (!validation.valid) {
      setError(validation.error || 'Invalid VIN format');
      return;
    }

    if (!selectedSection) {
      setError('Please select your inspection position first');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const vinUpper = vinToScan.toUpperCase();
      logger.info('Scanning VIN:', { vin: vinUpper, section: selectedSection, user: userEmail });

      // Ensure template exists (auto-create if needed)
      const { loadDefaultTemplate } = await import('../../../services/inspectionTemplateLoader');
      await loadDefaultTemplate();

      // Check if inspection already exists
      let inspection = await inspectionService.getInspectionByVIN(vinUpper);

      if (!inspection) {
        // Create new inspection
        const inspectionId = await inspectionService.createInspection(
          vinUpper,
          'vehicle_inspection_v1'
        );
        inspection = await inspectionService.getInspectionById(inspectionId);
      }

      if (inspection) {
        onStartInspection(inspection.inspectionId, vinUpper, selectedSection);
      }
    } catch (err: any) {
      logger.error('Failed to scan VIN:', err);
      setError('Failed to start inspection. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const getSectionName = (section: InspectionSection): string => {
    const names: Record<string, string> = {
      right_outside: t('qa.sections.rightOutside'),
      left_outside: t('qa.sections.leftOutside'),
      front_back: t('qa.sections.frontBack'),
      interior_right: t('qa.sections.interiorRight'),
      interior_left: t('qa.sections.interiorLeft'),
    };
    return names[section] || section;
  };

  const getSectionIcon = (section: InspectionSection): string => {
    const icons: Record<string, string> = {
      right_outside: '🚗',
      left_outside: '🚙',
      front_back: '🚕',
      interior_right: '🪟',
      interior_left: '🛋️',
    };
    return icons[section] || '📋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">{t('qa.loading')}</div>
        </div>
      </div>
    );
  }

  const sections: InspectionSection[] = [
    'right_outside',
    'left_outside',
    'front_back',
    'interior_right',
    'interior_left',
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('qa.carInspection')}
        </h1>
        <p className="text-gray-600">
          {t('qa.selectPositionAndScan')}
        </p>
      </div>

      {/* Step 1: Select Position */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('qa.step')} 1: {t('qa.selectYourPosition')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => handleSectionSelect(section)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedSection === section
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getSectionIcon(section)}</div>
                <div className="text-left">
                  <div className="font-semibold">{getSectionName(section)}</div>
                  <div className="text-sm text-gray-600">
                    {section === 'right_outside' || section === 'left_outside'
                      ? `28 ${t('qa.points')}`
                      : section === 'front_back'
                      ? `28 ${t('qa.points')}`
                      : `~27 ${t('qa.points')}`}
                  </div>
                </div>
                {selectedSection === section && (
                  <div className="ml-auto text-blue-600 text-xl">✓</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Scan VIN */}
      {selectedSection && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('qa.step')} 2: {t('qa.scanVINNumber')}
          </h2>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>{t('qa.position')}:</strong> {getSectionName(selectedSection)} {getSectionIcon(selectedSection)}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleScanVIN()}
                placeholder={t('qa.enterVINOrUseScanner')}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                autoFocus
              />
              <button
                onClick={() => handleScanVIN()}
                disabled={scanning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {scanning ? t('qa.loading') : t('qa.start')}
              </button>
            </div>

            <button
              onClick={() => setShowScanner(true)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <span className="text-xl">📷</span>
              {t('qa.openCameraScanner')}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            💡 <strong>{t('qa.tip')}:</strong> {t('qa.tipText')}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">{t('qa.instructions')}</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>1. {t('qa.instructionsList.step1')}</li>
          <li>2. {t('qa.instructionsList.step2')}</li>
          <li>3. {t('qa.instructionsList.step3')}</li>
          <li>4. {t('qa.instructionsList.step4')}</li>
        </ol>
      </div>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('qa.scanVINBarcode')}</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onError={(err) => {
                  setError(err);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QAInspectionDashboard;
