// Inspection Report Service - Generate PDF reports for car inspections
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import type { CarInspection, InspectionTemplate, InspectionSection, DefectLocation } from '../types/inspection';
import { inspectionService } from './inspectionService';
import { createModuleLogger } from './logger';
import { loadImageAsDataURL, getCacheStats } from './imageCache';

const logger = createModuleLogger('InspectionReportService');

// PDF Layout Constants
const PDF_CONSTANTS = {
  MARGIN_LEFT: 20,
  MARGIN_RIGHT: 20,
  PAGE_BOTTOM_LIMIT: 260,
  PAGE_TOP_START: 20,
  TITLE_FONT_SIZE: 18,
  HEADER_FONT_SIZE: 10,
  SECTION_FONT_SIZE: 10,
  FOOTER_FONT_SIZE: 8,
  LABEL_X: 20,
  VALUE_X_OFFSET: 22,
  BARCODE_X: 130,
  BARCODE_WIDTH: 60,
  BARCODE_HEIGHT: 10,
  IMAGE_WIDTH: 57,
  IMAGE_HEIGHT_RATIO: 600 / 800,
  IMAGES_PER_ROW: 3,
  IMAGE_SPACING: 5,
  INSPECTORS_PER_LINE: 3,
} as const;

// Standard section keys for car inspections
const SECTION_KEYS: InspectionSection[] = [
  'right_outside',
  'left_outside',
  'front_back',
  'interior_right',
  'interior_left',
];

// Helper: Format date for PDF display
function formatDateForPDF(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Helper: Get localized text or fallback to English
function getLocalizedText(text: string | { en: string; ms?: string; zh?: string; my?: string; bn?: string }): string {
  if (typeof text === 'string') {
    return text;
  }
  return text.en || '[No translation]';
}

// Helper: Generate barcode as Data URL
function generateBarcodeDataURL(text: string, width: number = 2, height: number = 40): string {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, text, {
    format: 'CODE128',
    width: width,
    height: height,
    displayValue: false, // Don't show text below barcode since we'll show VIN separately
    margin: 0,
  });
  return canvas.toDataURL('image/png');
}

