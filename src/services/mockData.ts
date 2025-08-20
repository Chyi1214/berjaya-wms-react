// Mock Data Service - Generate test data for Eugene's workflow
import { InventoryCountEntry, Transaction, TransactionStatus, TransactionType } from '../types';
import { inventoryService } from './inventory';
import { transactionService } from './transactions';
import { itemMasterService } from './itemMaster';
import { bomService } from './bom';

// Comprehensive Item Master catalog for automotive warehouse
const AUTOMOTIVE_ITEMS = [
  // Filters
  { sku: 'F001', name: 'Engine Oil Filter', category: 'Filters', unit: 'pcs' },
  { sku: 'F002', name: 'Air Filter', category: 'Filters', unit: 'pcs' },
  { sku: 'F003', name: 'Fuel Filter', category: 'Filters', unit: 'pcs' },
  { sku: 'F004', name: 'Cabin Air Filter', category: 'Filters', unit: 'pcs' },
  { sku: 'F005', name: 'Transmission Filter', category: 'Filters', unit: 'pcs' },
  
  // Brake Components
  { sku: 'B001', name: 'Brake Pad Set Front', category: 'Brakes', unit: 'set' },
  { sku: 'B002', name: 'Brake Pad Set Rear', category: 'Brakes', unit: 'set' },
  { sku: 'B003', name: 'Brake Disc Front', category: 'Brakes', unit: 'pcs' },
  { sku: 'B004', name: 'Brake Disc Rear', category: 'Brakes', unit: 'pcs' },
  { sku: 'B005', name: 'Brake Caliper', category: 'Brakes', unit: 'pcs' },
  { sku: 'B006', name: 'Brake Master Cylinder', category: 'Brakes', unit: 'pcs' },
  
  // Engine Components
  { sku: 'E001', name: 'Spark Plug Set', category: 'Engine', unit: 'set' },
  { sku: 'E002', name: 'Timing Belt', category: 'Engine', unit: 'pcs' },
  { sku: 'E003', name: 'Water Pump', category: 'Engine', unit: 'pcs' },
  { sku: 'E004', name: 'Thermostat', category: 'Engine', unit: 'pcs' },
  { sku: 'E005', name: 'Gasket Set', category: 'Engine', unit: 'set' },
  { sku: 'E006', name: 'Belt Tensioner', category: 'Engine', unit: 'pcs' },
  
  // Electrical
  { sku: 'L001', name: 'Car Battery 12V', category: 'Electrical', unit: 'pcs' },
  { sku: 'L002', name: 'Alternator', category: 'Electrical', unit: 'pcs' },
  { sku: 'L003', name: 'Starter Motor', category: 'Electrical', unit: 'pcs' },
  { sku: 'L004', name: 'Headlight Bulb', category: 'Electrical', unit: 'pcs' },
  { sku: 'L005', name: 'Tail Light Assembly', category: 'Electrical', unit: 'pcs' },
  
  // Fluids
  { sku: 'O001', name: 'Engine Oil 5W30', category: 'Fluids', unit: 'liters' },
  { sku: 'O002', name: 'Transmission Oil', category: 'Fluids', unit: 'liters' },
  { sku: 'O003', name: 'Brake Fluid DOT4', category: 'Fluids', unit: 'liters' },
  { sku: 'O004', name: 'Coolant', category: 'Fluids', unit: 'liters' },
  { sku: 'O005', name: 'Power Steering Fluid', category: 'Fluids', unit: 'liters' },
  
  // Suspension
  { sku: 'S001', name: 'Shock Absorber Front', category: 'Suspension', unit: 'pcs' },
  { sku: 'S002', name: 'Shock Absorber Rear', category: 'Suspension', unit: 'pcs' },
  { sku: 'S003', name: 'Coil Spring', category: 'Suspension', unit: 'pcs' },
  { sku: 'S004', name: 'Control Arm', category: 'Suspension', unit: 'pcs' },
  { sku: 'S005', name: 'Ball Joint', category: 'Suspension', unit: 'pcs' },
];

// Note: SAMPLE_ITEMS removed - using AUTOMOTIVE_ITEMS for all data generation to ensure consistency

// Production zones 1-5 (limited for testing)
const TEST_ZONES = [1, 2, 3, 4, 5];

class MockDataService {

