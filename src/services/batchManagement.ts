// Batch Management Service - Section 5.3 Implementation
import { collection, addDoc, getDocs, query, where, doc, setDoc, updateDoc, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CarType, Batch, ZoneBOMMapping, BatchHealthCheck, BatchItem, VinPlan, BatchVinHealthReport, VinHealthResult, BatchRequirement, BatchHealthStatus } from '../types/inventory';
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

  async getBatchById(batchId: string): Promise<Batch | null> {
    try {
      const batchDocRef = doc(db, 'batches', batchId);
      const batchDoc = await getDoc(batchDocRef);
      if (batchDoc.exists()) {
        return batchDoc.data() as Batch;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get batch by ID: ${batchId}`, error);
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
  async uploadVinPlansFromCSV(csvData: string, _updatedBy: string): Promise<{ success: number; errors: string[]; stats: { totalRows: number; skippedRows: number }; }> {
    logger.info('Starting VIN plans CSV upload');
    const lines = csvData.trim().split('\n');
    const header = lines[0]?.toLowerCase();
    if (!header || !header.includes('batchid') || !header.includes('vin') || !header.includes('cartype')) {
      throw new Error('CSV must contain batchId, vin, carType columns');
    }

    const results = { success: 0, errors: [] as string[], stats: { totalRows: Math.max(lines.length - 1, 0), skippedRows: 0 } };
    const vinPlansCol = collection(db, 'vin_plans');
    const batchUpdates = new Map<string, { carVins: Set<string>, carType?: string }>();

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
        
        if (!batchUpdates.has(batchId)) {
          batchUpdates.set(batchId, { carVins: new Set(), carType: carType });
        }
        batchUpdates.get(batchId)!.carVins.add(vin.toUpperCase());
      } catch (err) {
        results.errors.push(`Row ${i + 1}: Failed to save VIN ${vin} - ${err}`);
        results.stats.skippedRows++;
      }
    }
    
    for (const [batchId, update] of batchUpdates.entries()) {
      try {
        const batchDocRef = doc(db, 'batches', batchId);
        const batchDoc = await getDoc(batchDocRef);
        if (batchDoc.exists()) {
          const batchData = batchDoc.data() as Batch;
          const updatedCarVins = [...new Set([...(batchData.carVins || []), ...update.carVins])];
          await updateDoc(batchDocRef, {
            carVins: updatedCarVins,
            totalCars: updatedCarVins.length,
            carType: batchData.carType || update.carType,
            updatedAt: new Date()
          });
        }
      } catch (err) {
        logger.error(`Failed to update batch ${batchId} with VINs:`, err);
      }
    }

    logger.info('VIN plans CSV upload completed', results);
    return results;
  }

  async uploadPackingListFromCSV(csvData: string, uploadedBy: string): Promise<{ success: number; errors: string[]; stats: { totalRows: number; skippedRows: number }; }> {
    logger.info('Starting packing list CSV upload');
    const lines = csvData.trim().split('\n');
    const header = lines[0]?.toLowerCase();
    if (!header || !header.includes('batchid') || !header.includes('sku') || !header.includes('quantity')) {
      throw new Error('CSV must contain batchId, sku, quantity columns');
    }

    const results = { success: 0, errors: [] as string[], stats: { totalRows: Math.max(lines.length - 1, 0), skippedRows: 0 } };
    const receiptsCol = collection(db, 'batch_receipts');
    const itemsByBatch = new Map<string, BatchItem[]>();

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
      const lineData = { batchId, sku, quantity, location, boxId, notes, uploadedAt: new Date(), uploadedBy };
      
      // Remove properties with undefined values, which are not supported by Firestore
      const cleanedLine = Object.fromEntries(Object.entries(lineData).filter(([, v]) => v !== undefined));

      try {
        await addDoc(receiptsCol, cleanedLine);
        results.success++;

        if (!itemsByBatch.has(batchId)) {
          itemsByBatch.set(batchId, []);
        }
        itemsByBatch.get(batchId)!.push({ sku, quantity, name: sku }); // Use SKU as name

      } catch (err) {
        results.errors.push(`Row ${i + 1}: Failed to save receipt for ${sku} - ${err}`);
        results.stats.skippedRows++;
      }
    }

    for (const [batchId, items] of itemsByBatch.entries()) {
      try {
        const batchDocRef = doc(db, 'batches', batchId);
        const batchDoc = await getDoc(batchDocRef);
        if (batchDoc.exists()) {
          const batchData = batchDoc.data() as Batch;
          const updatedItemsMap = new Map(batchData.items?.map(item => [item.sku, item]));
          
          for (const newItem of items) {
            if (updatedItemsMap.has(newItem.sku)) {
              const existingItem = updatedItemsMap.get(newItem.sku)!;
              existingItem.quantity += newItem.quantity;
              updatedItemsMap.set(newItem.sku, existingItem);
            } else {
              updatedItemsMap.set(newItem.sku, newItem);
            }
          }
          
          const updatedItems = Array.from(updatedItemsMap.values());
          await updateDoc(batchDocRef, {
            items: updatedItems,
            updatedAt: new Date()
          });
        }
      } catch (err) {
        logger.error(`Failed to update batch ${batchId} with packing list items:`, err);
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

  // Batch Deletion
  async deleteBatch(batchId: string): Promise<void> {
    try {
      logger.info('Deleting batch:', batchId);
      
      // Delete batch document
      const batchQuery = query(collection(db, 'batches'), where('batchId', '==', batchId));
      const batchSnapshot = await getDocs(batchQuery);
      
      if (batchSnapshot.empty) {
        throw new Error(`Batch ${batchId} not found`);
      }
      
      // Delete the batch document
      await deleteDoc(batchSnapshot.docs[0].ref);
      
      // Clean up related data
      // Delete batch requirements
      const batchRequirementsCol = collection(db, 'batchRequirements');
      const reqSnapshot = await getDocs(query(batchRequirementsCol, where('batchId', '==', batchId)));
      for (const reqDoc of reqSnapshot.docs) {
        await deleteDoc(reqDoc.ref);
      }
      
      // Delete VIN plans
      const vinPlansCol = collection(db, 'vin_plans');
      const vinSnapshot = await getDocs(query(vinPlansCol, where('batchId', '==', batchId)));
      for (const vinDoc of vinSnapshot.docs) {
        await deleteDoc(vinDoc.ref);
      }
      
      // Delete batch receipts
      const receiptsCol = collection(db, 'batch_receipts');
      const receiptSnapshot = await getDocs(query(receiptsCol, where('batchId', '==', batchId)));
      for (const receiptDoc of receiptSnapshot.docs) {
        await deleteDoc(receiptDoc.ref);
      }
      
      logger.info(`Batch ${batchId} and all related data deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete batch:', error);
      throw error;
    }
  }

  // ========= Smart Batch Health System - Efficient Tracking =========
  
  // Activate batch and create requirements tracking
  async activateBatchWithSmartHealth(batchId: string, _activatedBy: string): Promise<void> {
    try {
      logger.info('Activating batch with smart health tracking:', batchId);
      
      // Get batch data
      const batchDoc = await getDocs(query(collection(db, 'batches'), where('batchId', '==', batchId)));
      if (batchDoc.empty) {
        throw new Error(`Batch ${batchId} not found`);
      }
      
      const batch = batchDoc.docs[0].data() as Batch;
      
      // Calculate total requirements from packing list
      const batchRequirementsCol = collection(db, 'batchRequirements');
      
      // Clear any existing requirements for this batch
      const existingReqs = await getDocs(query(batchRequirementsCol, where('batchId', '==', batchId)));
      for (const reqDoc of existingReqs.docs) {
        await deleteDoc(reqDoc.ref);
      }
      
      // Create new requirements based on batch items (packing list)
      // Use Item Master as source of truth for names
      const { itemMasterService } = await import('./itemMaster');
      
      for (const item of batch.items) {
        // Get current name from Item Master
        let actualName = item.name; // fallback to cached name
        try {
          const itemMasterItem = await itemMasterService.getItemBySKU(item.sku);
          if (itemMasterItem) {
            actualName = itemMasterItem.name; // Use current name from Item Master
          }
        } catch (error) {
          logger.warn(`Could not fetch name from Item Master for ${item.sku}, using cached name`);
        }
        
        const requirement: BatchRequirement = {
          batchId,
          sku: item.sku,
          name: actualName, // Use actual name from Item Master
          totalNeeded: item.quantity,
          consumed: 0,
          remaining: item.quantity,
          carsCompleted: 0,
          totalCars: batch.totalCars,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await addDoc(batchRequirementsCol, requirement);
      }
      
      // Update batch status to in_progress
      await updateDoc(batchDoc.docs[0].ref, {
        status: 'in_progress',
        updatedAt: new Date()
      });
      
      logger.info(`Batch ${batchId} activated with ${batch.items.length} tracked requirements`);
    } catch (error) {
      logger.error('Failed to activate batch with smart health:', error);
      throw error;
    }
  }
  
  // Update requirements when a car is completed
  async updateBatchOnCarCompletion(batchId: string, vin: string, consumedComponents: Array<{sku: string, quantity: number}>, _completedBy: string): Promise<void> {
    try {
      logger.info('Updating batch requirements for car completion:', { batchId, vin });
      
      const batchRequirementsCol = collection(db, 'batchRequirements');
      
      // Update each consumed component
      for (const component of consumedComponents) {
        const reqQuery = query(
          batchRequirementsCol, 
          where('batchId', '==', batchId),
          where('sku', '==', component.sku)
        );
        
        const reqSnapshot = await getDocs(reqQuery);
        
        if (!reqSnapshot.empty) {
          const reqDoc = reqSnapshot.docs[0];
          const currentReq = reqDoc.data() as BatchRequirement;
          
          // Update consumption
          const newConsumed = currentReq.consumed + component.quantity;
          const newRemaining = Math.max(0, currentReq.totalNeeded - newConsumed);
          const newCarsCompleted = currentReq.carsCompleted + (1 / currentReq.totalCars); // Fractional completion
          
          await updateDoc(reqDoc.ref, {
            consumed: newConsumed,
            remaining: newRemaining,
            carsCompleted: Math.round(newCarsCompleted * currentReq.totalCars), // Round to whole cars
            updatedAt: new Date()
          });
          
          logger.info(`Updated ${component.sku}: consumed ${newConsumed}/${currentReq.totalNeeded}, remaining ${newRemaining}`);
        }
      }
      
    } catch (error) {
      logger.error('Failed to update batch on car completion:', error);
      throw error;
    }
  }
  
  // Get real-time batch health status
  async getBatchHealthStatus(batchId: string): Promise<BatchHealthStatus> {
    try {
      logger.info('Getting smart batch health status:', batchId);
      
      // Get batch requirements
      const batchRequirementsCol = collection(db, 'batchRequirements');
      const reqSnapshot = await getDocs(query(batchRequirementsCol, where('batchId', '==', batchId)));
      
      if (reqSnapshot.empty) {
        throw new Error(`No requirements found for batch ${batchId}. Batch may not be activated.`);
      }
      
      const requirements = reqSnapshot.docs.map(doc => doc.data() as BatchRequirement);
      
      // Get current inventory levels from Expected table (the real inventory data)
      const { tableStateService } = await import('./tableState');
      const expectedInventory = await tableStateService.getExpectedInventory();
      
      // Calculate inventory by SKU (sum across all locations)
      const inventoryBySkuMap = new Map<string, number>();
      expectedInventory.forEach((item) => {
        const currentAmount = inventoryBySkuMap.get(item.sku) || 0;
        inventoryBySkuMap.set(item.sku, currentAmount + (item.amount || 0));
      });
      
      // Analyze each requirement against current inventory
      const blockedComponents: Array<{sku: string; name: string; needed: number; available: number; shortfall: number}> = [];
      const excessComponents: Array<{sku: string; name: string; excess: number}> = [];
      
      let minCarsProducible = Infinity;
      
      for (const req of requirements) {
        const available = inventoryBySkuMap.get(req.sku) || 0;
        const stillNeeded = req.remaining;
        
        if (stillNeeded > 0) {
          const carsLeft = req.totalCars - req.carsCompleted;
          if (carsLeft > 0) {
            const avgNeededPerCar = stillNeeded / carsLeft;
            if (avgNeededPerCar > 0) {
              const carsProducibleWithThisComponent = Math.floor(available / avgNeededPerCar);
              minCarsProducible = Math.min(minCarsProducible, carsProducibleWithThisComponent);
            }
          }
          
          if (available < stillNeeded) {
            blockedComponents.push({
              sku: req.sku,
              name: req.name,
              needed: stillNeeded,
              available,
              shortfall: stillNeeded - available
            });
          }
          
          // Check for significant excess (more than 2x remaining requirement)
          if (available > stillNeeded * 2) {
            excessComponents.push({
              sku: req.sku,
              name: req.name,
              excess: available - stillNeeded
            });
          }
        }
      }
      
      // If no remaining requirements, set to completed cars
      if (minCarsProducible === Infinity) {
        minCarsProducible = requirements[0]?.totalCars - requirements[0]?.carsCompleted || 0;
      }
      
      // Determine health status
      const carsRemaining = requirements[0]?.totalCars - requirements[0]?.carsCompleted || 0;
      let status: 'healthy' | 'warning' | 'critical';
      
      if (minCarsProducible >= carsRemaining) {
        status = 'healthy';
      } else if (minCarsProducible > 0) {
        status = 'warning';
      } else {
        status = 'critical';
      }
      
      return {
        batchId,
        status,
        carsRemaining,
        totalCars: requirements[0]?.totalCars || 0,
        canProduceCars: Math.max(0, minCarsProducible),
        blockedComponents,
        excessComponents,
        checkedAt: new Date()
      };
      
    } catch (error) {
      logger.error('Failed to get batch health status:', error);
      throw error;
    }
  }

  // ========= Global Multi-Batch Health System with Priority Allocation =========
  
  // Get all active batches with priority-based health status
  async getGlobalBatchHealthStatuses(): Promise<Map<string, BatchHealthStatus>> {
    try {
      logger.info('Computing global batch health with priority allocation');
      
      // 1. Get all active batches sorted by upload sequence (createdAt ascending)
      const allBatches = await this.getAllBatches();
      const activeBatches = allBatches
        .filter(batch => batch.status === 'in_progress')
        .sort((a, b) => {
          const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return aTime - bTime;
        }); // Earlier uploaded = higher priority
      
      if (activeBatches.length === 0) {
        logger.info('No active batches found for global health check');
        return new Map();
      }
      
      logger.info(`Processing ${activeBatches.length} active batches in priority order:`, 
        activeBatches.map(b => `${b.batchId} (${b.createdAt instanceof Date ? b.createdAt.toISOString() : new Date(b.createdAt).toISOString()})`));
      
      // 2. Get current total inventory across all locations
      const { tableStateService } = await import('./tableState');
      const expectedInventory = await tableStateService.getExpectedInventory();
      
      // Build inventory map by SKU (sum across all locations)
      const totalInventoryMap = new Map<string, number>();
      expectedInventory.forEach((item) => {
        const currentAmount = totalInventoryMap.get(item.sku) || 0;
        totalInventoryMap.set(item.sku, currentAmount + (item.amount || 0));
      });
      
      logger.info('Total available inventory:', Object.fromEntries(totalInventoryMap));
      
      // 3. Get batch requirements for all active batches
      const batchRequirementsCol = collection(db, 'batchRequirements');
      const healthResults = new Map<string, BatchHealthStatus>();
      
      // Create a working copy of inventory for allocation simulation
      const remainingInventoryMap = new Map(totalInventoryMap);
      
      // 4. Process each batch in priority order (upload sequence)
      for (const batch of activeBatches) {
        logger.info(`Processing batch ${batch.batchId} (priority ${activeBatches.indexOf(batch) + 1})`);
        
        try {
          // Get requirements for this batch
          const reqSnapshot = await getDocs(query(batchRequirementsCol, where('batchId', '==', batch.batchId)));
          
          if (reqSnapshot.empty) {
            logger.warn(`No requirements found for batch ${batch.batchId} - skipping`);
            continue;
          }
          
          const requirements = reqSnapshot.docs.map(doc => doc.data() as BatchRequirement);
          
          // Check what's missing for this batch with current remaining inventory
          const missingComponents: Array<{sku: string; name: string; needed: number; available: number; shortfall: number}> = [];
          let canProduceCars = Infinity;
          
          for (const req of requirements) {
            const remainingNeeded = req.remaining; // What this batch still needs
            const availableNow = remainingInventoryMap.get(req.sku) || 0;
            
            if (remainingNeeded > 0) {
              const carsLeft = req.totalCars - req.carsCompleted;
              if (carsLeft > 0) {
                const avgNeededPerCar = remainingNeeded / carsLeft;
                if (avgNeededPerCar > 0) {
                  const carsProducibleWithThisComponent = Math.floor(availableNow / avgNeededPerCar);
                  canProduceCars = Math.min(canProduceCars, carsProducibleWithThisComponent);
                }
              }
              
              // Track missing components
              if (availableNow < remainingNeeded) {
                missingComponents.push({
                  sku: req.sku,
                  name: req.name,
                  needed: remainingNeeded,
                  available: availableNow,
                  shortfall: remainingNeeded - availableNow
                });
              }
            }
          }
          
          // Determine health status
          if (canProduceCars === Infinity) {
            canProduceCars = requirements[0]?.totalCars - requirements[0]?.carsCompleted || 0;
          }
          canProduceCars = Math.max(0, canProduceCars);
          
          const carsRemaining = requirements[0]?.totalCars - requirements[0]?.carsCompleted || 0;
          let status: 'healthy' | 'warning' | 'critical';
          
          if (missingComponents.length === 0) {
            status = 'healthy';
          } else if (canProduceCars > 0) {
            status = 'warning';
          } else {
            status = 'critical';
          }
          
          // Store health result
          healthResults.set(batch.batchId, {
            batchId: batch.batchId,
            status,
            carsRemaining,
            totalCars: requirements[0]?.totalCars || 0,
            canProduceCars,
            blockedComponents: missingComponents, // Only missing components, no excess
            excessComponents: [], // Not needed for priority allocation view
            checkedAt: new Date()
          });
          
          // If batch can produce cars, "allocate" its requirements from remaining inventory
          if (canProduceCars > 0 && missingComponents.length === 0) {
            for (const req of requirements) {
              if (req.remaining > 0) {
                const currentAvailable = remainingInventoryMap.get(req.sku) || 0;
                const allocated = Math.min(req.remaining, currentAvailable);
                remainingInventoryMap.set(req.sku, currentAvailable - allocated);
                
                logger.info(`Allocated ${allocated} x ${req.sku} to batch ${batch.batchId}, remaining: ${currentAvailable - allocated}`);
              }
            }
          }
          
          logger.info(`Batch ${batch.batchId} health: ${status}, missing components: ${missingComponents.length}, can produce: ${canProduceCars}`);
          
        } catch (error) {
          logger.error(`Failed to process batch ${batch.batchId}:`, error);
          // Add error status for this batch
          healthResults.set(batch.batchId, {
            batchId: batch.batchId,
            status: 'critical',
            carsRemaining: 0,
            totalCars: 0,
            canProduceCars: 0,
            blockedComponents: [{ sku: 'ERROR', name: 'Health check failed', needed: 0, available: 0, shortfall: 0 }],
            excessComponents: [],
            checkedAt: new Date()
          });
        }
      }
      
      logger.info('Global batch health computation completed', {
        totalBatches: activeBatches.length,
        healthyBatches: [...healthResults.values()].filter(h => h.status === 'healthy').length,
        warningBatches: [...healthResults.values()].filter(h => h.status === 'warning').length,
        criticalBatches: [...healthResults.values()].filter(h => h.status === 'critical').length
      });
      
      return healthResults;
      
    } catch (error) {
      logger.error('Failed to compute global batch health statuses:', error);
      throw error;
    }
  }
  
  // Get single batch health (backward compatibility) - now uses global system
  async getBatchHealthStatusWithPriority(batchId: string): Promise<BatchHealthStatus> {
    const globalResults = await this.getGlobalBatchHealthStatuses();
    const result = globalResults.get(batchId);
    
    if (!result) {
      throw new Error(`Batch ${batchId} not found or not active`);
    }
    
    return result;
  }

  // Utility functions
  async generateSampleData(updatedBy: string): Promise<void> {
    try {
      console.log('🧪 === ENHANCED SAMPLE DATA GENERATION START ===');
      logger.info('Generating enhanced sample batch data with debug logging');
      
      // Step 1: Create sample car types
      console.log('📋 Step 1: Creating car types...');
      await this.createCarType({
        carCode: 'TK1_Red_High',
        name: 'Truck Model 1 - Red High Spec',
        description: 'Premium red truck with high-end features'
      });
      console.log('✅ Created car type: TK1_Red_High');
      
      await this.createCarType({
        carCode: 'TK1_Red_Low',
        name: 'Truck Model 1 - Red Basic',
        description: 'Basic red truck with standard features'
      });
      console.log('✅ Created car type: TK1_Red_Low');
      
      await this.createCarType({
        carCode: 'T9_Blue_Low',
        name: 'Truck Model 9 - Blue Basic',
        description: 'Basic blue truck with standard features'
      });
      console.log('✅ Created car type: T9_Blue_Low');
      
      // Step 2: Create sample inventory for testing
      console.log('📦 Step 2: Creating test inventory...');
      const { inventoryService } = await import('./inventory');
      
      // Create inventory with shortfalls to test health calculations
      await inventoryService.saveInventoryCount({
        sku: 'A001',
        itemName: 'Engine Part A',
        amount: 30, // Need 50, have 30 = 20 short
        location: 'logistics',
        countedBy: updatedBy,
        timestamp: new Date()
      });
      console.log('✅ Created inventory: A001 - Engine Part A (30 units - will be 20 short)');
      
      await inventoryService.saveInventoryCount({
        sku: 'B001',
        itemName: 'Body Panel B',
        amount: 30, // Need 25, have 30 = 5 excess
        location: 'logistics',
        countedBy: updatedBy,
        timestamp: new Date()
      });
      console.log('✅ Created inventory: B001 - Body Panel B (30 units - will have 5 excess)');
      
      await inventoryService.saveInventoryCount({
        sku: 'C001',
        itemName: 'Control Module C',
        amount: 5,  // Need 10, have 5 = 5 short
        location: 'production_zone_15',
        countedBy: updatedBy,
        timestamp: new Date()
      });
      console.log('✅ Created inventory: C001 - Control Module C (5 units - will be 5 short)');
      
      // Step 3: Create sample batch 604
      console.log('🏭 Step 3: Creating batch 604...');
      await this.createBatch({
        batchId: '604',
        name: 'Production Batch 604',
        items: [
          { sku: 'A001', quantity: 50, name: 'Engine Part A' },
          { sku: 'B001', quantity: 25, name: 'Body Panel B' },
          { sku: 'C001', quantity: 10, name: 'Control Module C' }
        ],
        carVins: ['VIN001604', 'VIN002604', 'VIN003604'],
        carType: 'TK1_Red_High',
        totalCars: 3,
        status: 'planning'
      });
      console.log('✅ Created batch 604 with 3 VINs and 3 component types');
      
      // Step 4: Create sample BOM that matches batch 604 components
      console.log('🔧 Step 4: Creating BOM for batch 604...');
      await bomService.addBOM({
        bomCode: 'BOM_TK1_RED_HIGH',
        name: 'TK1 Red High Components',
        description: 'All components needed for TK1_Red_High car',
        components: [
          { sku: 'A001', name: 'Engine Part A', quantity: 50 }, // Matches batch 604
          { sku: 'B001', name: 'Body Panel B', quantity: 25 },   // Matches batch 604
          { sku: 'C001', name: 'Control Module C', quantity: 10 } // Matches batch 604
        ]
      });
      console.log('✅ Created BOM: BOM_TK1_RED_HIGH with 3 components');

      // Step 5: Create sample zone BOM mappings
      console.log('🏢 Step 5: Creating zone BOM mappings...');
      await this.createZoneBOMMapping({
        zoneId: '1',
        carCode: 'TK1_Red_High',
        bomCode: 'BOM_TK1_RED_HIGH',
        consumeOnCompletion: true
      });
      console.log('✅ Created mapping: Zone 1 + TK1_Red_High → BOM_TK1_RED_HIGH');
      
      await this.createZoneBOMMapping({
        zoneId: '15',
        carCode: 'TK1_Red_High', 
        bomCode: 'BOM_TK1_RED_HIGH',
        consumeOnCompletion: true
      });
      console.log('✅ Created mapping: Zone 15 + TK1_Red_High → BOM_TK1_RED_HIGH');
      
      await this.createZoneBOMMapping({
        zoneId: '22',
        carCode: 'T9_Blue_Low',
        bomCode: 'BOM003',
        consumeOnCompletion: false // This one won't consume on completion
      });
      console.log('✅ Created mapping: Zone 22 + T9_Blue_Low → BOM003 (no auto-consume)');
      
      // Step 6: Auto-activate batch 604 with smart health tracking
      console.log('🚀 Step 6: Auto-activating batch 604 with smart health tracking...');
      await this.activateBatchWithSmartHealth('604', updatedBy);
      console.log('✅ Batch 604 activated with smart health tracking');
      
      // Step 7: Test health status immediately
      console.log('🔬 Step 7: Testing health status calculation...');
      const healthStatus = await this.getBatchHealthStatus('604');
      console.log('📊 Health Status Results:', {
        status: healthStatus.status,
        canProduceCars: healthStatus.canProduceCars,
        carsRemaining: healthStatus.carsRemaining,
        blockedComponents: healthStatus.blockedComponents.length,
        excessComponents: healthStatus.excessComponents.length
      });
      
      if (healthStatus.blockedComponents.length > 0) {
        console.log('❌ Missing components detected:', healthStatus.blockedComponents.map(c => `${c.sku}: need ${c.needed}, have ${c.available}`));
      }
      
      if (healthStatus.excessComponents.length > 0) {
        console.log('📈 Excess components detected:', healthStatus.excessComponents.map(c => `${c.sku}: ${c.excess} excess`));
      }
      
      console.log('🧪 === ENHANCED SAMPLE DATA GENERATION COMPLETE ===');
      console.log('🎯 Expected Results:');
      console.log('   - A001: 20 units short (need 50, have 30)');
      console.log('   - B001: 5 units excess (need 25, have 30)');
      console.log('   - C001: 5 units short (need 10, have 5)');
      console.log('   - Status should be CRITICAL (missing components)');
      console.log('   - Can produce 0 complete cars due to shortfalls');
      
      logger.info('Enhanced sample batch data generated and tested successfully');
    } catch (error) {
      console.error('❌ Sample data generation failed:', error);
      logger.error('Failed to generate sample data:', error);
      throw error;
    }
  }
}

export const batchManagementService = new BatchManagementService();
