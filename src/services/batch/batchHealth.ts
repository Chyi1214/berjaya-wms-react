// Batch Health Service - Priority Allocation & Health Monitoring
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Batch, BatchHealthCheck, BatchHealthStatus, BatchRequirement } from '../../types/inventory';
import { createModuleLogger } from '../logger';
import { batchCoreService } from './batchCore';

const logger = createModuleLogger('BatchHealth');

export class BatchHealthService {
  // ========= Legacy Individual Batch Health Check =========
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
      
      logger.info('Batch health check completed:', healthCheck);
      return healthCheck;
    } catch (error) {
      logger.error('Failed to perform batch health check:', error);
      throw error;
    }
  }

  // ========= Smart Batch Health System (Individual with Requirements) =========
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
      const { tableStateService } = await import('../tableState');
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

  // ========= PRIORITY-BASED GLOBAL HEALTH SYSTEM =========
  async getGlobalBatchHealthStatuses(): Promise<Map<string, BatchHealthStatus>> {
    try {
      logger.info('Computing global batch health with priority allocation');
      
      // 1. Get all active batches sorted by upload sequence (createdAt ascending)
      const allBatches = await batchCoreService.getAllBatches();
      const activeBatches = allBatches
        .filter(batch => batch.status === 'in_progress')
        .sort((a, b) => {
          try {
            const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            
            // Handle invalid dates
            if (isNaN(aTime) && isNaN(bTime)) return 0;
            if (isNaN(aTime)) return 1; // Put invalid dates at end
            if (isNaN(bTime)) return -1;
            
            return aTime - bTime;
          } catch (error) {
            logger.warn('Date comparison error:', error);
            return 0; // Keep original order if comparison fails
          }
        }); // Earlier uploaded = higher priority
      
      if (activeBatches.length === 0) {
        logger.info('No active batches found for global health check');
        return new Map();
      }
      
      logger.info(`Processing ${activeBatches.length} active batches in priority order:`, 
        activeBatches.map(b => {
          try {
            const dateStr = b.createdAt instanceof Date ? b.createdAt.toISOString() : new Date(b.createdAt).toISOString();
            return `${b.batchId} (${dateStr})`;
          } catch (error) {
            return `${b.batchId} (date parsing error)`;
          }
        }));
      
      // 2. Get current total inventory across all locations
      const { tableStateService } = await import('../tableState');
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
}

// Export singleton instance
export const batchHealthService = new BatchHealthService();