  // Generate random number between min and max
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Generate random date in the past few days
  private randomRecentDate(daysAgo: number = 7): Date {
    const now = new Date();
    const msAgo = daysAgo * 24 * 60 * 60 * 1000;
    const randomMs = Math.random() * msAgo;
    return new Date(now.getTime() - randomMs);
  }

  // Generate mock inventory counts (Checked Item Table)
  async generateMockInventoryCounts(): Promise<void> {
    console.log('🎲 Generating mock inventory counts...');
    
    const mockCounts: InventoryCountEntry[] = [];

    // Generate counts for logistics - use AUTOMOTIVE_ITEMS for consistency
    for (let i = 0; i < 10; i++) {
      const item = AUTOMOTIVE_ITEMS[i];
      mockCounts.push({
        sku: item.sku,
        itemName: item.name,
        amount: this.randomBetween(20, 100),
        location: 'logistics',
        countedBy: 'logistics.worker@berjaya.com',
        timestamp: this.randomRecentDate(2)
      });
    }

    // Generate counts for production zones - use AUTOMOTIVE_ITEMS for consistency
    TEST_ZONES.forEach(zone => {
      for (let i = 0; i < 6; i++) {
        const itemIndex = (zone - 1) * 6 + i; // Distribute items across zones
        const item = AUTOMOTIVE_ITEMS[itemIndex];
        if (item) {
          mockCounts.push({
            sku: item.sku,
            itemName: item.name,
            amount: this.randomBetween(5, 50),
            location: `production_zone_${zone}`,
            countedBy: `zone${zone}.worker@berjaya.com`,
            timestamp: this.randomRecentDate(1)
          });
        }
      }
    });

    // Save all counts
    for (const count of mockCounts) {
      await inventoryService.saveInventoryCount(count);
    }

    console.log(`✅ Generated ${mockCounts.length} mock inventory counts`);
  }

  // Generate mock Item Master data
  async generateMockItemMaster(): Promise<void> {
    console.log('🎲 Generating mock Item Master data...');
    
    // Save all items (addItem automatically sets createdAt/updatedAt)
    for (const item of AUTOMOTIVE_ITEMS) {
      await itemMasterService.addItem({
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit
      });
    }

    console.log(`✅ Generated ${AUTOMOTIVE_ITEMS.length} mock Item Master entries`);
  }