// Helper: Draw dots on image canvas
// Accepts DefectLocation or extended version with pdfDotNumber
function drawDotsOnImage(
  imageDataURL: string,
  locations: (DefectLocation & { pdfDotNumber?: number })[],
  imageWidth: number,
  imageHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Add space above and below for numbers
      const numberAreaHeight = 80; // Space for numbers at top and bottom
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight + (numberAreaHeight * 2);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Fill background with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw original image in the middle (offset by top margin)
      const imageYOffset = numberAreaHeight;
      ctx.drawImage(img, 0, imageYOffset, imageWidth, imageHeight);

      // Draw dots with callout numbers OUTSIDE image (top and bottom)

      // Prepare dot data with positions (adjusted for image offset)
      const dotData = locations.map((location) => {
        const x = (location.x / 100) * imageWidth;
        const y = (location.y / 100) * imageHeight + imageYOffset; // Offset for top margin
        const displayNumber = location.pdfDotNumber !== undefined ? location.pdfDotNumber : location.dotNumber;
        return { x, y, displayNumber, location };
      });

      // Divide dots into top-half and bottom-half groups
      const imageCenterY = imageYOffset + (imageHeight / 2);
      const topDots = dotData.filter(d => d.y < imageCenterY).sort((a, b) => a.x - b.x);
      const bottomDots = dotData.filter(d => d.y >= imageCenterY).sort((a, b) => a.x - b.x);

      const dotRadius = Math.max(12, imageWidth * 0.015);
      const fontSize = Math.max(36, imageWidth * 0.045); // Bigger numbers!
      const minSpacing = fontSize * 1.8; // Minimum horizontal spacing between numbers
      const marginPadding = 10;

      // Draw dots (just circles, no numbers inside)
      dotData.forEach(({ x, y }) => {
        // White fill
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Black ring outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Helper function to adjust X positions to prevent overlap
      const adjustXPositions = (targetXPositions: number[]) => {
        const adjusted = [...targetXPositions];
        const circleRadius = fontSize * 0.8; // Same as used for drawing
        const edgePadding = circleRadius + marginPadding; // Ensure full circle fits

        // First pass: ensure minimum spacing between numbers
        for (let i = 1; i < adjusted.length; i++) {
          if (adjusted[i] - adjusted[i - 1] < minSpacing) {
            adjusted[i] = adjusted[i - 1] + minSpacing;
          }
        }

        // Second pass: check if numbers go off either edge
        const firstX = adjusted[0];
        const lastX = adjusted[adjusted.length - 1];
        const goesOffLeftEdge = firstX < edgePadding;
        const goesOffRightEdge = lastX > imageWidth - edgePadding;

        // If numbers go off edges, redistribute spacing evenly
        if (goesOffLeftEdge || goesOffRightEdge) {
          const totalWidth = imageWidth - (edgePadding * 2);
          const spacing = adjusted.length > 1 ? totalWidth / (adjusted.length - 1) : 0;
          for (let i = 0; i < adjusted.length; i++) {
            adjusted[i] = edgePadding + (i * spacing);
          }
        }

        return adjusted;
      };

      // Draw top-half dots with numbers ABOVE image
      if (topDots.length > 0) {
        const targetXs = adjustXPositions(topDots.map(d => d.x));
        const numberY = numberAreaHeight / 2; // Center in top area

        topDots.forEach((dot, index) => {
          const numberX = targetXs[index];

          // Draw leader line
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y - dotRadius); // Start from top of dot
          ctx.lineTo(numberX, numberAreaHeight - 5); // End just below number area
          ctx.stroke();

          // Draw number in black circle with white text
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const text = dot.displayNumber.toString();
          const circleRadius = fontSize * 0.8; // Circle size based on font

          // Black filled circle
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(numberX, numberY, circleRadius, 0, 2 * Math.PI);
          ctx.fill();

          // White number text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, numberX, numberY);
        });
      }

      // Draw bottom-half dots with numbers BELOW image
      if (bottomDots.length > 0) {
        const targetXs = adjustXPositions(bottomDots.map(d => d.x));
        const numberY = imageYOffset + imageHeight + (numberAreaHeight / 2); // Center in bottom area

        bottomDots.forEach((dot, index) => {
          const numberX = targetXs[index];

          // Draw leader line
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y + dotRadius); // Start from bottom of dot
          ctx.lineTo(numberX, imageYOffset + imageHeight + 5); // End just above number area
          ctx.stroke();

          // Draw number in black circle with white text
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const text = dot.displayNumber.toString();
          const circleRadius = fontSize * 0.8; // Circle size based on font

          // Black filled circle
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(numberX, numberY, circleRadius, 0, 2 * Math.PI);
          ctx.fill();

          // White number text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, numberX, numberY);
        });
      }

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('Failed to load image for dot drawing'));
    img.src = imageDataURL;
  });
}

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export const inspectionReportService = {
  async generateInspectionReport(
    inspection: CarInspection,
    template: InspectionTemplate
  ): Promise<void> {
    try {
      const startTime = performance.now();
      logger.info('Generating inspection report for:', inspection.inspectionId);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 18;

      const timings: Record<string, number> = {};

      // Gate info with stylish border box (left aligned) and Title (center aligned)
      if (inspection.gateName) {
        // Prepare gate text
        const gateLabel = 'Gate:';
        const gateValue = inspection.gateName;

        // Calculate box dimensions with larger text
        const gateFontSize = 14;
        doc.setFontSize(gateFontSize);
        doc.setFont('helvetica', 'bold');
        const labelWidth = doc.getTextWidth(gateLabel);
        doc.setFont('helvetica', 'normal');
        const valueWidth = doc.getTextWidth(gateValue);

        const boxPadding = 5;
        const textSpacing = 3;
        const boxWidth = labelWidth + textSpacing + valueWidth + (boxPadding * 2);
        const boxHeight = 11;
        const boxX = PDF_CONSTANTS.MARGIN_LEFT;
        const boxY = yPosition - 7.5;
        const cornerRadius = 2;

        // Draw outer border (thick black)
        doc.setDrawColor(0, 0, 0); // Black
        doc.setLineWidth(1.5);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, cornerRadius, cornerRadius, 'S');

        // Draw inner border (thick black with white gap)
        const borderGap = 2; // White space between borders
        doc.setDrawColor(0, 0, 0); // Black
        doc.setLineWidth(1.5);
        doc.roundedRect(boxX + borderGap, boxY + borderGap, boxWidth - (borderGap * 2), boxHeight - (borderGap * 2), cornerRadius - 0.5, cornerRadius - 0.5, 'S');

        // Draw gate text inside box
        const textY = yPosition;
        doc.setFontSize(gateFontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(gateLabel, boxX + boxPadding, textY);
        doc.setFont('helvetica', 'bold'); // Make gate value bold too
        doc.text(gateValue, boxX + boxPadding + labelWidth + textSpacing, textY);
      }

      // Title (centered)
      doc.setFontSize(PDF_CONSTANTS.TITLE_FONT_SIZE);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Car QA Inspection Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Header Information
      const summary = inspectionService.getInspectionSummary(inspection);

      // VIN with Barcode
      doc.setFontSize(PDF_CONSTANTS.HEADER_FONT_SIZE);
      doc.setFont('helvetica', 'bold');
      doc.text('VIN:', PDF_CONSTANTS.LABEL_X, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(inspection.vin, PDF_CONSTANTS.LABEL_X + 15, yPosition);

      // Add barcode on the right side
      const barcodeStart = performance.now();
      try {
        // OPTIMIZATION: Use smaller width parameter for faster generation
        const barcodeDataURL = generateBarcodeDataURL(inspection.vin, 1, 30);
        doc.addImage(
          barcodeDataURL,
          'PNG',
          PDF_CONSTANTS.BARCODE_X,
          yPosition - 5,
          PDF_CONSTANTS.BARCODE_WIDTH,
          PDF_CONSTANTS.BARCODE_HEIGHT
        );
      } catch (error) {
        logger.warn('Failed to generate barcode:', error);
      }
      timings.barcode = performance.now() - barcodeStart;
      yPosition += 6;

      // Body Code (if linked from pre-VIN inspection)
      if (inspection.linkedFromBodyCode) {
        doc.setFont('helvetica', 'bold');
        doc.text('Originally Inspected As:', PDF_CONSTANTS.LABEL_X, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(inspection.linkedFromBodyCode, PDF_CONSTANTS.LABEL_X + 50, yPosition);
        yPosition += 6;
      }

      // Progress (combines Status and Sections)
      doc.setFont('helvetica', 'bold');
      doc.text('Progress:', PDF_CONSTANTS.LABEL_X, yPosition);
      doc.setFont('helvetica', 'normal');

      // Format: "2/5 in progress" or "5/5 complete"
      let progressText = `${summary.completedSections}/${summary.totalSections}`;
      if (summary.completedSections === summary.totalSections) {
        progressText += ' complete';
      } else if (summary.completedSections > 0) {
        progressText += ' in progress';
      } else {
        progressText += ' not started';
      }
      doc.text(progressText, PDF_CONSTANTS.LABEL_X + PDF_CONSTANTS.VALUE_X_OFFSET, yPosition);
      yPosition += 6;

      // Dates
      if (inspection.startedAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Started:', PDF_CONSTANTS.LABEL_X, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateForPDF(inspection.startedAt), PDF_CONSTANTS.LABEL_X + 20, yPosition);
        yPosition += 6;
      }

      if (inspection.completedAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Completed:', PDF_CONSTANTS.LABEL_X, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateForPDF(inspection.completedAt), PDF_CONSTANTS.LABEL_X + 25, yPosition);

        // Add duration on same line if available
        if (inspection.startedAt) {
          const duration = new Date(inspection.completedAt).getTime() - new Date(inspection.startedAt).getTime();
          const minutes = Math.floor(duration / 60000);
          doc.setFont('helvetica', 'bold');
          doc.text('Duration:', 120, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(`${minutes} min`, 142, yPosition);
        }
        yPosition += 6;
      }

      // Inspectors with proper line wrapping
      if (summary.inspectors.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Inspectors:', PDF_CONSTANTS.LABEL_X, yPosition);
        doc.setFont('helvetica', 'normal');

        // Format inspectors - multiple per line, separated by commas
        const inspectorLines: string[] = [];
        for (let i = 0; i < summary.inspectors.length; i += PDF_CONSTANTS.INSPECTORS_PER_LINE) {
          const chunk = summary.inspectors.slice(i, i + PDF_CONSTANTS.INSPECTORS_PER_LINE);
          inspectorLines.push(chunk.join(', '));
        }

        // Print first line
        doc.text(inspectorLines[0], PDF_CONSTANTS.LABEL_X + PDF_CONSTANTS.VALUE_X_OFFSET, yPosition);
        yPosition += 5;

        // Print additional lines if needed
        for (let i = 1; i < inspectorLines.length; i++) {
          doc.text(inspectorLines[i], PDF_CONSTANTS.LABEL_X + PDF_CONSTANTS.VALUE_X_OFFSET, yPosition);
          yPosition += 5;
        }

        yPosition += 3;
      } else {
        yPosition += 2;
      }

      // ===== CONSOLIDATE IMAGES WITH GLOBAL DOT RENUMBERING =====
      const imageCollectionStart = performance.now();

      // Extended defect location with PDF display number and section info
      interface DefectLocationWithPdfNumber extends DefectLocation {
        pdfDotNumber: number;  // Sequential PDF number (1, 2, 3, 4...)
        sectionKey: string;    // Which section this defect is from
        itemName: string;      // Item name for reference
      }

      interface ConsolidatedImage {
        imageName: string;
        imageUrl: string;
        size?: number;
        defectLocations: DefectLocationWithPdfNumber[];
      }

      const consolidatedImages = new Map<string, ConsolidatedImage>();

      // Mapping from (sectionKey, originalDotNumber) to pdfDotNumber
      const dotNumberMapping = new Map<string, number>();
      let nextPdfDotNumber = 1;

      // Loop through all sections to collect images and defect locations
      for (const sectionKey of SECTION_KEYS) {
        const sectionResult = inspection.sections[sectionKey];
        const sectionTemplate = template.sections[sectionKey];

        if (!sectionTemplate || !sectionTemplate.images) continue;

        // For each image in this section
        for (const image of sectionTemplate.images) {
          // Create unique key: name + size (or just name if size not available for legacy images)
          const imageKey = image.size
            ? `${image.imageName}_${image.size}`
            : image.imageName;

          // Get or create consolidated image entry
          if (!consolidatedImages.has(imageKey)) {
            consolidatedImages.set(imageKey, {
              imageName: image.imageName,
              imageUrl: image.imageUrl,
              size: image.size,
              defectLocations: [],
            });
          }

          // Collect defect locations that reference this image (including additional defects)
          const defectsWithLocations: Array<{ location: DefectLocation; itemName: string }> = [];

          Object.entries(sectionResult.results).forEach(([itemName, result]) => {
            // Main defect location
            if (result.defectType !== 'Ok' && result.defectLocation && result.defectLocation.imageId === image.imageId) {
              defectsWithLocations.push({
                location: result.defectLocation,
                itemName,
              });
            }

            // Additional defect locations (backwards compatibility: treat undefined as empty array)
            const additionalDefects = result.additionalDefects || [];
            additionalDefects.forEach((additionalDefect) => {
              if (additionalDefect.defectLocation && additionalDefect.defectLocation.imageId === image.imageId) {
                defectsWithLocations.push({
                  location: additionalDefect.defectLocation,
                  itemName,
                });
              }
            });
          });

          // Add to consolidated image with PDF numbering
          const consolidated = consolidatedImages.get(imageKey)!;
          for (const { location, itemName } of defectsWithLocations) {
            // Create mapping key for this specific defect
            const mappingKey = `${sectionKey}_${location.dotNumber}`;

            // Assign PDF number if not already assigned
            if (!dotNumberMapping.has(mappingKey)) {
              dotNumberMapping.set(mappingKey, nextPdfDotNumber);
              nextPdfDotNumber++;
            }

            const pdfDotNumber = dotNumberMapping.get(mappingKey)!;

            // Add location with PDF number
            consolidated.defectLocations.push({
              ...location,
              pdfDotNumber,
              sectionKey,
              itemName,
            });
          }
        }
      }

      timings.imageCollection = performance.now() - imageCollectionStart;

      // Render consolidated images section if any images exist
      if (consolidatedImages.size > 0) {
        const imageProcessingStart = performance.now();
        const imgWidth = PDF_CONSTANTS.IMAGE_WIDTH;
        const imgHeight = imgWidth * PDF_CONSTANTS.IMAGE_HEIGHT_RATIO;

        let xPosition = PDF_CONSTANTS.MARGIN_LEFT;
        let rowStartY = yPosition;
        let imageCount = 0;

        const images = Array.from(consolidatedImages.values());

        // Load base images (using shared cache by URL)
        const imageLoadStart = performance.now();
        const cacheStatsBefore = getCacheStats();

        const imageLoadPromises = images.map(async (consolidatedImage) => {
          try {
            // Load base image (automatically uses cache if available)
            const baseImageDataURL = await loadImageAsDataURL(consolidatedImage.imageUrl);

            // Draw dots on the base image (specific to this inspection)
            const imageWithDots = await drawDotsOnImage(
              baseImageDataURL,
              consolidatedImage.defectLocations,
              800,
              600
            );
            return { success: true as const, imageWithDots, consolidatedImage };
          } catch (error) {
            logger.error(`Failed to load/draw consolidated image ${consolidatedImage.imageName}:`, error);
            return { success: false as const, consolidatedImage };
          }
        });

        // Wait for all images to load in parallel
        const loadedImages = await Promise.all(imageLoadPromises);
        timings.imageLoading = performance.now() - imageLoadStart;

        const cacheStatsAfter = getCacheStats();
        const newlyCached = cacheStatsAfter.size - cacheStatsBefore.size;
        (timings as any).cacheHits = images.length - newlyCached;
        (timings as any).cacheMisses = newlyCached;

        // Now render the loaded images
        const imageRenderStart = performance.now();
        for (const result of loadedImages) {
          if (!result.success || !result.imageWithDots) continue;

          // Check if we need a new page
          if (rowStartY + imgHeight > PDF_CONSTANTS.PAGE_BOTTOM_LIMIT) {
            doc.addPage();
            rowStartY = PDF_CONSTANTS.PAGE_TOP_START;
            yPosition = PDF_CONSTANTS.PAGE_TOP_START;
            xPosition = PDF_CONSTANTS.MARGIN_LEFT;
            imageCount = 0;
          }

          // Add image to PDF
          doc.addImage(result.imageWithDots, 'JPEG', xPosition, rowStartY, imgWidth, imgHeight);

          imageCount++;

          // Check if we need to move to next row
          if (imageCount >= PDF_CONSTANTS.IMAGES_PER_ROW) {
            xPosition = PDF_CONSTANTS.MARGIN_LEFT;
            rowStartY += imgHeight + PDF_CONSTANTS.IMAGE_SPACING;
            imageCount = 0;
          } else {
            xPosition += imgWidth + PDF_CONSTANTS.IMAGE_SPACING;
          }
        }

        // Update yPosition to after all images
        if (imageCount > 0) {
          yPosition = rowStartY + imgHeight + 5;
        } else {
          yPosition = rowStartY + 5;
        }

        yPosition += 5;
        timings.imageRendering = performance.now() - imageRenderStart;
        timings.totalImageProcessing = performance.now() - imageProcessingStart;
      }

      // Create email-to-name mapping from sections
      const sectionDetailsStart = performance.now();
      const emailToNameMap = new Map<string, string>();
      for (const sectionKey of SECTION_KEYS) {
        const section = inspection.sections[sectionKey];
        if (section.inspector && section.inspectorName) {
          emailToNameMap.set(section.inspector, section.inspectorName);
        }
      }

      // Section Details header
      doc.setFontSize(PDF_CONSTANTS.SECTION_FONT_SIZE + 1);
      doc.setFont('helvetica', 'bold');
      doc.text('Defect Details:', PDF_CONSTANTS.LABEL_X, yPosition);
      yPosition += 4;

      for (const sectionKey of SECTION_KEYS) {
        const sectionResult = inspection.sections[sectionKey];
        const sectionTemplate = template.sections[sectionKey];

        if (!sectionTemplate) continue;

        // Check if we need a new page
        if (yPosition > PDF_CONSTANTS.PAGE_BOTTOM_LIMIT - 10) {
          doc.addPage();
          yPosition = PDF_CONSTANTS.PAGE_TOP_START;
        }

        // Get defects for this section first to check if we need to show anything
        const sectionDefectRows: Array<{ row: any[]; sortNumber: number }> = [];

        Object.entries(sectionResult.results).forEach(([itemName, result]) => {
          // Main defect
          if (result.defectType !== 'Ok') {
            // Get PDF dot number from mapping if location exists
            let pdfDotNumber: number | null = null;
            if (result.defectLocation) {
              const mappingKey = `${sectionKey}_${result.defectLocation.dotNumber}`;
              pdfDotNumber = dotNumberMapping.get(mappingKey) || null;
            }

            // Add dot number prefix using PDF number
            const dotPrefix = pdfDotNumber !== null ? `[${pdfDotNumber}] ` : '';

            // Get inspector name from email mapping
            const inspectorDisplay = result.checkedBy
              ? (emailToNameMap.get(result.checkedBy) || result.checkedBy)
              : '-';

            // Format resolution status
            let statusText = '';
            if (result.status === 'Resolved' && result.resolvedBy && result.resolvedAt) {
              const resolvedDate = result.resolvedAt instanceof Date
                ? result.resolvedAt
                : new Date(result.resolvedAt);
              const formattedDate = resolvedDate.toLocaleString('en-MY', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              // Put "Resolved" with name on first line, date on second line
              if (result.resolutionNote) {
                statusText = `Resolved ${result.resolvedBy}\n${formattedDate}\n${result.resolutionNote}`;
              } else {
                statusText = `Resolved ${result.resolvedBy}\n${formattedDate}`;
              }
            } else if (result.status) {
              statusText = result.status;
            }

            sectionDefectRows.push({
              row: [
                dotPrefix + itemName,
                result.defectType,
                result.notes || '-',
                inspectorDisplay,
                statusText,
              ],
              sortNumber: pdfDotNumber !== null ? pdfDotNumber : 9999, // Sort items without dots to the end
            });
          }

          // Additional defects (backwards compatibility: treat undefined as empty array)
          const additionalDefects = result.additionalDefects || [];
          additionalDefects.forEach((additionalDefect) => {
            // Get PDF dot number from mapping if location exists
            let pdfDotNumber: number | null = null;
            if (additionalDefect.defectLocation) {
              const mappingKey = `${sectionKey}_${additionalDefect.defectLocation.dotNumber}`;
              pdfDotNumber = dotNumberMapping.get(mappingKey) || null;
            }

            // Add dot number prefix using PDF number, plus "+" to indicate additional
            const dotPrefix = pdfDotNumber !== null ? `[${pdfDotNumber}] +` : '+';

            // Get inspector name from email mapping
            const inspectorDisplay = additionalDefect.checkedBy
              ? (emailToNameMap.get(additionalDefect.checkedBy) || additionalDefect.checkedBy)
              : '-';

            // Format resolution status for additional defect
            let statusText = '';
            if (additionalDefect.status === 'Resolved' && additionalDefect.resolvedBy && additionalDefect.resolvedAt) {
              const resolvedDate = additionalDefect.resolvedAt instanceof Date
                ? additionalDefect.resolvedAt
                : new Date(additionalDefect.resolvedAt);
              const formattedDate = resolvedDate.toLocaleString('en-MY', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              // Put "Resolved" with name on first line, date on second line
              if (additionalDefect.resolutionNote) {
                statusText = `Resolved ${additionalDefect.resolvedBy}\n${formattedDate}\n${additionalDefect.resolutionNote}`;
              } else {
                statusText = `Resolved ${additionalDefect.resolvedBy}\n${formattedDate}`;
              }
            } else if (additionalDefect.status) {
              statusText = additionalDefect.status;
            }

            sectionDefectRows.push({
              row: [
                `${dotPrefix} ${itemName}`,
                additionalDefect.defectType,
                additionalDefect.notes || '-',
                inspectorDisplay,
                statusText,
              ],
              sortNumber: pdfDotNumber !== null ? pdfDotNumber : 9999,
            });
          });
        });

        const sectionDefects = sectionDefectRows
          .sort((a, b) => a.sortNumber - b.sortNumber) // Sort by PDF dot number
          .map(item => item.row); // Extract just the row data

        // Only show sections with defects
        if (sectionDefects.length > 0) {
          // Section Header
          doc.setFontSize(PDF_CONSTANTS.SECTION_FONT_SIZE);
          doc.setFont('helvetica', 'bold');
          doc.text(`${getLocalizedText(sectionTemplate.sectionName)}:`, PDF_CONSTANTS.LABEL_X, yPosition);

          if (sectionResult.inspectorName) {
            doc.setFont('helvetica', 'normal');
            doc.text(`${sectionResult.inspectorName}`, 70, yPosition);
          }
          yPosition += 3;

          // Defect table
          autoTable(doc, {
            startY: yPosition,
            head: [['Item', 'Defect', 'Notes', 'Inspector', 'Status']],
            body: sectionDefects,
            theme: 'striped',
            headStyles: { fillColor: [108, 117, 125], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: PDF_CONSTANTS.MARGIN_LEFT, right: PDF_CONSTANTS.MARGIN_RIGHT },
            styles: { cellPadding: 2 },
            columnStyles: {
              0: { cellWidth: 38 },
              1: { cellWidth: 26 },
              2: { cellWidth: 40 },
              3: { cellWidth: 30 },
              4: { cellWidth: 36 },
            },
          });
          // Type-safe access to lastAutoTable
          yPosition = ((doc as any).lastAutoTable?.finalY || yPosition) + 4;
        }
      }

      timings.sectionDetails = performance.now() - sectionDetailsStart;

      // Footer with generation timestamp
      const footerStart = performance.now();
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(PDF_CONSTANTS.FOOTER_FONT_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128);
        doc.text(
          `Generated: ${formatDateForPDF(new Date())} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      timings.footer = performance.now() - footerStart;

      // Open PDF in new tab instead of downloading
      const pdfOutputStart = performance.now();
      const filename = `Inspection_${inspection.vin}_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      timings.pdfOutput = performance.now() - pdfOutputStart;

      // Open in new tab for preview and printing
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // If popup blocked, fallback to download
        doc.save(filename);
        alert('Please allow popups to preview the report, or use the downloaded file.');
      }

      // Calculate total time
      const totalTime = performance.now() - startTime;
      timings.total = totalTime;

      // Log performance breakdown (use console.log directly to ensure it shows in production)
      const cacheHits = (timings as any).cacheHits || 0;
      const cacheMisses = (timings as any).cacheMisses || 0;
      const cacheStatus = cacheMisses === 0 ? '✅ ALL CACHED' : `🔄 ${cacheHits} cached, ${cacheMisses} downloaded`;

      console.log('📊 PDF Generation Performance:', {
        filename,
        totalTime: `${totalTime.toFixed(0)}ms`,
        cacheStatus,
        breakdown: {
          barcode: `${(timings.barcode || 0).toFixed(0)}ms`,
          imageCollection: `${(timings.imageCollection || 0).toFixed(0)}ms`,
          imageLoading: `${(timings.imageLoading || 0).toFixed(0)}ms (${cacheStatus})`,
          imageRendering: `${(timings.imageRendering || 0).toFixed(0)}ms`,
          totalImages: `${(timings.totalImageProcessing || 0).toFixed(0)}ms`,
          sectionDetails: `${(timings.sectionDetails || 0).toFixed(0)}ms`,
          footer: `${(timings.footer || 0).toFixed(0)}ms`,
          pdfOutput: `${(timings.pdfOutput || 0).toFixed(0)}ms`,
        },
        imageCount: consolidatedImages.size,
        totalCachedImages: getCacheStats().size,
      });

      logger.info('Report generated successfully:', filename);
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  },

  async generateReportById(inspectionId: string): Promise<void> {
    try {
      const inspection = await inspectionService.getInspectionById(inspectionId);
      if (!inspection) {
        throw new Error(`Inspection not found: ${inspectionId}`);
      }

      const template = await inspectionService.getTemplate(inspection.templateId);
      if (!template) {
        throw new Error(`Template not found: ${inspection.templateId}`);
      }

      await this.generateInspectionReport(inspection, template);
    } catch (error) {
      logger.error('Failed to generate report by ID:', error);
      throw error;
    }
  },

  async generateReportByVIN(vin: string): Promise<void> {
    try {
      const inspection = await inspectionService.getInspectionByVIN(vin);
      if (!inspection) {
        throw new Error(`No inspection found for VIN: ${vin}`);
      }

      const template = await inspectionService.getTemplate(inspection.templateId);
      if (!template) {
        throw new Error(`Template not found: ${inspection.templateId}`);
      }

      await this.generateInspectionReport(inspection, template);
    } catch (error) {
      logger.error('Failed to generate report by VIN:', error);
      throw error;
    }
  },

  async generateReportByVINAndGate(vin: string, gateId: string): Promise<void> {
    try {
      const inspection = await inspectionService.getInspectionByVINAndGate(vin, gateId);
      if (!inspection) {
        throw new Error(`No inspection found for VIN: ${vin} at gate: ${gateId}`);
      }

      const template = await inspectionService.getTemplate(inspection.templateId);
      if (!template) {
        throw new Error(`Template not found: ${inspection.templateId}`);
      }

      await this.generateInspectionReport(inspection, template);
    } catch (error) {
      logger.error('Failed to generate report by VIN and Gate:', error);
      throw error;
    }
  },

  async generateCombinedReportByVIN(vin: string): Promise<void> {
    try {
      const startTime = performance.now();
      logger.info('Generating combined report for VIN:', vin);

      // Fetch all inspections for this VIN
      const inspections = await inspectionService.getInspectionsByVIN(vin);
      if (inspections.length === 0) {
        throw new Error(`No inspections found for VIN: ${vin}`);
      }

      // Sort by gateIndex
      inspections.sort((a, b) => (a.gateIndex ?? 0) - (b.gateIndex ?? 0));

      // Use the template from the first inspection (all should use the same template)
      const template = await inspectionService.getTemplate(inspections[0].templateId);
      if (!template) {
        throw new Error(`Template not found: ${inspections[0].templateId}`);
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 18;

      const timings: Record<string, number> = {};

      // "All Gates" box (left aligned) and Title (center aligned)
      const gateLabel = 'Gates:';
      const gateValue = 'All Gates';

      // Calculate box dimensions with larger text
      const gateFontSize = 14;
      doc.setFontSize(gateFontSize);
      doc.setFont('helvetica', 'bold');
      const labelWidth = doc.getTextWidth(gateLabel);
      doc.setFont('helvetica', 'normal');
      const valueWidth = doc.getTextWidth(gateValue);

      const boxPadding = 5;
      const textSpacing = 3;
      const boxWidth = labelWidth + textSpacing + valueWidth + (boxPadding * 2);
      const boxHeight = 11;
      const boxX = PDF_CONSTANTS.MARGIN_LEFT;
      const boxY = yPosition - 7.5;
      const cornerRadius = 2;

      // Draw outer border (thick black)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.5);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, cornerRadius, cornerRadius, 'S');

      // Draw inner border (thick black with white gap)
      const borderGap = 2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.5);
      doc.roundedRect(boxX + borderGap, boxY + borderGap, boxWidth - (borderGap * 2), boxHeight - (borderGap * 2), cornerRadius - 0.5, cornerRadius - 0.5, 'S');

      // Draw gate text inside box
      const textY = yPosition;
      doc.setFontSize(gateFontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(gateLabel, boxX + boxPadding, textY);
      doc.setFont('helvetica', 'bold');
      doc.text(gateValue, boxX + boxPadding + labelWidth + textSpacing, textY);

      // Title (centered)
      doc.setFontSize(PDF_CONSTANTS.TITLE_FONT_SIZE);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Car QA Inspection Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Header Information
      // VIN with Barcode
      doc.setFontSize(PDF_CONSTANTS.HEADER_FONT_SIZE);
      doc.setFont('helvetica', 'bold');
      doc.text('VIN:', PDF_CONSTANTS.LABEL_X, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(vin, PDF_CONSTANTS.LABEL_X + 15, yPosition);

      // Add barcode on the right side
      const barcodeStart = performance.now();
      try {
        const barcodeDataURL = generateBarcodeDataURL(vin, 1, 30);
        doc.addImage(
          barcodeDataURL,
          'PNG',
          PDF_CONSTANTS.BARCODE_X,
          yPosition - 5,
          PDF_CONSTANTS.BARCODE_WIDTH,
          PDF_CONSTANTS.BARCODE_HEIGHT
        );
      } catch (error) {
        logger.warn('Failed to generate barcode:', error);
      }
      timings.barcode = performance.now() - barcodeStart;
      yPosition += 6;

      // List gates inspected
      doc.setFont('helvetica', 'bold');
      doc.text('Gates Inspected:', PDF_CONSTANTS.LABEL_X, yPosition);
      doc.setFont('helvetica', 'normal');
      const gateNames = inspections.map(i => i.gateName || `Gate ${i.gateIndex}`).join(', ');
      doc.text(gateNames, PDF_CONSTANTS.LABEL_X + 35, yPosition);
      yPosition += 6;

      // Date range
      const startedDates = inspections.map(i => i.startedAt).filter(d => d) as Date[];
      const completedDates = inspections.map(i => i.completedAt).filter(d => d) as Date[];

      if (startedDates.length > 0) {
        const earliestStart = new Date(Math.min(...startedDates.map(d => new Date(d).getTime())));
        doc.setFont('helvetica', 'bold');
        doc.text('First Started:', PDF_CONSTANTS.LABEL_X, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateForPDF(earliestStart), PDF_CONSTANTS.LABEL_X + 27, yPosition);
        yPosition += 6;
      }

      if (completedDates.length > 0) {
        const latestCompletion = new Date(Math.max(...completedDates.map(d => new Date(d).getTime())));
        doc.setFont('helvetica', 'bold');
        doc.text('Last Completed:', PDF_CONSTANTS.LABEL_X, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateForPDF(latestCompletion), PDF_CONSTANTS.LABEL_X + 32, yPosition);
        yPosition += 6;
      }

      // ===== CONSOLIDATE IMAGES WITH GLOBAL DOT RENUMBERING ACROSS ALL GATES =====
      const imageCollectionStart = performance.now();

      // Extended defect location with PDF display number, section info, and gate info
      interface DefectLocationWithPdfNumberAndGate extends DefectLocation {
        pdfDotNumber: number;
        sectionKey: string;
        itemName: string;
        gateIndex: number;
        gateName: string;
      }

      interface ConsolidatedImage {
        imageName: string;
        imageUrl: string;
        size?: number;
        defectLocations: DefectLocationWithPdfNumberAndGate[];
      }

      const consolidatedImages = new Map<string, ConsolidatedImage>();
      const dotNumberMapping = new Map<string, number>();
      let nextPdfDotNumber = 1;

      // Build email-to-name mapping from all inspections
      const emailToNameMap = new Map<string, string>();
      for (const inspection of inspections) {
        for (const sectionKey of SECTION_KEYS) {
          const section = inspection.sections[sectionKey];
          if (section.inspector && section.inspectorName) {
            emailToNameMap.set(section.inspector, section.inspectorName);
          }
        }
      }

      // Loop through ALL inspections to collect images and defect locations
      for (const inspection of inspections) {
        const gateIndex = inspection.gateIndex ?? 0;
        const gateName = inspection.gateName || `Gate ${gateIndex}`;

        for (const sectionKey of SECTION_KEYS) {
          const sectionResult = inspection.sections[sectionKey];
          const sectionTemplate = template.sections[sectionKey];

          if (!sectionTemplate || !sectionTemplate.images) continue;

          // For each image in this section
          for (const image of sectionTemplate.images) {
            // Create unique key: name + size
            const imageKey = image.size
              ? `${image.imageName}_${image.size}`
              : image.imageName;

            // Get or create consolidated image entry
            if (!consolidatedImages.has(imageKey)) {
              consolidatedImages.set(imageKey, {
                imageName: image.imageName,
                imageUrl: image.imageUrl,
                size: image.size,
                defectLocations: [],
              });
            }

            // Collect defect locations that reference this image
            const defectsWithLocations: Array<{ location: DefectLocation; itemName: string }> = [];

            Object.entries(sectionResult.results).forEach(([itemName, result]) => {
              // Main defect location
              if (result.defectType !== 'Ok' && result.defectLocation && result.defectLocation.imageId === image.imageId) {
                defectsWithLocations.push({
                  location: result.defectLocation,
                  itemName,
                });
              }

              // Additional defect locations
              const additionalDefects = result.additionalDefects || [];
              additionalDefects.forEach((additionalDefect) => {
                if (additionalDefect.defectLocation && additionalDefect.defectLocation.imageId === image.imageId) {
                  defectsWithLocations.push({
                    location: additionalDefect.defectLocation,
                    itemName,
                  });
                }
              });
            });

            // Add to consolidated image with PDF numbering
            const consolidated = consolidatedImages.get(imageKey)!;
            for (const { location, itemName } of defectsWithLocations) {
              // Create mapping key for this specific defect (including gate to make unique)
              const mappingKey = `${inspection.inspectionId}_${sectionKey}_${location.dotNumber}`;

              // Assign PDF number if not already assigned
              if (!dotNumberMapping.has(mappingKey)) {
                dotNumberMapping.set(mappingKey, nextPdfDotNumber);
                nextPdfDotNumber++;
              }

              const pdfDotNumber = dotNumberMapping.get(mappingKey)!;

              // Add location with PDF number and gate info
              consolidated.defectLocations.push({
                ...location,
                pdfDotNumber,
                sectionKey,
                itemName,
                gateIndex,
                gateName,
              });
            }
          }
        }
      }

      timings.imageCollection = performance.now() - imageCollectionStart;

      // Render consolidated images section if any images exist
      if (consolidatedImages.size > 0) {
        const imageProcessingStart = performance.now();
        const imgWidth = PDF_CONSTANTS.IMAGE_WIDTH;
        const imgHeight = imgWidth * PDF_CONSTANTS.IMAGE_HEIGHT_RATIO;

        let xPosition = PDF_CONSTANTS.MARGIN_LEFT;
        let rowStartY = yPosition;
        let imageCount = 0;

        const images = Array.from(consolidatedImages.values());

        // Load base images
        const imageLoadStart = performance.now();
        const cacheStatsBefore = getCacheStats();

        const imageLoadPromises = images.map(async (consolidatedImage) => {
          try {
            const baseImageDataURL = await loadImageAsDataURL(consolidatedImage.imageUrl);
            const imageWithDots = await drawDotsOnImage(
              baseImageDataURL,
              consolidatedImage.defectLocations,
              800,
              600
            );
            return { success: true as const, imageWithDots, consolidatedImage };
          } catch (error) {
            logger.error(`Failed to load/draw consolidated image ${consolidatedImage.imageName}:`, error);
            return { success: false as const, consolidatedImage };
          }
        });

        const loadedImages = await Promise.all(imageLoadPromises);
        timings.imageLoading = performance.now() - imageLoadStart;

        const cacheStatsAfter = getCacheStats();
        const newlyCached = cacheStatsAfter.size - cacheStatsBefore.size;
        (timings as any).cacheHits = images.length - newlyCached;
        (timings as any).cacheMisses = newlyCached;

        // Render the loaded images
        const imageRenderStart = performance.now();
        for (const result of loadedImages) {
          if (!result.success || !result.imageWithDots) continue;

          // Check if we need a new page
          if (rowStartY + imgHeight > PDF_CONSTANTS.PAGE_BOTTOM_LIMIT) {
            doc.addPage();
            rowStartY = PDF_CONSTANTS.PAGE_TOP_START;
            yPosition = PDF_CONSTANTS.PAGE_TOP_START;
            xPosition = PDF_CONSTANTS.MARGIN_LEFT;
            imageCount = 0;
          }

          // Add image to PDF
          doc.addImage(result.imageWithDots, 'JPEG', xPosition, rowStartY, imgWidth, imgHeight);

          imageCount++;

          // Check if we need to move to next row
          if (imageCount >= PDF_CONSTANTS.IMAGES_PER_ROW) {
            xPosition = PDF_CONSTANTS.MARGIN_LEFT;
            rowStartY += imgHeight + PDF_CONSTANTS.IMAGE_SPACING;
            imageCount = 0;
          } else {
            xPosition += imgWidth + PDF_CONSTANTS.IMAGE_SPACING;
          }
        }

        // Update yPosition to after all images
        if (imageCount > 0) {
          yPosition = rowStartY + imgHeight + 5;
        } else {
          yPosition = rowStartY + 5;
        }

        yPosition += 5;
        timings.imageRendering = performance.now() - imageRenderStart;
        timings.totalImageProcessing = performance.now() - imageProcessingStart;
      }

      // Section Details header
      const sectionDetailsStart = performance.now();
      doc.setFontSize(PDF_CONSTANTS.SECTION_FONT_SIZE + 1);
      doc.setFont('helvetica', 'bold');
      doc.text('Defect Details:', PDF_CONSTANTS.LABEL_X, yPosition);
      yPosition += 4;

      // Collect ALL defects from ALL inspections, organized by section
      for (const sectionKey of SECTION_KEYS) {
        const sectionTemplate = template.sections[sectionKey];
        if (!sectionTemplate) continue;

        // Check if we need a new page
        if (yPosition > PDF_CONSTANTS.PAGE_BOTTOM_LIMIT - 10) {
          doc.addPage();
          yPosition = PDF_CONSTANTS.PAGE_TOP_START;
        }

        // Collect defects from all inspections for this section
        const sectionDefectRows: Array<{ row: any[]; sortNumber: number }> = [];

        for (const inspection of inspections) {
          const sectionResult = inspection.sections[sectionKey];
          const gateIndex = inspection.gateIndex ?? 0;
          const gateName = inspection.gateName || `Gate ${gateIndex}`;

          Object.entries(sectionResult.results).forEach(([itemName, result]) => {
            // Main defect
            if (result.defectType !== 'Ok') {
              // Get PDF dot number from mapping if location exists
              let pdfDotNumber: number | null = null;
              if (result.defectLocation) {
                const mappingKey = `${inspection.inspectionId}_${sectionKey}_${result.defectLocation.dotNumber}`;
                pdfDotNumber = dotNumberMapping.get(mappingKey) || null;
              }

              // Add dot number prefix using PDF number
              const dotPrefix = pdfDotNumber !== null ? `[${pdfDotNumber}] ` : '';

              // Get inspector name from email mapping
              const inspectorDisplay = result.checkedBy
                ? (emailToNameMap.get(result.checkedBy) || result.checkedBy)
                : '-';

              // Format resolution status
              let statusText = '';
              if (result.status === 'Resolved' && result.resolvedBy && result.resolvedAt) {
                const resolvedDate = result.resolvedAt instanceof Date
                  ? result.resolvedAt
                  : new Date(result.resolvedAt);
                const formattedDate = resolvedDate.toLocaleString('en-MY', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                if (result.resolutionNote) {
                  statusText = `Resolved ${result.resolvedBy}\n${formattedDate}\n${result.resolutionNote}`;
                } else {
                  statusText = `Resolved ${result.resolvedBy}\n${formattedDate}`;
                }
              } else if (result.status) {
                statusText = result.status;
              }

              sectionDefectRows.push({
                row: [
                  dotPrefix + itemName,
                  result.defectType,
                  result.notes || '-',
                  inspectorDisplay,
                  gateName,  // Add gate column
                  statusText,
                ],
                sortNumber: pdfDotNumber !== null ? pdfDotNumber : 9999,
              });
            }

            // Additional defects
            const additionalDefects = result.additionalDefects || [];
            additionalDefects.forEach((additionalDefect) => {
              // Get PDF dot number from mapping if location exists
              let pdfDotNumber: number | null = null;
              if (additionalDefect.defectLocation) {
                const mappingKey = `${inspection.inspectionId}_${sectionKey}_${additionalDefect.defectLocation.dotNumber}`;
                pdfDotNumber = dotNumberMapping.get(mappingKey) || null;
              }

              // Add dot number prefix using PDF number, plus "+" to indicate additional
              const dotPrefix = pdfDotNumber !== null ? `[${pdfDotNumber}] +` : '+';

              // Get inspector name from email mapping
              const inspectorDisplay = additionalDefect.checkedBy
                ? (emailToNameMap.get(additionalDefect.checkedBy) || additionalDefect.checkedBy)
                : '-';

              // Format resolution status for additional defect
              let statusText = '';
              if (additionalDefect.status === 'Resolved' && additionalDefect.resolvedBy && additionalDefect.resolvedAt) {
                const resolvedDate = additionalDefect.resolvedAt instanceof Date
                  ? additionalDefect.resolvedAt
                  : new Date(additionalDefect.resolvedAt);
                const formattedDate = resolvedDate.toLocaleString('en-MY', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                if (additionalDefect.resolutionNote) {
                  statusText = `Resolved ${additionalDefect.resolvedBy}\n${formattedDate}\n${additionalDefect.resolutionNote}`;
                } else {
                  statusText = `Resolved ${additionalDefect.resolvedBy}\n${formattedDate}`;
                }
              } else if (additionalDefect.status) {
                statusText = additionalDefect.status;
              }

              sectionDefectRows.push({
                row: [
                  `${dotPrefix} ${itemName}`,
                  additionalDefect.defectType,
                  additionalDefect.notes || '-',
                  inspectorDisplay,
                  gateName,  // Add gate column
                  statusText,
                ],
                sortNumber: pdfDotNumber !== null ? pdfDotNumber : 9999,
              });
            });
          });
        }

        const sectionDefects = sectionDefectRows
          .sort((a, b) => a.sortNumber - b.sortNumber)
          .map(item => item.row);

        // Only show sections with defects
        if (sectionDefects.length > 0) {
          // Section Header
          doc.setFontSize(PDF_CONSTANTS.SECTION_FONT_SIZE);
          doc.setFont('helvetica', 'bold');
          doc.text(`${getLocalizedText(sectionTemplate.sectionName)}:`, PDF_CONSTANTS.LABEL_X, yPosition);
          yPosition += 3;

          // Defect table with Gate column
          autoTable(doc, {
            startY: yPosition,
            head: [['Item', 'Defect', 'Notes', 'Inspector', 'Gate', 'Status']],
            body: sectionDefects,
            theme: 'striped',
            headStyles: { fillColor: [108, 117, 125], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: PDF_CONSTANTS.MARGIN_LEFT, right: PDF_CONSTANTS.MARGIN_RIGHT },
            styles: { cellPadding: 2 },
            columnStyles: {
              0: { cellWidth: 35 },
              1: { cellWidth: 24 },
              2: { cellWidth: 35 },
              3: { cellWidth: 27 },
              4: { cellWidth: 18 },
              5: { cellWidth: 31 },
            },
          });
          yPosition = ((doc as any).lastAutoTable?.finalY || yPosition) + 4;
        }
      }

      timings.sectionDetails = performance.now() - sectionDetailsStart;

      // Footer with generation timestamp
      const footerStart = performance.now();
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(PDF_CONSTANTS.FOOTER_FONT_SIZE);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128);
        doc.text(
          `Generated: ${formatDateForPDF(new Date())} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      timings.footer = performance.now() - footerStart;

      // Open PDF in new tab
      const pdfOutputStart = performance.now();
      const filename = `Combined_Inspection_${vin}_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      timings.pdfOutput = performance.now() - pdfOutputStart;

      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        doc.save(filename);
        alert('Please allow popups to preview the report, or use the downloaded file.');
      }

      // Calculate total time
      const totalTime = performance.now() - startTime;
      timings.total = totalTime;

      const cacheHits = (timings as any).cacheHits || 0;
      const cacheMisses = (timings as any).cacheMisses || 0;
      const cacheStatus = cacheMisses === 0 ? '✅ ALL CACHED' : `🔄 ${cacheHits} cached, ${cacheMisses} downloaded`;

      console.log('📊 Combined PDF Generation Performance:', {
        filename,
        vin,
        gatesIncluded: inspections.length,
        totalTime: `${totalTime.toFixed(0)}ms`,
        cacheStatus,
        breakdown: {
          barcode: `${(timings.barcode || 0).toFixed(0)}ms`,
          imageCollection: `${(timings.imageCollection || 0).toFixed(0)}ms`,
          imageLoading: `${(timings.imageLoading || 0).toFixed(0)}ms (${cacheStatus})`,
          imageRendering: `${(timings.imageRendering || 0).toFixed(0)}ms`,
          totalImages: `${(timings.totalImageProcessing || 0).toFixed(0)}ms`,
          sectionDetails: `${(timings.sectionDetails || 0).toFixed(0)}ms`,
          footer: `${(timings.footer || 0).toFixed(0)}ms`,
          pdfOutput: `${(timings.pdfOutput || 0).toFixed(0)}ms`,
        },
        imageCount: consolidatedImages.size,
        totalCachedImages: getCacheStats().size,
      });

      logger.info('Combined report generated successfully:', filename);
    } catch (error) {
      logger.error('Failed to generate combined report:', error);
      throw error;
    }
  },
};
