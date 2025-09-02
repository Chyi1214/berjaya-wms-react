// Batch Management Service - Section 5.3 Implementation
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CarType, Batch, ZoneBOMMapping, BatchHealthCheck, VinPlan, BatchVinHealthReport, VinHealthResult, BatchRequirement, BatchHealthStatus } from '../types/inventory';
import { createModuleLogger } from './logger';
import { tableStateService } from './tableState';
import { bomService } from './bom';
import { batchCoreService } from './batch/batchCore';
import { batchHealthService } from './batch/batchHealth';
import { batchCSVService } from './batch/batchCSV';

const logger = createModuleLogger('BatchManagement');

class BatchManagementService {
  // Car Types Collection - Delegated to batchCore
  async createCarType(carType: Omit<CarType, 'createdAt' | 'updatedAt'>): Promise<string> {
    return batchCoreService.createCarType(carType);
  }

  async getAllCarTypes(): Promise<CarType[]> {
    return batchCoreService.getAllCarTypes();
  }

  // ========= CSV Operations - Delegated to batchCSV =========
  
  async uploadCarTypesFromCSV(csvData: string, updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number; };
  }> {
    return batchCSVService.uploadCarTypesFromCSV(csvData, updatedBy);
  }

  // Batch Collection - Delegated to batchCore
  async createBatch(batch: Omit<Batch, 'createdAt' | 'updatedAt'>): Promise<string> {
    return batchCoreService.createBatch(batch);
  }

  async getBatchById(batchId: string): Promise<Batch | null> {
    return batchCoreService.getBatchById(batchId);
  }

  async getAllBatches(): Promise<Batch[]> {
    return batchCoreService.getAllBatches();
  }

  async uploadBatchesFromCSV(csvData: string, updatedBy: string): Promise<{
    success: number;
    errors: string[];
    stats: { totalRows: number; skippedRows: number; };
  }> {
    return batchCSVService.uploadBatchesFromCSV(csvData, updatedBy);
  }

  // Zone BOM Mapping Collection - Delegated to batchCore
  async createZoneBOMMapping(mapping: Omit<ZoneBOMMapping, 'createdAt' | 'updatedAt'>): Promise<string> {
    return batchCoreService.createZoneBOMMapping(mapping);
  }

  async getZoneBOMMappings(zoneId?: string, carCode?: string): Promise<ZoneBOMMapping[]> {
    return batchCoreService.getZoneBOMMappings(zoneId, carCode);
  }

  // Batch Health Checking - Delegated to batchHealth
  async performBatchHealthCheck(batchId: string, checkedBy: string): Promise<BatchHealthCheck> {
    return batchHealthService.performBatchHealthCheck(batchId, checkedBy);
  }

  // ========= New Section: CSV Ingestion (VIN plan, Packing list) =========
  async uploadVinPlansFromCSV(csvData: string, updatedBy: string): Promise<{ 
    success: number; 
    errors: string[]; 
    stats: { totalRows: number; skippedRows: number }; 
  }> {
    return batchCSVService.uploadVinPlansFromCSV(csvData, updatedBy);
  }

  async uploadPackingListFromCSV(csvData: string, uploadedBy: string): Promise<{ 
    success: number; 
    errors: string[]; 
    stats: { totalRows: number; skippedRows: number }; 
  }> {
    return batchCSVService.uploadPackingListFromCSV(csvData, uploadedBy);
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

  // Batch Deletion - Delegated to batchCore
  async deleteBatch(batchId: string): Promise<void> {
    return batchCoreService.deleteBatch(batchId);
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
  

  // ========= Global Multi-Batch Health System - Delegated to batchHealth =========
  
  // Get all active batches with priority-based health status
  async getGlobalBatchHealthStatuses(): Promise<Map<string, BatchHealthStatus>> {
    return batchHealthService.getGlobalBatchHealthStatuses();
  }
  
  // Get single batch health (backward compatibility) - now uses global system
  async getBatchHealthStatusWithPriority(batchId: string): Promise<BatchHealthStatus> {
    return batchHealthService.getBatchHealthStatusWithPriority(batchId);
  }

  // Get real-time batch health status
  async getBatchHealthStatus(batchId: string): Promise<BatchHealthStatus> {
    return batchHealthService.getBatchHealthStatus(batchId);
  }

  // ========= Mock Data Generation =========

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
