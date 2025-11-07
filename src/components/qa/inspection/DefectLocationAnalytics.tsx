// Defect Location Analytics - Heatmap showing aggregated defect locations across cars
import React, { useState, useEffect, useRef } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import { gateService } from '../../../services/gateService';
import type {
  CarInspection,
  InspectionTemplate,
  InspectionSection,
  DefectLocation,
  SectionImage,
} from '../../../types/inspection';
import type { QAGate } from '../../../types/gate';
import { createModuleLogger } from '../../../services/logger';

const logger = createModuleLogger('DefectLocationAnalytics');

interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number; // 0-1, where 1 is most frequent
  count: number;
}

export const DefectLocationAnalytics: React.FC = () => {
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [inspections, setInspections] = useState<CarInspection[]>([]);
  const [gates, setGates] = useState<QAGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<InspectionSection>('right_outside');
  const [selectedImage, setSelectedImage] = useState<SectionImage | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default: last 30 days
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedDefectType, setSelectedDefectType] = useState<string>('all');
  const [selectedGate, setSelectedGate] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (template && selectedSection) {
      const sectionTemplate = template.sections[selectedSection];
      if (sectionTemplate?.images && sectionTemplate.images.length > 0) {
        setSelectedImage(sectionTemplate.images[0]);
      } else {
        setSelectedImage(null);
      }
    }
  }, [template, selectedSection]);

  useEffect(() => {
    if (selectedImage && inspections.length > 0) {
      drawHeatmap();
    }
  }, [selectedImage, inspections, selectedDefectType, selectedGate, selectedBatch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tmpl, allInspections, allGates] = await Promise.all([
        inspectionService.getTemplate('vehicle_inspection_v1'),
        inspectionService.getAllInspections(),
        gateService.getAllGates(),
      ]);

      setTemplate(tmpl);
      setInspections(allInspections.filter(insp => insp.status === 'completed'));
      setGates(allGates);
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredDefectLocations = (): DefectLocation[] => {
    const filtered = inspections.filter(insp => {
      // Date filter
      const createdAt = new Date(insp.createdAt);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0); // Start of day
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999); // End of day
      if (createdAt < from || createdAt > to) return false;

      // Gate filter
      if (selectedGate !== 'all' && insp.gateId !== selectedGate) return false;

      // Batch filter
      if (selectedBatch !== 'all' && insp.batchId !== selectedBatch) return false;

      return true;
    });

    const locations: DefectLocation[] = [];
    let totalDefectsInSection = 0;
    let defectsWithLocation = 0;
    let defectsOnThisImage = 0;

    filtered.forEach(inspection => {
      const sectionResult = inspection.sections[selectedSection];
      if (!sectionResult) return;

      Object.values(sectionResult.results).forEach(result => {
        // Count main defect
        if (result.defectType === 'Ok') return;
        totalDefectsInSection++;

        if (!result.defectLocation) return;
        defectsWithLocation++;

        if (result.defectLocation.imageId !== selectedImage?.imageId) return;
        defectsOnThisImage++;

        if (selectedDefectType !== 'all' && result.defectType !== selectedDefectType) return;

        locations.push(result.defectLocation);

        // Count and collect additional defects (backwards compatibility: treat undefined as empty array)
        const additionalDefects = result.additionalDefects || [];
        additionalDefects.forEach(additionalDefect => {
          totalDefectsInSection++;

          if (!additionalDefect.defectLocation) return;
          defectsWithLocation++;

          if (additionalDefect.defectLocation.imageId !== selectedImage?.imageId) return;
          defectsOnThisImage++;

          if (selectedDefectType !== 'all' && additionalDefect.defectType !== selectedDefectType) return;

          locations.push(additionalDefect.defectLocation);
        });
      });
    });

    logger.debug('Heat map data:', {
      totalInspections: filtered.length,
      totalDefectsInSection,
      defectsWithLocation,
      defectsOnThisImage,
      afterTypeFilter: locations.length,
      selectedImage: selectedImage?.imageName,
      selectedImageId: selectedImage?.imageId,
    });

    return locations;
  };

  const drawHeatmap = () => {
    if (!canvasRef.current || !selectedImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate canvas size maintaining aspect ratio
      const maxWidth = 1200;
      const maxHeight = 800;
      let canvasWidth = img.width;
      let canvasHeight = img.height;

      // Scale down if larger than max dimensions
      if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
        const widthRatio = maxWidth / canvasWidth;
        const heightRatio = maxHeight / canvasHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        canvasWidth = canvasWidth * ratio;
        canvasHeight = canvasHeight * ratio;
      }

      // Set canvas size to match scaled image dimensions
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw base image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get defect locations
      const locations = getFilteredDefectLocations();

      if (locations.length === 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No defects found for selected filters', canvas.width / 2, canvas.height / 2);
        return;
      }

      // Group nearby points (within 5% radius)
      const groupRadius = 5; // 5% of image
      const heatmapPoints: HeatmapPoint[] = [];

      locations.forEach(location => {
        // Check if this location is close to an existing point
        let foundNearby = false;
        for (const point of heatmapPoints) {
          const distance = Math.sqrt(
            Math.pow(location.x - point.x, 2) + Math.pow(location.y - point.y, 2)
          );
          if (distance < groupRadius) {
            point.count++;
            foundNearby = true;
            break;
          }
        }

        if (!foundNearby) {
          heatmapPoints.push({
            x: location.x,
            y: location.y,
            count: 1,
            intensity: 0, // Will be calculated later
          });
        }
      });

      // Calculate intensity (normalize to 0-1)
      const maxCount = Math.max(...heatmapPoints.map(p => p.count));
      heatmapPoints.forEach(point => {
        point.intensity = point.count / maxCount;
      });

      // Draw heatmap circles
      heatmapPoints.forEach(point => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / 100) * canvas.height;
        const radius = 30 + (point.intensity * 40); // 30-70px based on intensity

        // Create radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

        // Color based on intensity: green (low) -> yellow (medium) -> red (high)
        if (point.intensity < 0.3) {
          gradient.addColorStop(0, `rgba(34, 197, 94, ${0.7 * point.intensity})`); // Green
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
        } else if (point.intensity < 0.7) {
          gradient.addColorStop(0, `rgba(234, 179, 8, ${0.7 * point.intensity})`); // Yellow
          gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
        } else {
          gradient.addColorStop(0, `rgba(239, 68, 68, ${0.7 * point.intensity})`); // Red
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw count label
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = `bold ${16 + (point.intensity * 8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(point.count.toString(), x, y);
        ctx.fillText(point.count.toString(), x, y);
      });
    };

    img.src = selectedImage.imageUrl;
  };

  const getAvailableDefectTypes = (): string[] => {
    const types = new Set<string>();
    inspections.forEach(inspection => {
      const sectionResult = inspection.sections[selectedSection];
      if (!sectionResult) return;

      Object.values(sectionResult.results).forEach(result => {
        if (result.defectType !== 'Ok' && result.defectLocation) {
          types.add(result.defectType);
        }
      });
    });

    return Array.from(types).sort();
  };

  const getAvailableBatches = (): string[] => {
    const batches = new Set<string>();
    inspections.forEach(inspection => {
      if (inspection.batchId) {
        batches.add(inspection.batchId);
      }
    });
    return Array.from(batches).sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading analytics...</div>
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

  const sectionKeys: InspectionSection[] = ['right_outside', 'left_outside', 'front_back', 'interior_right', 'interior_left'];
  const defectTypes = getAvailableDefectTypes();
  const availableBatches = getAvailableBatches();

  // Get detailed stats for debugging
  const getDetailedStats = () => {
    let totalDefectsInSection = 0;
    let defectsWithLocation = 0;
    let defectsOnCurrentImage = 0;

    inspections.forEach(inspection => {
      const sectionResult = inspection.sections[selectedSection];
      if (!sectionResult) return;

      Object.values(sectionResult.results).forEach(result => {
        if (result.defectType === 'Ok') return;
        totalDefectsInSection++;

        if (result.defectLocation) {
          defectsWithLocation++;

          if (result.defectLocation.imageId === selectedImage?.imageId) {
            defectsOnCurrentImage++;
          }
        }
      });
    });

    return {
      totalDefectsInSection,
      defectsWithLocation,
      defectsOnCurrentImage,
      filteredDefects: getFilteredDefectLocations().length,
    };
  };

  const stats = getDetailedStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📊</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Defect Location Analytics</h2>
            <p className="text-gray-600">Aggregated defect heatmap across multiple inspections</p>
          </div>
        </div>

        {/* Filters Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Section Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value as InspectionSection)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {sectionKeys.map(sectionKey => {
                const sectionTemplate = template.sections[sectionKey];
                const hasImages = sectionTemplate?.images && sectionTemplate.images.length > 0;
                const sectionName = typeof sectionTemplate?.sectionName === 'string'
                  ? sectionTemplate.sectionName
                  : (sectionTemplate?.sectionName as any)?.en || sectionKey;
                return (
                  <option key={sectionKey} value={sectionKey} disabled={!hasImages}>
                    {sectionName} {!hasImages && '(No images)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Defect Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Defect Type</label>
            <select
              value={selectedDefectType}
              onChange={(e) => setSelectedDefectType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Defects</option>
              {defectTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Row 2 - Gate and Batch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gate Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gate</label>
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Gates</option>
              {gates.map(gate => (
                <option key={gate.gateId} value={gate.gateId}>
                  {gate.gateName} (Gate {gate.gateIndex})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Batches</option>
              {availableBatches.map(batch => (
                <option key={batch} value={batch}>{batch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">Total Inspections:</span>
            <span className="ml-2 font-bold text-blue-600">{inspections.length}</span>
          </div>
          <div className="bg-purple-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">Defects in Section:</span>
            <span className="ml-2 font-bold text-purple-600">{stats.totalDefectsInSection}</span>
          </div>
          <div className="bg-yellow-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">With Location Marked:</span>
            <span className="ml-2 font-bold text-yellow-700">{stats.defectsWithLocation}</span>
          </div>
          <div className="bg-orange-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">On Current Image:</span>
            <span className="ml-2 font-bold text-orange-600">{stats.defectsOnCurrentImage}</span>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600">After Filters:</span>
            <span className="ml-2 font-bold text-red-600">{stats.filteredDefects}</span>
          </div>
        </div>

        {/* Help Message */}
        {stats.totalDefectsInSection > 0 && stats.defectsWithLocation === 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm text-amber-900 font-medium">No location data found</p>
                <p className="text-xs text-amber-700 mt-1">
                  To see the heat map, defects need to have their locations marked on images.
                  When inspecting, tap on the car image to mark where each defect is located.
                </p>
              </div>
            </div>
          </div>
        )}

        {stats.defectsWithLocation > 0 && stats.defectsOnCurrentImage === 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm text-amber-900 font-medium">Defects marked on other images</p>
                <p className="text-xs text-amber-700 mt-1">
                  There are {stats.defectsWithLocation} defects with locations, but they're marked on different images in this section.
                  Try selecting a different section or check which images were used during inspection.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Canvas */}
      {selectedImage ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Defect Heatmap - {selectedImage.imageName}
          </h3>

          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: '600px' }}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Low Frequency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-600">Medium Frequency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600">High Frequency</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-yellow-800">
            ⚠️ No images available for this section. Please upload section images in the Visual Template Editor.
          </div>
        </div>
      )}
    </div>
  );
};