  // Generate mock BOM data
  async generateMockBOMs(): Promise<void> {
    console.log('🎲 Generating mock BOM data...');
    
    const mockBOMs = [
      {
        bomCode: 'BOM001',
        name: 'Basic Service Kit',
        description: 'Standard maintenance package for routine service',
        components: [
          { sku: 'F001', name: 'Engine Oil Filter', quantity: 1, unit: 'pcs' },
          { sku: 'F002', name: 'Air Filter', quantity: 1, unit: 'pcs' },
          { sku: 'O001', name: 'Engine Oil 5W30', quantity: 4, unit: 'liters' },
          { sku: 'E001', name: 'Spark Plug Set', quantity: 1, unit: 'set' }
        ]
      },
      {
        bomCode: 'BOM002',
        name: 'Brake Service Package',
        description: 'Complete brake system maintenance kit',
        components: [
          { sku: 'B001', name: 'Brake Pad Set Front', quantity: 1, unit: 'set' },
          { sku: 'B002', name: 'Brake Pad Set Rear', quantity: 1, unit: 'set' },
          { sku: 'B003', name: 'Brake Disc Front', quantity: 2, unit: 'pcs' },
          { sku: 'O003', name: 'Brake Fluid DOT4', quantity: 1, unit: 'liters' }
        ]
      },
      {
        bomCode: 'BOM003',
        name: 'Timing Belt Kit',
        description: 'Timing belt replacement with water pump',
        components: [
          { sku: 'E002', name: 'Timing Belt', quantity: 1, unit: 'pcs' },
          { sku: 'E003', name: 'Water Pump', quantity: 1, unit: 'pcs' },
          { sku: 'E006', name: 'Belt Tensioner', quantity: 1, unit: 'pcs' },
          { sku: 'O004', name: 'Coolant', quantity: 2, unit: 'liters' }
        ]
      },
      {
        bomCode: 'BOM004',
        name: 'Filter Replacement Kit',
        description: 'All filters for comprehensive service',
        components: [
          { sku: 'F001', name: 'Engine Oil Filter', quantity: 1, unit: 'pcs' },
          { sku: 'F002', name: 'Air Filter', quantity: 1, unit: 'pcs' },
          { sku: 'F003', name: 'Fuel Filter', quantity: 1, unit: 'pcs' },
          { sku: 'F004', name: 'Cabin Air Filter', quantity: 1, unit: 'pcs' }
        ]
      },
      {
        bomCode: 'BOM005',
        name: 'Electrical Maintenance Kit',
        description: 'Battery and charging system service',
        components: [
          { sku: 'L001', name: 'Car Battery 12V', quantity: 1, unit: 'pcs' },
          { sku: 'L004', name: 'Headlight Bulb', quantity: 2, unit: 'pcs' }
        ]
      },
      {
        bomCode: 'BOM006',
        name: 'Suspension Service Kit',
        description: 'Front suspension overhaul package',
        components: [
          { sku: 'S001', name: 'Shock Absorber Front', quantity: 2, unit: 'pcs' },
          { sku: 'S003', name: 'Coil Spring', quantity: 2, unit: 'pcs' },
          { sku: 'S005', name: 'Ball Joint', quantity: 2, unit: 'pcs' }
        ]
      },
      {
        bomCode: 'BOM007',
        name: 'Engine Tune-up Package',
        description: 'Complete engine performance maintenance',
        components: [
          { sku: 'E001', name: 'Spark Plug Set', quantity: 1, unit: 'set' },
          { sku: 'F001', name: 'Engine Oil Filter', quantity: 1, unit: 'pcs' },
          { sku: 'F002', name: 'Air Filter', quantity: 1, unit: 'pcs' },
          { sku: 'F003', name: 'Fuel Filter', quantity: 1, unit: 'pcs' },
          { sku: 'O001', name: 'Engine Oil 5W30', quantity: 5, unit: 'liters' }
        ]
      },
      {
        bomCode: 'BOM008',
        name: 'Fluid Top-up Kit',
        description: 'All essential fluids for maintenance',
        components: [
          { sku: 'O001', name: 'Engine Oil 5W30', quantity: 1, unit: 'liters' },
          { sku: 'O003', name: 'Brake Fluid DOT4', quantity: 1, unit: 'liters' },
          { sku: 'O004', name: 'Coolant', quantity: 1, unit: 'liters' },
          { sku: 'O005', name: 'Power Steering Fluid', quantity: 1, unit: 'liters' }
        ]
      }
    ];

    // Save all BOMs (addBOM automatically calculates totalComponents and sets timestamps)
    for (const bom of mockBOMs) {
      await bomService.addBOM(bom);
    }

    console.log(`✅ Generated ${mockBOMs.length} mock BOM definitions`);
  }

  // Generate mock completed transactions
  async generateMockTransactions(): Promise<void> {
    console.log('🎲 Generating mock completed transactions...');
    
    const mockTransactions: Transaction[] = [];

    // Start with zero transactions (Expected = Checked)
    // Generate some completed transactions - START WITH 0 for clean baseline
    for (let i = 0; i < 0; i++) {
      const item = AUTOMOTIVE_ITEMS[i % AUTOMOTIVE_ITEMS.length];
      const sourceZone = Math.random() > 0.5 ? 'logistics' : `production_zone_${this.randomBetween(1, 3)}`;
      const targetZone = `production_zone_${this.randomBetween(1, 5)}`;
      
      const transaction: Transaction = {
        id: `mock_txn_${Date.now()}_${i}`,
        sku: item.sku,
        itemName: item.name,
        amount: this.randomBetween(5, 25),
        previousAmount: this.randomBetween(20, 80),
        newAmount: this.randomBetween(30, 100),
        location: sourceZone,
        toLocation: targetZone,
        transactionType: TransactionType.TRANSFER_OUT,
        status: i < 6 ? TransactionStatus.COMPLETED : (i < 7 ? TransactionStatus.PENDING : TransactionStatus.CANCELLED),
        performedBy: `${sourceZone.replace('_', '.')}.worker@berjaya.com`,
        timestamp: this.randomRecentDate(3),
        reference: `WO-${this.randomBetween(1000, 9999)}`
      };

      // Only add optional fields if they have values (Firebase doesn't accept undefined)
      if (i < 6) {
        transaction.approvedBy = `${targetZone.replace('_', '.')}.worker@berjaya.com`;
      }
      
      if (i === 7) {
        transaction.notes = 'Rejected: Items damaged during transport';
      }

      mockTransactions.push(transaction);
    }

    // Save all transactions
    for (const transaction of mockTransactions) {
      await transactionService.saveTransaction(transaction);
    }

    console.log(`✅ Generated ${mockTransactions.length} mock transactions`);
  }

