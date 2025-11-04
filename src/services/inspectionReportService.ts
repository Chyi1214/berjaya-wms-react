// Inspection Report Service - Generate PDF reports for car inspections
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CarInspection, InspectionTemplate, InspectionSection, DefectLocation } from '../types/inspection';
import { inspectionService } from './inspectionService';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('InspectionReportService');

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

// Helper: Format status for display
function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper: Get localized text or fallback to English
function getLocalizedText(text: string | { en: string; ms?: string; zh?: string; my?: string; bn?: string }): string {
  if (typeof text === 'string') {
    return text;
  }
  return text.en || '[No translation]';
}

// Helper: Load image from URL and convert to Data URL
async function loadImageAsDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
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
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

      // Draw dots
      locations.forEach((location) => {
        const x = (location.x / 100) * imageWidth;
        const y = (location.y / 100) * imageHeight;
        const dotRadius = Math.max(20, imageWidth * 0.025); // Increased size

        // Draw outer black ring for better visibility
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x, y, dotRadius + 4, 0, 2 * Math.PI);
        ctx.fill();

        // Draw red circle
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw white border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4; // Thicker border
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw number - use pdfDotNumber if available, otherwise use original dotNumber
        const displayNumber = location.pdfDotNumber !== undefined ? location.pdfDotNumber : location.dotNumber;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${dotRadius * 1.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(displayNumber.toString(), x, y);
        ctx.shadowBlur = 0;
      });

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
      logger.info('Generating inspection report for:', inspection.inspectionId);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 18;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Car QA Inspection Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Header Information - Single line format
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('VIN:', 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(inspection.vin, 35, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 100, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(formatStatus(inspection.status), 120, yPosition);
      yPosition += 6;

      // Dates - Single line
      if (inspection.startedAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Started:', 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateForPDF(inspection.startedAt), 40, yPosition);
        yPosition += 6;
      }

      if (inspection.completedAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Completed:', 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDateForPDF(inspection.completedAt), 45, yPosition);

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

      // Summary Statistics - More compact, single line
      const summary = inspectionService.getInspectionSummary(inspection);
      doc.setFont('helvetica', 'bold');
      doc.text('Sections:', 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${summary.completedSections}/${summary.totalSections}`, 42, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text('Defects:', 70, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(summary.totalDefects.toString(), 90, yPosition);

      doc.setFont('helvetica', 'bold');
      doc.text('Inspectors:', 110, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(summary.inspectors.join(', '), 135, yPosition);
      yPosition += 8;

      // ===== CONSOLIDATE IMAGES WITH GLOBAL DOT RENUMBERING =====
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

      const sectionKeys: InspectionSection[] = [
        'right_outside',
        'left_outside',
        'front_back',
        'interior_right',
        'interior_left',
      ];

      // Loop through all sections to collect images and defect locations
      for (const sectionKey of sectionKeys) {
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

          // Collect defect locations that reference this image
          const defectsWithLocations = Object.entries(sectionResult.results)
            .filter(([_, result]) => result.defectType !== 'Ok' && result.defectLocation)
            .filter(([_, result]) => result.defectLocation!.imageId === image.imageId)
            .map(([itemName, result]) => ({
              location: result.defectLocation!,
              itemName,
            }));

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

      // Render consolidated images section if any images exist
      if (consolidatedImages.size > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Defect Images:', 20, yPosition);
        yPosition += 4;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text('(Dots show defects from all sections)', 20, yPosition);
        doc.setTextColor(0);
        yPosition += 6;

        // Render images horizontally - 3 per row
        const imgWidth = 57; // One-third page width
        const imgHeight = (600 / 800) * imgWidth;
        const spacing = 5; // Small space between images
        const leftMargin = 20;
        const imagesPerRow = 3;

        let xPosition = leftMargin;
        let rowStartY = yPosition;
        let imageCount = 0;

        const images = Array.from(consolidatedImages.values());

        for (let i = 0; i < images.length; i++) {
          const consolidatedImage = images[i];

          try {
            // Check if we need a new page
            if (rowStartY + imgHeight > 260) {
              doc.addPage();
              rowStartY = 20;
              yPosition = 20;
              xPosition = leftMargin;
              imageCount = 0;
            }

            // Load image and draw all dots
            const imageDataURL = await loadImageAsDataURL(consolidatedImage.imageUrl);
            const imageWithDots = await drawDotsOnImage(
              imageDataURL,
              consolidatedImage.defectLocations,
              800,
              600
            );

            // Add image to PDF (no caption)
            doc.addImage(imageWithDots, 'JPEG', xPosition, rowStartY, imgWidth, imgHeight);

            imageCount++;

            // Check if we need to move to next row
            if (imageCount >= imagesPerRow) {
              // Move to next row
              xPosition = leftMargin;
              rowStartY += imgHeight + spacing;
              imageCount = 0;
            } else {
              // Move to next column
              xPosition += imgWidth + spacing;
            }
          } catch (error) {
            logger.error(`Failed to load/draw consolidated image ${consolidatedImage.imageName}:`, error);
          }
        }

        // Update yPosition to after all images
        if (imageCount > 0) {
          // Last row had images but wasn't full
          yPosition = rowStartY + imgHeight + 5;
        } else {
          // Last row was full
          yPosition = rowStartY + 5;
        }

        // Add spacing before section details
        yPosition += 5;
      }

      // Section Details header
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Defect Details:', 20, yPosition);
      yPosition += 4;

      for (const sectionKey of sectionKeys) {
        const sectionResult = inspection.sections[sectionKey];
        const sectionTemplate = template.sections[sectionKey];

        if (!sectionTemplate) continue;

        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Get defects for this section first to check if we need to show anything
        const sectionDefects = Object.entries(sectionResult.results)
          .filter(([_, result]) => result.defectType !== 'Ok')
          .map(([itemName, result]) => {
            // Get PDF dot number from mapping if location exists
            let pdfDotNumber: number | null = null;
            if (result.defectLocation) {
              const mappingKey = `${sectionKey}_${result.defectLocation.dotNumber}`;
              pdfDotNumber = dotNumberMapping.get(mappingKey) || null;
            }

            // Add dot number prefix using PDF number
            const dotPrefix = pdfDotNumber !== null ? `[${pdfDotNumber}] ` : '';
            return {
              row: [
                dotPrefix + itemName,
                result.defectType,
                result.notes || '-',
                result.checkedBy || '-',
                result.status || '',  // Empty by default for someone to fill in later
              ],
              sortNumber: pdfDotNumber !== null ? pdfDotNumber : 9999, // Sort items without dots to the end
            };
          })
          .sort((a, b) => a.sortNumber - b.sortNumber) // Sort by PDF dot number
          .map(item => item.row); // Extract just the row data

        // Only show sections with defects
        if (sectionDefects.length > 0) {
          // Section Header - More compact, on same line
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${getLocalizedText(sectionTemplate.sectionName)}:`, 20, yPosition);

          if (sectionResult.inspectorName) {
            doc.setFont('helvetica', 'normal');
            doc.text(`${sectionResult.inspectorName}`, 70, yPosition);
          }
          yPosition += 3;

          // Images are now shown at the top in consolidated section
          // Proceed directly to defect table

          autoTable(doc, {
            startY: yPosition,
            head: [['Item', 'Defect', 'Notes', 'Inspector', 'Status']],
            body: sectionDefects,
            theme: 'striped',
            headStyles: { fillColor: [108, 117, 125], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 20, right: 20 },
            styles: { cellPadding: 2 },
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 28 },
              2: { cellWidth: 45 },
              3: { cellWidth: 35 },
              4: { cellWidth: 22 },  // New Status column
            },
          });
          yPosition = (doc as any).lastAutoTable.finalY + 4;
        }
      }

      // Footer with generation timestamp
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128);
        doc.text(
          `Generated: ${formatDateForPDF(new Date())} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Open PDF in new tab instead of downloading
      const filename = `Inspection_${inspection.vin}_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      // Open in new tab for preview and printing
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // If popup blocked, fallback to download
        doc.save(filename);
        alert('Please allow popups to preview the report, or use the downloaded file.');
      }

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
};
