// Batch Management Service - Section 5.3 Implementation
import { collection, addDoc, getDocs, query, where, doc, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { CarType, Batch, ZoneBOMMapping, BatchHealthCheck, BatchItem, VinPlan, BatchReceiptLine, BatchVinHealthReport, VinHealthResult } from '../types/inventory';
import { createModuleLogger } from './logger';
import { tableStateService } from './tableState';
import { bomService } from './bom';

const logger = createModuleLogger('BatchManagement');

class BatchManagementService {
  // Car Types Collection
  async createCarType(carType: Omit<CarType, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating car type:', carType.carCode);
      const newCarType: CarType = {
        ...carType,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'carTypes', carType.carCode), newCarType);
      logger.info('Car type created successfully:', carType.carCode);
      return carType.carCode;
    } catch (error) {
      logger.error('Failed to create car type:', error);
      throw error;
    }
  }

  async getAllCarTypes(): Promise<CarType[]> {
    try {
      const carTypesRef = collection(db, 'carTypes');
      const snapshot = await getDocs(query(carTypesRef, orderBy('carCode')));
      return snapshot.docs.map(doc => ({ ...doc.data() } as CarType));
    } catch (error) {
      logger.error('Failed to get car types:', error);
      throw error;
    }
  }

  async uploadCarTypesFromCSV(csvData: string, _updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number; };
  }> {
    try {
      logger.info('Starting car types CSV upload');
      const lines = csvData.trim().split('\n');
      const header = lines[0];
      
      if (!header.includes('carCode') || !header.includes('name')) {
        throw new Error('CSV must contain carCode and name columns');
      }
      
      const results: { success: number; errors: string[]; stats: { totalRows: number; skippedRows: number; } } = { 
        success: 0, 
        errors: [], 
        stats: { totalRows: lines.length - 1, skippedRows: 0 }
      };
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          results.stats.skippedRows++;
          continue;
        }
        
        const parts = line.split(',').map(s => s.trim());
        const [carCode, name, description = ''] = parts;
        
        if (!carCode || !name) {
          results.errors.push(`Row ${i + 1}: Missing carCode or name`);
          results.stats.skippedRows++;
          continue;
        }
        
        try {
          await this.createCarType({ carCode, name, description: description || undefined });
          results.success++;
        } catch (error) {
          results.errors.push(`Row ${i + 1}: Failed to create ${carCode} - ${error}`);
          results.stats.skippedRows++;
        }
      }
      
      logger.info('Car types CSV upload completed:', results);
      return results;
    } catch (error) {
      logger.error('Failed to upload car types CSV:', error);
      throw error;
    }
  }

  // Batch Collection
  async createBatch(batch: Omit<Batch, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating batch:', batch.batchId);
      const newBatch: Batch = {
        ...batch,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'batches', batch.batchId), newBatch);
      logger.info('Batch created successfully:', batch.batchId);
      return batch.batchId;
    } catch (error) {
      logger.error('Failed to create batch:', error);
      throw error;
    }
  }

  async getAllBatches(): Promise<Batch[]> {
    try {
      const batchesRef = collection(db, 'batches');
      const snapshot = await getDocs(query(batchesRef, orderBy('batchId')));
      return snapshot.docs.map(doc => ({ ...doc.data() } as Batch));
    } catch (error) {
      logger.error('Failed to get batches:', error);
      throw error;
    }
  }

  async uploadBatchesFromCSV(csvData: string, _updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number; };
  }> {
    try {
      logger.info('Starting batches CSV upload');
      const lines = csvData.trim().split('\n');
      const header = lines[0];
      
      if (!header.includes('batchId') || !header.includes('carType') || !header.includes('carVins')) {
        throw new Error('CSV must contain batchId, carType, and carVins columns');
      }
      
      const results: { success: number; errors: string[]; stats: { totalRows: number; skippedRows: number; } } = { 
        success: 0, 
        errors: [], 
        stats: { totalRows: lines.length - 1, skippedRows: 0 }
      };
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          results.stats.skippedRows++;
          continue;
        }
        
        const parts = line.split(',').map(s => s.trim());
        const [batchId, carType, carVinsStr, name = '', itemsStr = ''] = parts;
        
        if (!batchId || !carType || !carVinsStr) {
          results.errors.push(`Row ${i + 1}: Missing required fields (batchId, carType, carVins)`);
          results.stats.skippedRows++;
          continue;
        }
        
        try {
          const carVins = carVinsStr.split('|').map(vin => vin.trim()).filter(vin => vin);
          const items: BatchItem[] = itemsStr ? 
            itemsStr.split('|').map(item => {
              const [sku, quantity, itemName] = item.split(':');
              return { sku: sku.trim(), quantity: parseInt(quantity) || 1, name: itemName?.trim() || sku };
            }) : [];
          
          await this.createBatch({
            batchId,
            name: name || undefined,
            items,
            carVins,
            carType,
            totalCars: carVins.length,
            status: 'planning'
          });
          results.success++;
        } catch (error) {
          results.errors.push(`Row ${i + 1}: Failed to create batch ${batchId} - ${error}`);
          results.stats.skippedRows++;
        }
      }
      
      logger.info('Batches CSV upload completed:', results);
      return results;
    } catch (error) {
      logger.error('Failed to upload batches CSV:', error);
      throw error;
    }
  }

  // Zone BOM Mapping Collection
  async createZoneBOMMapping(mapping: Omit<ZoneBOMMapping, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating zone BOM mapping:', `${mapping.zoneId}-${mapping.carCode}`);
      const newMapping: ZoneBOMMapping = {
        ...mapping,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mappingId = `${mapping.zoneId}_${mapping.carCode}_${mapping.bomCode}`;
      await setDoc(doc(db, 'zoneBOMMappings', mappingId), newMapping);
      logger.info('Zone BOM mapping created successfully:', mappingId);
      return mappingId;
    } catch (error) {
      logger.error('Failed to create zone BOM mapping:', error);
      throw error;
    }
  }

  async getZoneBOMMappings(zoneId?: string, carCode?: string): Promise<ZoneBOMMapping[]> {
    try {
      const mappingsRef = collection(db, 'zoneBOMMappings');
      let q = query(mappingsRef);
      
      if (zoneId) {
        q = query(q, where('zoneId', '==', zoneId));
      }
      if (carCode) {
        q = query(q, where('carCode', '==', carCode));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data() } as ZoneBOMMapping));
    } catch (error) {
      logger.error('Failed to get zone BOM mappings:', error);
      throw error;
    }
  }

  // Batch Health Checking
  async performBatchHealthCheck(batchId: string, checkedBy: string): Promise<BatchHealthCheck> {
    try {
      logger.info('Performing batch health check for:', batchId);
      
      // Get batch information
      const batchDoc = await getDocs(query(collection(db, 'batches'), where('batchId', '==', batchId)));
      if (batchDoc.empty) {
        throw new Error(`Batch ${batchId} not found`);
      }
      
      const batch = batchDoc.docs[0].data() as Batch;
      
      // Get current inventory levels (Expected table represents current availability)
      const expectedInventoryRef = collection(db, 'expectedInventory');
      const expectedSnapshot = await getDocs(expectedInventoryRef);
      const expectedInventory = expectedSnapshot.docs.map(doc => doc.data());
      
      // Calculate inventory by SKU (sum across all locations)
      const inventoryBySkuMap = new Map<string, number>();
      expectedInventory.forEach((item: any) => {
        const currentAmount = inventoryBySkuMap.get(item.sku) || 0;
        inventoryBySkuMap.set(item.sku, currentAmount + (item.amount || 0));
      });
      
      // Check each component requirement against available inventory
      const missingComponents: Array<{
        sku: string;
        name: string;
        needed: number;
        available: number;
        shortfall: number;
      }> = [];
      
      const excessComponents: Array<{
        sku: string;
        name: string;
        excess: number;
      }> = [];
      
      let minProducibleCars = Infinity;
      
      batch.items.forEach(item => {
        const availableInventory = inventoryBySkuMap.get(item.sku) || 0;
        const totalNeeded = item.quantity * batch.totalCars;
        const carsProducibleWithThisComponent = Math.floor(availableInventory / item.quantity);
        
        minProducibleCars = Math.min(minProducibleCars, carsProducibleWithThisComponent);
        
        if (availableInventory < totalNeeded) {
          missingComponents.push({
            sku: item.sku,
            name: item.name,
            needed: totalNeeded,
            available: availableInventory,
            shortfall: totalNeeded - availableInventory
          });
        }
        
        // Check for significant excess (more than 2x batch requirement)
        const excessThreshold = totalNeeded * 2;
        if (availableInventory > excessThreshold) {
          excessComponents.push({
            sku: item.sku,
            name: item.name,
            excess: availableInventory - totalNeeded
          });
        }
      });
      
      // If no items found, assume we can't produce any cars
      if (minProducibleCars === Infinity) {
        minProducibleCars = 0;
      }
      
      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'critical';
      if (minProducibleCars >= batch.totalCars) {
        healthStatus = 'healthy';
      } else if (minProducibleCars > 0) {
        healthStatus = 'warning';
      } else {
        healthStatus = 'critical';
      }
      
      const healthCheck: BatchHealthCheck = {
        batchId,
        healthStatus,
        availableComponents: minProducibleCars,
        missingComponents,
        excessComponents,
        checkedAt: new Date(),
        checkedBy
      };
      
      // Save the health check result
      await setDoc(doc(db, 'batchHealthChecks', `${batchId}_${Date.now()}`), healthCheck);
      
      logger.info('Batch health check completed:', healthCheck);
      return healthCheck;
    } catch (error) {
      logger.error('Failed to perform batch health check:', error);
      throw error;
    }
  }

  // ========= New Section: CSV Ingestion (VIN plan, Packing list) =========
  async uploadVinPlansFromCSV(csvData: string, _updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number };
  }> {
    logger.info('Starting VIN plans CSV upload');
    const lines = csvData.trim().split('\n');
    const header = lines[0]?.toLowerCase();
    if (!header || !header.includes('batchid') || !header.includes('vin') || !header.includes('cartype')) {
      throw new Error('CSV must contain batchId, vin, carType columns');
    }

    const results = { success: 0, errors: [] as string[], stats: { totalRows: Math.max(lines.length - 1, 0), skippedRows: 0 } };
    const vinPlansCol = collection(db, 'vin_plans');
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) { results.stats.skippedRows++; continue; }
      const parts = raw.split(',').map(s => s.trim());
      const [batchId, vin, carType] = parts;
      if (!batchId || !vin || !carType) {
        results.errors.push(`Row ${i + 1}: Missing batchId, vin, or carType`);
        results.stats.skippedRows++;
        continue;
      }
      const plan: VinPlan = { batchId, vin: vin.toUpperCase(), carType, createdAt: new Date(), updatedAt: new Date() };
      try {
        await addDoc(vinPlansCol, plan);
        results.success++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: Failed to save VIN ${vin} - ${err}`);
        results.stats.skippedRows++;
      }
    }
    logger.info('VIN plans CSV upload completed', results);
    return results;
  }

  async uploadPackingListFromCSV(csvData: string, uploadedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number };
  }> {
    logger.info('Starting packing list CSV upload');
    const lines = csvData.trim().split('\n');
    const header = lines[0]?.toLowerCase();
    if (!header || !header.includes('batchid') || !header.includes('sku') || !header.includes('quantity')) {
      throw new Error('CSV must contain batchId, sku, quantity columns');
    }

    const results = { success: 0, errors: [] as string[], stats: { totalRows: Math.max(lines.length - 1, 0), skippedRows: 0 } };
    const receiptsCol = collection(db, 'batch_receipts');
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) { results.stats.skippedRows++; continue; }
      // Allow optional columns: location, boxId, notes
      const parts = raw.split(',').map(s => s.trim());
      const [batchId, sku, quantityStr, location, boxId, notes] = parts;
      const quantity = parseInt(quantityStr, 10);
      if (!batchId || !sku || isNaN(quantity) || quantity <= 0) {
        results.errors.push(`Row ${i + 1}: Invalid batchId/sku/quantity`);
        results.stats.skippedRows++;
        continue;
      }
      const line: BatchReceiptLine = { batchId, sku, quantity, location: location || undefined, boxId: boxId || undefined, notes: notes || undefined, uploadedAt: new Date(), uploadedBy };
      try {
        await addDoc(receiptsCol, line);
        results.success++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: Failed to save receipt for ${sku} - ${err}`);
        results.stats.skippedRows++;
      }
    }
    logger.info('Packing list CSV upload completed', results);
    return results;
  }

  // ========= New Section: VIN-level Batch Health (uses expected inventory totals) =========
  async computeBatchHealthByVIN(batchId: string): Promise<BatchVinHealthReport> {
    logger.info('Computing VIN-level batch health', { batchId });

    // Load VIN plans for this batch
    const plansSnap = await getDocs(query(collection(db, 'vin_plans'), where('batchId', '==', batchId)));
    const plans: VinPlan[] = plansSnap.docs.map(d => d.data() as VinPlan);
    const totalVins = plans.length;

    // Aggregate expected inventory totals by SKU
    const expectedEntries = await tableStateService.getExpectedInventory();
    const availableBySku = new Map<string, number>();
    expectedEntries.forEach(e => {
      const current = availableBySku.get(e.sku) || 0;
      availableBySku.set(e.sku, current + (e.amount || 0));
    });

    // Build required-per-carType cache by summing BOMs from zone mappings (consumeOnCompletion=true)
    const requiredByCarType = new Map<string, Map<string, number>>();
    const getRequirementsForCarType = async (carType: string): Promise<Map<string, number>> => {
      if (requiredByCarType.has(carType)) return requiredByCarType.get(carType)!;
      const req = new Map<string, number>();
      const mappings = await this.getZoneBOMMappings(undefined, carType);
      const consumeMappings = mappings.filter(m => m.consumeOnCompletion);
      const uniqueBomCodes = [...new Set(consumeMappings.map(m => m.bomCode))];
      for (const bomCode of uniqueBomCodes) {
        const bom = await bomService.getBOMByCode(bomCode);
        if (!bom) continue;
        for (const c of bom.components) {
          req.set(c.sku, (req.get(c.sku) || 0) + c.quantity);
        }
      }
      requiredByCarType.set(carType, req);
      return req;
    };

    // Allocate inventory across VINs and compute results
    const results: VinHealthResult[] = [];
    const shortageTotals = new Map<string, number>();
    for (const plan of plans) {
      const perVinReq = await getRequirementsForCarType(plan.carType);
      // Determine if all requirements can be satisfied with current availableBySku
      const missing: Array<{ sku: string; required: number; available: number; shortfall: number }> = [];
      perVinReq.forEach((qty, sku) => {
        const available = availableBySku.get(sku) || 0;
        if (available < qty) {
          missing.push({ sku, required: qty, available, shortfall: qty - available });
        }
      });

      if (missing.length === 0) {
        // Mark as ready and deduct inventory
        perVinReq.forEach((qty, sku) => {
          const available = availableBySku.get(sku) || 0;
          availableBySku.set(sku, Math.max(0, available - qty));
        });
        results.push({ vin: plan.vin, carType: plan.carType, status: 'ready' });
      } else {
        // Blocked; record shortages but do not deduct
        results.push({ vin: plan.vin, carType: plan.carType, status: 'blocked', missing });
        for (const m of missing) {
          shortageTotals.set(m.sku, (shortageTotals.get(m.sku) || 0) + m.shortfall);
        }
      }
    }

    const readyVins = results.filter(r => r.status === 'ready').length;
    const blockedVins = totalVins - readyVins;
    const topShortages = [...shortageTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, totalShortfall]) => ({ sku, totalShortfall }));

    return {
      summary: {
        batchId,
        totalVins,
        readyVins,
        blockedVins,
        topShortages,
        checkedAt: new Date()
      },
      results
    };
  }

  // Batch Consumption Integration
  async consumeBOMForCarCompletion(
    vin: string, 
    zoneId: string, 
    carType: string, 
    completedBy: string
  ): Promise<void> {
    try {
      logger.info('Processing BOM consumption for car completion:', { vin, zoneId, carType });
      
      // Get zone BOM mappings for this zone and car type
      const mappings = await this.getZoneBOMMappings(zoneId, carType);
      
      if (mappings.length === 0) {
        logger.info('No BOM mappings found for zone/car type combination:', { zoneId, carType });
        return;
      }
      
      // Process each BOM mapping
      for (const mapping of mappings) {
        if (!mapping.consumeOnCompletion) {
          logger.info('Skipping BOM consumption (consumeOnCompletion=false):', mapping.bomCode);
          continue;
        }
        
        try {
          // Get BOM details from the BOM service
          const bomRef = collection(db, 'boms');
          const bomQuery = query(bomRef, where('bomCode', '==', mapping.bomCode));
          const bomSnapshot = await getDocs(bomQuery);
          
          if (bomSnapshot.empty) {
            logger.warn('BOM not found:', mapping.bomCode);
            continue;
          }
          
          const bom = bomSnapshot.docs[0].data();
          logger.info('Found BOM for consumption:', bom);
          
          // Service import handled by Firebase operations directly
          
          // Consume each component in the BOM
          for (const component of bom.components || []) {
            try {
              // Get current expected inventory for this component
              const expectedInventoryRef = collection(db, 'expectedInventory');
              const componentQuery = query(
                expectedInventoryRef, 
                where('sku', '==', component.sku)
              );
              const componentSnapshot = await getDocs(componentQuery);
              
              let totalConsumed = 0;
              const updates: Promise<void>[] = [];
              
              // Find inventory entries to consume from (across all locations)
              for (const doc of componentSnapshot.docs) {
                if (totalConsumed >= component.quantity) break;
                
                const inventoryEntry = doc.data();
                const availableAmount = inventoryEntry.amount || 0;
                const amountToConsume = Math.min(
                  component.quantity - totalConsumed, 
                  availableAmount
                );
                
                if (amountToConsume > 0) {
                  // Create transaction record for BOM consumption
                  const transactionRef = collection(db, 'transactions');
                  const transactionDoc = {
                    id: `bom_${mapping.bomCode}_${vin}_${Date.now()}`,
                    sku: component.sku,
                    itemName: component.name,
                    amount: -amountToConsume, // Negative for consumption
                    previousAmount: availableAmount,
                    newAmount: availableAmount - amountToConsume,
                    location: inventoryEntry.location,
                    transactionType: 'adjustment',
                    status: 'completed',
                    performedBy: completedBy,
                    timestamp: new Date(),
                    notes: `BOM consumption: ${mapping.bomCode} for car ${vin} in zone ${zoneId}`,
                    reference: `CAR_${vin}_ZONE_${zoneId}`
                  };
                  
                  updates.push(addDoc(transactionRef, transactionDoc).then(() => {}));
                  
                  // Update expected inventory
                  updates.push(updateDoc(doc.ref, {
                    amount: availableAmount - amountToConsume,
                    updatedAt: new Date(),
                    countedBy: `bom.${completedBy}`
                  }));
                  
                  totalConsumed += amountToConsume;
                  logger.info(`Consuming ${amountToConsume} x ${component.sku} from ${inventoryEntry.location}`);
                }
              }
              
              // Execute all updates for this component
              await Promise.all(updates);
              
              if (totalConsumed < component.quantity) {
                logger.warn(`Insufficient inventory for ${component.sku}: needed ${component.quantity}, consumed ${totalConsumed}`);
              }
            } catch (error) {
              logger.error(`Failed to consume component ${component.sku}:`, error);
            }
          }
          
          logger.info(`BOM consumption completed for ${mapping.bomCode} on car ${vin}`);
        } catch (error) {
          logger.error(`Failed to process BOM mapping ${mapping.bomCode}:`, error);
        }
      }
      
      logger.info('BOM consumption processing completed for car:', vin);
    } catch (error) {
      logger.error('Failed to process BOM consumption:', error);
      throw error;
    }
  }

  // Utility functions
  async generateSampleData(_updatedBy: string): Promise<void> {
    try {
      logger.info('Generating sample batch data');
      
      // Create sample car types
      await this.createCarType({
        carCode: 'TK1_Red_High',
        name: 'Truck Model 1 - Red High Spec',
        description: 'Premium red truck with high-end features'
      });
      
      await this.createCarType({
        carCode: 'TK1_Red_Low',
        name: 'Truck Model 1 - Red Basic',
        description: 'Basic red truck with standard features'
      });
      
      await this.createCarType({
        carCode: 'T9_Blue_Low',
        name: 'Truck Model 9 - Blue Basic',
        description: 'Basic blue truck with standard features'
      });
      
      // Create sample batch
      await this.createBatch({
        batchId: '603',
        name: 'Production Batch 603',
        items: [
          { sku: 'A001', quantity: 50, name: 'Engine Part A' },
          { sku: 'B001', quantity: 25, name: 'Body Panel B' },
          { sku: 'C001', quantity: 10, name: 'Control Module C' }
        ],
        carVins: ['VIN001603', 'VIN002603', 'VIN003603'],
        carType: 'TK1_Red_High',
        totalCars: 3,
        status: 'planning'
      });
      
      // Create sample zone BOM mappings
      await this.createZoneBOMMapping({
        zoneId: '1',
        carCode: 'TK1_Red_High',
        bomCode: 'BOM001',
        consumeOnCompletion: true
      });
      
      await this.createZoneBOMMapping({
        zoneId: '15',
        carCode: 'TK1_Red_High', 
        bomCode: 'BOM002',
        consumeOnCompletion: true
      });
      
      await this.createZoneBOMMapping({
        zoneId: '22',
        carCode: 'T9_Blue_Low',
        bomCode: 'BOM003',
        consumeOnCompletion: false // This one won't consume on completion
      });
      
      logger.info('Sample batch data generated successfully');
    } catch (error) {
      logger.error('Failed to generate sample data:', error);
      throw error;
    }
  }
}

export const batchManagementService = new BatchManagementService();
