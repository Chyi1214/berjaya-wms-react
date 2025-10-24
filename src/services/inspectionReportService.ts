// Inspection Report Service - Generate PDF reports for car inspections
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CarInspection, InspectionTemplate, InspectionSection } from '../types/inspection';
import { inspectionService } from './inspectionService';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('InspectionReportService');

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
      doc.text(inspection.status.toUpperCase(), 120, yPosition);
      yPosition += 6;

      // Dates - Single line
      if (inspection.startedAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Started:', 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(inspection.startedAt).toLocaleString(), 40, yPosition);
        yPosition += 6;
      }

      if (inspection.completedAt) {
        doc.setFont('helvetica', 'bold');
        doc.text('Completed:', 20, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(inspection.completedAt).toLocaleString(), 45, yPosition);

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

      // Defect Summary Table
      const defectSummaryData = Object.entries(summary.defectsByType)
        .filter(([type, count]) => type !== 'Ok' && count > 0)
        .map(([type, count]) => [type, count.toString()]);

      if (defectSummaryData.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Defect Summary:', 20, yPosition);
        yPosition += 3;

        autoTable(doc, {
          startY: yPosition,
          head: [['Type', 'Count']],
          body: defectSummaryData,
          theme: 'grid',
          headStyles: { fillColor: [220, 53, 69], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 20, right: 20 },
          styles: { cellPadding: 2 },
        });
        yPosition = (doc as any).lastAutoTable.finalY + 5;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('No defects found', 20, yPosition);
        yPosition += 7;
      }

      // Section Details header
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Defect Details:', 20, yPosition);
      yPosition += 4;

      // Iterate through each section
      const sectionKeys: InspectionSection[] = [
        'right_outside',
        'left_outside',
        'front_back',
        'interior_right',
        'interior_left',
      ];

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
          .map(([itemName, result]) => [
            itemName,
            result.defectType,
            result.notes || '-',
            result.checkedBy || '-',
            result.status || '',  // Empty by default for someone to fill in later
          ]);

        // Only show sections with defects
        if (sectionDefects.length > 0) {
          // Section Header - More compact, on same line
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${sectionTemplate.sectionName}:`, 20, yPosition);

          if (sectionResult.inspectorName) {
            doc.setFont('helvetica', 'normal');
            doc.text(`${sectionResult.inspectorName}`, 70, yPosition);
          }
          yPosition += 3;

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
          `Generated: ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
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