  // Generate a complete mock scenario
  async generateCompleteTestScenario(): Promise<void> {
    console.log('🎭 Generating complete test scenario...');
    
    try {
      // Clear existing data first
      await this.clearAllMockData();
      
      // Wait a moment for clearing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data
      await this.generateMockItemMaster();
      await this.generateMockBOMs();
      await this.generateMockInventoryCounts();
      await this.generateMockTransactions();
      
      console.log('🎉 Complete test scenario generated!');
      console.log('📋 You now have:');
      console.log('  • 30 automotive items in Item Master catalog');
      console.log('  • 8 BOM definitions for service packages');
      console.log('  • Mock inventory counts using SAME SKUs as Item Master');
      console.log('  • Zero transactions (Expected = Checked baseline)');
      console.log('  • ✅ ALL DATA SYNCHRONIZED - ready to test complete WMS workflow!');
      
    } catch (error) {
      console.error('❌ Failed to generate test scenario:', error);
      throw error;
    }
  }

  // Generate just Item Master and BOM data (for testing Item Management)
  async generateItemAndBOMTestData(): Promise<void> {
    console.log('📦 Generating Item Master and BOM test data...');
    
    try {
      await this.generateMockItemMaster();
      await this.generateMockBOMs();
      
      console.log('✅ Item Management test data ready!');
      console.log('📋 You now have:');
      console.log('  • 30 automotive items across 6 categories');
      console.log('  • 8 realistic BOM definitions');
      console.log('  • Ready to test Item Management features!');
      
    } catch (error) {
      console.error('❌ Failed to generate Item/BOM data:', error);
      throw error;
    }
  }

  // Generate yesterday results that match current checked inventory (Expected = Checked baseline)
  generateBaselineYesterdayResults(currentInventory: InventoryCountEntry[]): InventoryCountEntry[] {
    console.log('📅 Generating yesterday results to match current inventory...');
    
    const yesterdayResults: InventoryCountEntry[] = currentInventory.map(item => ({
      ...item,
      countedBy: 'system.baseline',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    }));
    
    console.log(`✅ Generated ${yesterdayResults.length} yesterday result entries matching current inventory`);
    return yesterdayResults;
  }

  // Generate specific test case for transaction workflow
  async generateTransactionTestCase(): Promise<void> {
    console.log('🔄 Generating transaction test case...');
    
    // Create a specific scenario:
    // 1. Logistics has 50 Engine Oil Filters
    // 2. Transaction sends 10 to Zone 1 
    // 3. Zone 1 counts 45 total (should match: 35 existing + 10 from transaction)
    
    const testCounts: InventoryCountEntry[] = [
      {
        sku: 'F001',
        itemName: 'Engine Oil Filter', 
        amount: 50,
        location: 'logistics',
        countedBy: 'test.logistics@berjaya.com',
        timestamp: new Date()
      },
      {
        sku: 'F001',
        itemName: 'Engine Oil Filter',
        amount: 35, // Should become 45 after transaction
        location: 'production_zone_1',
        countedBy: 'test.production@berjaya.com', 
        timestamp: new Date()
      }
    ];

    for (const count of testCounts) {
      await inventoryService.saveInventoryCount(count);
    }

    console.log('✅ Transaction test case ready!');
    console.log('📋 Test scenario:');
    console.log('  • Logistics: 50 Engine Oil Filters (F001)');  
    console.log('  • Zone 1: 35 Engine Oil Filters (F001)');
    console.log('  • Send 10 from Logistics to Zone 1');
    console.log('  • Expected result: Zone 1 should have 45 total');
  }

  // Clear all mock data
  async clearAllMockData(): Promise<void> {
    console.log('🧹 Clearing all mock data...');
    
    try {
      await inventoryService.clearAllInventory();
      await transactionService.clearAllTransactions();
      
      // Also clear Item Master and BOM data to ensure fresh start
      const allItems = await itemMasterService.getAllItems();
      for (const item of allItems) {
        await itemMasterService.deleteItem(item.sku);
      }
      
      const allBOMs = await bomService.getAllBOMs();
      for (const bom of allBOMs) {
        await bomService.deleteBOM(bom.bomCode);
      }
      
      console.log('✅ All mock data cleared (inventory, transactions, items, BOMs)');
    } catch (error) {
      console.error('❌ Failed to clear mock data:', error);
      throw error;
    }
  }

