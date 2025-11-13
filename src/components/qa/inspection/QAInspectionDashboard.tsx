// QA Inspection Dashboard - Main entry point for car inspection
import React, { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import { gateService } from '../../../services/gateService';
import type { InspectionSection, InspectionTemplate } from '../../../types/inspection';
import type { QAGate } from '../../../types/gate';
import { createModuleLogger } from '../../../services/logger';
import { BarcodeScanner } from '../../common/BarcodeScanner';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { UserRole } from '../../../types/user';

const logger = createModuleLogger('QAInspectionDashboard');

interface QAInspectionDashboardProps {
  userEmail: string;
  onStartInspection: (inspectionId: string, vin: string, section: InspectionSection) => void;
}

const QAInspectionDashboard: React.FC<QAInspectionDashboardProps> = ({
  userEmail,
  onStartInspection,
}) => {
  const { t } = useLanguage();
  const { userRecord } = useAuth();
  const [selectedSection, setSelectedSection] = useState<InspectionSection | null>(null);
  const [selectedGate, setSelectedGate] = useState<QAGate | null>(null);
  const [gates, setGates] = useState<QAGate[]>([]);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [vinInput, setVinInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pre-VIN gate mode: 'inspection' or 'link'
  const [preVinMode, setPreVinMode] = useState<'inspection' | 'link' | null>(null);
  const [bodyCodeInput, setBodyCodeInput] = useState('');
  const [vinForLinking, setVinForLinking] = useState('');
  const [linkingStep, setLinkingStep] = useState<'vin' | 'bodycode'>('vin');
  const [unlinkedCount, setUnlinkedCount] = useState<number>(0);
  const [loadingUnlinkedCount, setLoadingUnlinkedCount] = useState(false);

  useEffect(() => {
    loadData();
  }, [userEmail]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load active gates
      const activeGates = await gateService.getActiveGates();

      // Filter gates based on user assignments
      const isManager = userRecord?.role === UserRole.MANAGER || userRecord?.role === UserRole.DEV_ADMIN;
      let availableGates = activeGates;

      if (!isManager) {
        // Filter to only gates assigned to this user
        const assignedGates = activeGates.filter(gate =>
          gate.assignedUsers && gate.assignedUsers.includes(userEmail.toLowerCase())
        );

        // If user has assigned gates, use them; otherwise show all (unassigned workers)
        if (assignedGates.length > 0) {
          availableGates = assignedGates;
        }
      }

      setGates(availableGates);

      // Load template to get section order
      const tmpl = await inspectionService.getTemplate('vehicle_inspection_v1');
      setTemplate(tmpl);

      // Auto-select if only one gate available
      if (availableGates.length === 1) {
        setSelectedGate(availableGates[0]);
      }

      logger.info('Dashboard ready', {
        totalGates: activeGates.length,
        availableGates: availableGates.length,
        isManager,
        userEmail
      });
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

  const loadUnlinkedCount = async (gateId: string) => {
    try {
      setLoadingUnlinkedCount(true);
      const allInspections = await inspectionService.getAllInspections();
      const unlinked = allInspections.filter(
        (inspection) =>
          inspection.gateId === gateId &&
          inspection.isBodyCodeInspection === true
      );
      setUnlinkedCount(unlinked.length);
    } catch (err) {
      logger.error('Failed to load unlinked count:', err);
      setUnlinkedCount(0);
    } finally {
      setLoadingUnlinkedCount(false);
    }
  };

  const handleGateSelect = (gate: QAGate) => {
    setSelectedGate(gate);
    setPreVinMode(null);
    setError(null);

    // Load unlinked count for pre-VIN gates
    if (gate.isPreVinGate) {
      loadUnlinkedCount(gate.gateId);
    }
  };

  const handlePreVinModeSelect = (mode: 'inspection' | 'link') => {
    setPreVinMode(mode);
    setError(null);
    if (mode === 'link') {
      setLinkingStep('vin');
      setVinForLinking('');
      setBodyCodeInput('');
    } else {
      setBodyCodeInput('');
    }
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

    // For pre-VIN gates in inspection mode, accept any code
    if (selectedGate?.isPreVinGate && preVinMode === 'inspection') {
      const cleanCode = code.trim();
      setBodyCodeInput(cleanCode);
      await handleScanBodyCode();
      return;
    }

    // For pre-VIN gates in link mode
    if (selectedGate?.isPreVinGate && preVinMode === 'link') {
      if (linkingStep === 'vin') {
        // Scanning VIN in link mode
        const cleanVin = code.trim().toUpperCase();
        const validation = validateVIN(cleanVin);
        if (!validation.valid) {
          setError(validation.error || 'Invalid VIN format');
          return;
        }
        setVinForLinking(cleanVin);
        setLinkingStep('bodycode');
        setError(null);
        return;
      } else {
        // Scanning body code in link mode
        const cleanCode = code.trim();
        setBodyCodeInput(cleanCode);
        return;
      }
    }

    // Regular VIN scanning for normal gates
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

    if (!selectedGate) {
      setError('Please select a gate first');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const vinUpper = vinToScan.toUpperCase();
      logger.info('Scanning VIN:', {
        vin: vinUpper,
        section: selectedSection,
        gate: selectedGate.gateName,
        user: userEmail,
      });

      // Ensure template exists (auto-create if needed)
      const { loadDefaultTemplate } = await import('../../../services/inspectionTemplateLoader');
      await loadDefaultTemplate();

      // Check if inspection already exists for this VIN+Gate combination
      // Each gate has independent inspections for the same car
      let inspection = await inspectionService.getInspectionByVINAndGate(vinUpper, selectedGate.gateId);

      if (!inspection) {
        // Create new inspection with gate info
        const inspectionId = await inspectionService.createInspection(
          vinUpper,
          'vehicle_inspection_v1',
          undefined, // batchId - will be added later
          {
            gateId: selectedGate.gateId,
            gateIndex: selectedGate.gateIndex,
            gateName: selectedGate.gateName,
          }
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

  // Handle body code inspection (pre-VIN gate, inspection mode)
  const handleScanBodyCode = async () => {
    const bodyCode = bodyCodeInput.trim();

    if (!bodyCode) {
      setError('Please enter a body code');
      return;
    }

    if (!selectedSection) {
      setError('Please select your inspection position first');
      return;
    }

    if (!selectedGate) {
      setError('Please select a gate first');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      logger.info('Scanning body code:', {
        bodyCode,
        section: selectedSection,
        gate: selectedGate.gateName,
        user: userEmail,
      });

      // Ensure template exists
      const { loadDefaultTemplate } = await import('../../../services/inspectionTemplateLoader');
      await loadDefaultTemplate();

      // Check if inspection exists for this body code + gate
      let inspection = await inspectionService.getInspectionByBodyCodeAndGate(bodyCode, selectedGate.gateId);

      if (!inspection) {
        // Create new body code inspection
        const inspectionId = await inspectionService.createBodyCodeInspection(
          bodyCode,
          'vehicle_inspection_v1',
          {
            gateId: selectedGate.gateId,
            gateIndex: selectedGate.gateIndex,
            gateName: selectedGate.gateName,
          }
        );
        inspection = await inspectionService.getInspectionById(inspectionId);
      }

      if (inspection) {
        onStartInspection(inspection.inspectionId, bodyCode, selectedSection);
      }
    } catch (err: any) {
      logger.error('Failed to scan body code:', err);
      setError('Failed to start inspection. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // Handle linking VIN to body code (pre-VIN gate, link mode)
  const handleLinkBodyCodeToVIN = async () => {
    if (linkingStep === 'vin') {
      // First step: validate and store VIN
      const vin = vinForLinking.trim().toUpperCase();
      const validation = validateVIN(vin);

      if (!validation.valid) {
        setError(validation.error || 'Invalid VIN format');
        return;
      }

      setVinForLinking(vin);
      setLinkingStep('bodycode');
      setError(null);
      return;
    }

    // Second step: link body code to VIN
    const bodyCode = bodyCodeInput.trim();
    if (!bodyCode) {
      setError('Please enter a body code');
      return;
    }

    if (!selectedGate) {
      setError('Please select a gate first');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      logger.info('Linking body code to VIN:', {
        vin: vinForLinking,
        bodyCode,
        gate: selectedGate.gateName,
        user: userEmail,
      });

      await inspectionService.linkBodyCodeToVIN(
        bodyCode,
        vinForLinking,
        selectedGate.gateId,
        userEmail
      );

      // Reset linking state
      setVinForLinking('');
      setBodyCodeInput('');
      setLinkingStep('vin');
      setError(null);

      // Show success message
      alert(`✅ Successfully linked body code "${bodyCode}" to VIN "${vinForLinking}"`);

      // Reload unlinked count
      if (selectedGate) {
        await loadUnlinkedCount(selectedGate.gateId);
      }

      // Reset to mode selection
      setPreVinMode(null);
    } catch (err: any) {
      logger.error('Failed to link body code:', err);
      setError(err.message || 'Failed to link body code. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const getSectionName = (section: InspectionSection): string => {
    // If template is loaded, use the section name from template (supports custom names)
    if (template && template.sections[section]) {
      const sectionData = template.sections[section];
      if (typeof sectionData.sectionName === 'string') {
        return sectionData.sectionName;
      } else {
        return sectionData.sectionName.en || section;
      }
    }

    // Fallback to translations
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

  const getSectionItemCount = (section: InspectionSection): number => {
    if (!template || !template.sections[section]) {
      return 0;
    }
    return template.sections[section].items.length;
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

  // Get section order from template (respects custom ordering)
  const getSectionOrder = (): InspectionSection[] => {
    if (!template) {
      // Fallback to default order if template not loaded
      return [
        'right_outside',
        'left_outside',
        'front_back',
        'interior_right',
        'interior_left',
      ];
    }

    // If custom sectionOrder exists, use it
    if (template.sectionOrder && template.sectionOrder.length > 0) {
      return template.sectionOrder as InspectionSection[];
    }

    // Otherwise, use default order
    const defaultOrder = [
      'right_outside',
      'left_outside',
      'front_back',
      'interior_right',
      'interior_left'
    ];

    return Object.keys(template.sections).sort((idA, idB) => {
      const indexA = defaultOrder.indexOf(idA);
      const indexB = defaultOrder.indexOf(idB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return idA.localeCompare(idB);
    }) as InspectionSection[];
  };

  const sections: InspectionSection[] = getSectionOrder();

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

      {/* Step 1: Select Gate */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('qa.step')} 1: Select QA Gate
        </h2>
        {gates.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⚠️ No gates configured. Please ask your manager to configure gates first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gates.map((gate) => (
              <button
                key={gate.gateId}
                onClick={() => handleGateSelect(gate)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedGate?.gateId === gate.gateId
                    ? 'border-purple-500 bg-purple-50 text-purple-900'
                    : 'border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🚪</div>
                  <div className="text-left flex-1">
                    <div className="font-semibold">{gate.gateName}</div>
                    <div className="text-xs text-gray-500">Gate {gate.gateIndex}</div>
                    {gate.isPreVinGate && (
                      <div className="text-xs text-purple-700 font-semibold mt-1">Pre-VIN Gate</div>
                    )}
                    {gate.description && (
                      <div className="text-xs text-gray-600 mt-1">{gate.description}</div>
                    )}
                  </div>
                  {selectedGate?.gateId === gate.gateId && (
                    <div className="text-purple-600 text-xl">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 1.5: Select Mode (Pre-VIN Gates Only) */}
      {selectedGate && selectedGate.isPreVinGate && !preVinMode && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('qa.step')} 2: Select Operation Mode
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handlePreVinModeSelect('inspection')}
              className="p-6 rounded-lg border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 transition-all"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-semibold text-blue-900 mb-2">Inspection</div>
                <div className="text-sm text-blue-700">
                  Scan body code and perform inspection
                </div>
              </div>
            </button>
            <button
              onClick={() => handlePreVinModeSelect('link')}
              className="p-6 rounded-lg border-2 border-green-300 bg-green-50 hover:bg-green-100 transition-all relative"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">🔗</div>
                <div className="font-semibold text-green-900 mb-2">Link Body Code to VIN</div>
                <div className="text-sm text-green-700">
                  Transfer inspections from body code to VIN
                </div>
                {loadingUnlinkedCount ? (
                  <div className="mt-3 text-xs text-green-600">Loading...</div>
                ) : unlinkedCount > 0 ? (
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
                      {unlinkedCount} unlinked inspection{unlinkedCount !== 1 ? 's' : ''} waiting
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-green-600">No unlinked inspections</div>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Position (Regular gates or Pre-VIN inspection mode) */}
      {selectedGate && (!selectedGate.isPreVinGate || preVinMode === 'inspection') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('qa.step')} 2: {t('qa.selectYourPosition')}
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
                      {getSectionItemCount(section)} {t('qa.points')}
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
      )}

      {/* Step 3a: Scan Body Code (Pre-VIN Inspection Mode) */}
      {selectedSection && selectedGate && selectedGate.isPreVinGate && preVinMode === 'inspection' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('qa.step')} 3: Scan Body Code
          </h2>
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
            <div className="text-sm text-purple-800">
              <strong>Gate:</strong> 🚪 {selectedGate.gateName} (Gate {selectedGate.gateIndex}) - Pre-VIN
            </div>
            <div className="text-sm text-purple-800">
              <strong>{t('qa.position')}:</strong> {getSectionName(selectedSection)} {getSectionIcon(selectedSection)}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={bodyCodeInput}
                onChange={(e) => setBodyCodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScanBodyCode()}
                placeholder="Enter body code or use scanner"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono"
                autoFocus
              />
              <button
                onClick={handleScanBodyCode}
                disabled={scanning}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {scanning ? t('qa.loading') : t('qa.start')}
              </button>
            </div>

            <button
              onClick={() => setShowScanner(true)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <span className="text-xl">📷</span>
              Open Camera Scanner
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
            💡 <strong>Note:</strong> This inspection will be tied to the body code until it's linked to a VIN.
          </div>
        </div>
      )}

      {/* Step 3b: Link Body Code to VIN (Pre-VIN Link Mode) */}
      {selectedGate && selectedGate.isPreVinGate && preVinMode === 'link' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('qa.step')} 2: Link Body Code to VIN
          </h2>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
            <div className="text-sm text-green-800">
              <strong>Gate:</strong> 🚪 {selectedGate.gateName} (Gate {selectedGate.gateIndex}) - Pre-VIN
            </div>
            <div className="text-sm text-green-800">
              <strong>Mode:</strong> 🔗 Link Body Code to VIN
            </div>
          </div>

          {linkingStep === 'vin' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Step 1: Enter VIN</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={vinForLinking}
                  onChange={(e) => setVinForLinking(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleLinkBodyCodeToVIN()}
                  placeholder="Enter VIN or use scanner"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-mono"
                  autoFocus
                />
                <button
                  onClick={handleLinkBodyCodeToVIN}
                  disabled={scanning}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Next
                </button>
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span className="text-xl">📷</span>
                Scan VIN with Camera
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <div className="text-sm text-green-800">
                  <strong>VIN:</strong> {vinForLinking}
                </div>
              </div>
              <h3 className="font-semibold text-gray-700">Step 2: Enter Body Code</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={bodyCodeInput}
                  onChange={(e) => setBodyCodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLinkBodyCodeToVIN()}
                  placeholder="Enter body code or use scanner"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-mono"
                  autoFocus
                />
                <button
                  onClick={handleLinkBodyCodeToVIN}
                  disabled={scanning}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {scanning ? 'Linking...' : 'Link'}
                </button>
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span className="text-xl">📷</span>
                Scan Body Code with Camera
              </button>
              <button
                onClick={() => setLinkingStep('vin')}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                ← Change VIN
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            💡 <strong>Note:</strong> All inspections associated with this body code at this gate will be transferred to the VIN.
          </div>
        </div>
      )}

      {/* Step 3c: Scan VIN (Regular Gates) */}
      {selectedSection && selectedGate && !selectedGate.isPreVinGate && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('qa.step')} 3: {t('qa.scanVINNumber')}
          </h2>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
            <div className="text-sm text-blue-800">
              <strong>Gate:</strong> 🚪 {selectedGate.gateName} (Gate {selectedGate.gateIndex})
            </div>
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
              <h3 className="text-lg font-semibold">
                {selectedGate?.isPreVinGate && preVinMode === 'inspection'
                  ? 'Scan Body Code'
                  : selectedGate?.isPreVinGate && preVinMode === 'link' && linkingStep === 'vin'
                  ? 'Scan VIN'
                  : selectedGate?.isPreVinGate && preVinMode === 'link' && linkingStep === 'bodycode'
                  ? 'Scan Body Code'
                  : t('qa.scanVINBarcode')}
              </h3>
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
