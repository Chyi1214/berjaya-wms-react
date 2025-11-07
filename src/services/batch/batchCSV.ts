// Batch CSV Service - CSV import/export operations
import { collection, addDoc } from '../costTracking/firestoreWrapper';
import { db } from '../firebase';
import { CarType, Batch, VinPlan, BatchItem } from '../../types/inventory';
import { createModuleLogger } from '../logger';
import { batchCoreService } from './batchCore';

const logger = createModuleLogger('BatchCSV');

export class BatchCSVService {
  
  // ========= Car Types CSV Upload =========
  async uploadCarTypesFromCSV(csvData: string, _updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number; };
  }> {
    try {
      logger.info('Starting car types CSV upload');
      
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['carcode', 'name', 'description'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      let successCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < headers.length || row.every(cell => !cell)) {
          skippedCount++;
          continue; // Skip empty rows
        }
        
        try {
          const carCodeIdx = headers.indexOf('carcode');
          const nameIdx = headers.indexOf('name');
          const descriptionIdx = headers.indexOf('description');
          
          const carType: Omit<CarType, 'createdAt' | 'updatedAt'> = {
            carCode: row[carCodeIdx],
            name: row[nameIdx],
            description: row[descriptionIdx]
          };
          
          // Validate required fields
          if (!carType.carCode || !carType.name) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }
          
          // Save to Firestore
          await batchCoreService.createCarType(carType);
          successCount++;
          
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      logger.info(`Car types CSV upload completed: ${successCount} success, ${errors.length} errors`);
      
      return {
        success: successCount,
        errors,
        stats: {
          totalRows: lines.length - 1,
          skippedRows: skippedCount
        }
      };
      
    } catch (error) {
      logger.error('Failed to upload car types CSV:', error);
      throw error;
    }
  }

  // ========= Batches CSV Upload =========
  async uploadBatchesFromCSV(csvData: string, _updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number; };
  }> {
    try {
      logger.info('Starting batches CSV upload');
      
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['batchid', 'name', 'cartype', 'vins'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      let successCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < headers.length || row.every(cell => !cell)) {
          skippedCount++;
          continue; // Skip empty rows
        }
        
        try {
          const batchIdIdx = headers.indexOf('batchid');
          const nameIdx = headers.indexOf('name');
          const carTypeIdx = headers.indexOf('cartype');
          const vinsIdx = headers.indexOf('vins');
          
          // Parse VIN numbers (pipe-separated)
          const vinString = row[vinsIdx] || '';
          const carVins = vinString.split('|').map(vin => vin.trim()).filter(vin => vin);
          
          const batch: Omit<Batch, 'createdAt' | 'updatedAt'> = {
            batchId: row[batchIdIdx],
            name: row[nameIdx],
            carType: row[carTypeIdx],
            carVins,
            totalCars: carVins.length,
            status: 'planning',
            items: [] // Will be populated when BOMs are assigned
          };
          
          // Validate required fields
          if (!batch.batchId || !batch.name || !batch.carType) {
            errors.push(`Row ${i + 1}: Missing required fields (batchId, name, carType)`);
            continue;
          }
          
          // Save to Firestore
          await batchCoreService.createBatch(batch);
          successCount++;
          
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      logger.info(`Batches CSV upload completed: ${successCount} success, ${errors.length} errors`);
      
      return {
        success: successCount,
        errors,
        stats: {
          totalRows: lines.length - 1,
          skippedRows: skippedCount
        }
      };
      
    } catch (error) {
      logger.error('Failed to upload batches CSV:', error);
      throw error;
    }
  }

  // ========= VIN Plans CSV Upload =========
  async uploadVinPlansFromCSV(csvData: string, _updatedBy: string): Promise<{ 
    success: number; 
    errors: string[]; 
    stats: { totalRows: number; skippedRows: number }; 
  }> {
    try {
      logger.info('Starting VIN plans CSV upload');
      
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['batchid', 'vin', 'cartype'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      let successCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < headers.length || row.every(cell => !cell)) {
          skippedCount++;
          continue; // Skip empty rows
        }
        
        try {
          const batchIdIdx = headers.indexOf('batchid');
          const vinIdx = headers.indexOf('vin');
          const carTypeIdx = headers.indexOf('cartype');
          
          const vinPlan: Omit<VinPlan, 'createdAt' | 'updatedAt'> = {
            batchId: row[batchIdIdx],
            vin: row[vinIdx],
            carType: row[carTypeIdx]
          };
          
          // Validate required fields
          if (!vinPlan.batchId || !vinPlan.vin || !vinPlan.carType) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }
          
          // Save to Firestore
          const vinPlanCol = collection(db, 'vin_plans');
          await addDoc(vinPlanCol, vinPlan);
          successCount++;
          
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      logger.info(`VIN plans CSV upload completed: ${successCount} success, ${errors.length} errors`);
      
      return {
        success: successCount,
        errors,
        stats: {
          totalRows: lines.length - 1,
          skippedRows: skippedCount
        }
      };
      
    } catch (error) {
      logger.error('Failed to upload VIN plans CSV:', error);
      throw error;
    }
  }

  // ========= Packing List CSV Upload =========
  async uploadPackingListFromCSV(csvData: string, uploadedBy: string): Promise<{ 
    success: number; 
    errors: string[]; 
    stats: { totalRows: number; skippedRows: number }; 
  }> {
    try {
      logger.info('Starting packing list CSV upload');
      
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['batchid', 'vin', 'receiptid', 'components'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      let successCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < headers.length || row.every(cell => !cell)) {
          skippedCount++;
          continue; // Skip empty rows
        }
        
        try {
          const batchIdIdx = headers.indexOf('batchid');
          const vinIdx = headers.indexOf('vin');
          const receiptIdIdx = headers.indexOf('receiptid');
          const componentsIdx = headers.indexOf('components');
          
          // Parse components (format: "A001:2|B001:1|C001:3")
          const componentsString = row[componentsIdx] || '';
          const components: BatchItem[] = [];
          
          if (componentsString) {
            const componentPairs = componentsString.split('|');
            for (const pair of componentPairs) {
              const [sku, quantityStr] = pair.split(':');
              const quantity = parseInt(quantityStr) || 0;
              if (sku && quantity > 0) {
                components.push({
                  sku: sku.trim(),
                  quantity,
                  name: `Item ${sku.trim()}` // Default name, can be enhanced with Item Master lookup
                });
              }
            }
          }
          
          const receipt = {
            batchId: row[batchIdIdx],
            vin: row[vinIdx],
            receiptId: row[receiptIdIdx],
            components,
            uploadedBy,
            uploadedAt: new Date(),
            status: 'received'
          };
          
          // Validate required fields
          if (!receipt.batchId || !receipt.vin || !receipt.receiptId || components.length === 0) {
            errors.push(`Row ${i + 1}: Missing required fields or no valid components`);
            continue;
          }
          
          // Save to Firestore
          const receiptCol = collection(db, 'batch_receipts');
          await addDoc(receiptCol, receipt);
          successCount++;
          
        } catch (error) {
          console.error(`Error processing row ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      logger.info(`Packing list CSV upload completed: ${successCount} success, ${errors.length} errors`);
      
      return {
        success: successCount,
        errors,
        stats: {
          totalRows: lines.length - 1,
          skippedRows: skippedCount
        }
      };
      
    } catch (error) {
      logger.error('Failed to upload packing list CSV:', error);
      throw error;
    }
  }

  // ========= CSV Template Generation =========
  
  generateCarTypesTemplate(): string {
    return [
      'CarCode,Name,Description',
      'TK1_Red_High,Truck Model 1 - Red High Spec,High specification truck model in red',
      'TK2_Blue_Standard,Truck Model 2 - Blue Standard,Standard truck model in blue',
      'VAN1_White_Cargo,Van Model 1 - White Cargo,Cargo van in white color'
    ].join('\n');
  }

  generateBatchesTemplate(): string {
    return [
      'BatchId,Name,CarType,VINs',
      '603,Production Batch 603,TK1_Red_High,VIN001603|VIN002603|VIN003603',
      '604,Production Batch 604,TK2_Blue_Standard,VIN001604|VIN002604',
      '605,Production Batch 605,VAN1_White_Cargo,VIN001605|VIN002605|VIN003605|VIN004605'
    ].join('\n');
  }

  generateVinPlansTemplate(): string {
    return [
      'BatchId,VIN,CarType',
      '603,VIN001603,TK1_Red_High',
      '603,VIN002603,TK1_Red_High', 
      '603,VIN003603,TK1_Red_High',
      '604,VIN001604,TK2_Blue_Standard',
      '604,VIN002604,TK2_Blue_Standard'
    ].join('\n');
  }

  generatePackingListTemplate(): string {
    return [
      'BatchId,VIN,ReceiptId,Components',
      '603,VIN001603,RCP-603-001,A001:2|B001:1|C001:3',
      '603,VIN002603,RCP-603-002,A001:2|B001:1|C001:3',
      '604,VIN001604,RCP-604-001,A001:1|B001:2|D001:1',
      '604,VIN002604,RCP-604-002,A001:1|B001:2|D001:1'
    ].join('\n');
  }
}

// Export singleton instance
export const batchCSVService = new BatchCSVService();