  // Calculate expected inventory by applying transactions to a baseline (FULL RECALCULATION)
  calculateExpectedInventory(
    baselineInventory: InventoryCountEntry[], 
    completedTransactions: Transaction[]
  ): InventoryCountEntry[] {
    console.log('📊 Calculating expected inventory from baseline + transactions...');

    // Group inventory counts by SKU and location
    const countMap = new Map<string, InventoryCountEntry>();
    
    baselineInventory.forEach(count => {
      const key = `${count.sku}-${count.location}`;
      countMap.set(key, { ...count }); // Create copy to avoid mutating original
    });

    // Apply completed transactions to get "yesterday's ending" state
    completedTransactions
      .filter(txn => txn.status === TransactionStatus.COMPLETED)
      .forEach(txn => {
        // Reduce from source location
        const sourceKey = `${txn.sku}-${txn.location}`;
        const sourceCount = countMap.get(sourceKey);
        if (sourceCount) {
          countMap.set(sourceKey, {
            ...sourceCount,
            amount: Math.max(0, sourceCount.amount - txn.amount),
            countedBy: 'system.calculated',
            timestamp: new Date()
          });
        }

        // Add to destination location
        const destKey = `${txn.sku}-${txn.toLocation}`;
        const destCount = countMap.get(destKey);
        if (destCount) {
          countMap.set(destKey, {
            ...destCount,
            amount: destCount.amount + txn.amount,
            countedBy: 'system.calculated', 
            timestamp: new Date()
          });
        } else if (txn.toLocation) {
          // Create new entry for destination if it doesn't exist
          countMap.set(destKey, {
            sku: txn.sku,
            itemName: txn.itemName,
            amount: txn.amount,
            location: txn.toLocation,
            countedBy: 'system.calculated',
            timestamp: new Date()
          });
        }
      });

    const results = Array.from(countMap.values());
    console.log(`📋 Calculated ${results.length} expected inventory entries from baseline + ${completedTransactions.length} transactions`);
    return results;
  }

  // INCREMENTAL UPDATE: Only update SKUs affected by a specific transaction (SCALABLE FOR 100 WORKERS)
  calculateIncrementalExpectedUpdate(
    currentExpected: InventoryCountEntry[],
    newTransaction: Transaction
  ): InventoryCountEntry[] {
    console.log(`🎯 Incremental update for transaction: ${newTransaction.sku} from ${newTransaction.location} to ${newTransaction.toLocation}`);

    // Only update affected locations for this specific SKU
    const updatedExpected = currentExpected.map(entry => {
      const sourceKey = `${newTransaction.sku}-${newTransaction.location}`;
      const destKey = `${newTransaction.sku}-${newTransaction.toLocation}`;
      const entryKey = `${entry.sku}-${entry.location}`;
      
      // Update source location (subtract)
      if (entryKey === sourceKey) {
        return {
          ...entry,
          amount: Math.max(0, entry.amount - newTransaction.amount),
          countedBy: 'system.incremental',
          timestamp: new Date()
        };
      }
      
      // Update destination location (add)
      if (entryKey === destKey) {
        return {
          ...entry,
          amount: entry.amount + newTransaction.amount,
          countedBy: 'system.incremental',
          timestamp: new Date()
        };
      }
      
      // All other entries remain unchanged
      return entry;
    });

    // Check if destination location exists, create if needed
    const destKey = `${newTransaction.sku}-${newTransaction.toLocation}`;
    const destExists = currentExpected.some(entry => 
      `${entry.sku}-${entry.location}` === destKey
    );
    
    if (!destExists && newTransaction.toLocation) {
      updatedExpected.push({
        sku: newTransaction.sku,
        itemName: newTransaction.itemName,
        amount: newTransaction.amount,
        location: newTransaction.toLocation,
        countedBy: 'system.incremental',
        timestamp: new Date()
      });
      console.log(`✨ Created new expected entry for ${newTransaction.sku} in ${newTransaction.toLocation}`);
    }

    console.log(`⚡ Incremental update complete: Only ${newTransaction.sku} locations updated (vs full recalculation)`);
    return updatedExpected;
  }
}

export const mockDataService = new MockDataService();