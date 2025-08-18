// Mock Data Service - Generate test data for Eugene's workflow
import { InventoryCountEntry, Transaction, TransactionStatus, TransactionType } from '../types';
import { inventoryService } from './inventory';
import { transactionService } from './transactions';

// Sample SKUs and items
const SAMPLE_ITEMS = [
  { sku: 'A001', name: 'Engine Oil Filter' },
  { sku: 'A002', name: 'Air Filter' },
  { sku: 'B003', name: 'Brake Pad Set' },
  { sku: 'B004', name: 'Brake Disc' },
  { sku: 'C005', name: 'Spark Plug Set' },
  { sku: 'C006', name: 'Timing Belt' },
  { sku: 'D007', name: 'Water Pump' },
  { sku: 'D008', name: 'Alternator' },
  { sku: 'E009', name: 'Battery' },
  { sku: 'E010', name: 'Starter Motor' },
];

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

    // Generate counts for logistics
    for (let i = 0; i < 5; i++) {
      const item = SAMPLE_ITEMS[i];
      mockCounts.push({
        sku: item.sku,
        itemName: item.name,
        amount: this.randomBetween(10, 100),
        location: 'logistics',
        countedBy: 'logistics.worker@berjaya.com',
        timestamp: this.randomRecentDate(2)
      });
    }

    // Generate counts for production zones
    TEST_ZONES.forEach(zone => {
      for (let i = 0; i < 3; i++) {
        const item = SAMPLE_ITEMS[i + zone];
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

  // Generate mock completed transactions
  async generateMockTransactions(): Promise<void> {
    console.log('🎲 Generating mock completed transactions...');
    
    const mockTransactions: Transaction[] = [];

    // Start with zero transactions (Expected = Checked)
    // Generate some completed transactions - START WITH 0 for clean baseline
    for (let i = 0; i < 0; i++) {
      const item = SAMPLE_ITEMS[i % SAMPLE_ITEMS.length];
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
      await this.generateMockInventoryCounts();
      await this.generateMockTransactions();
      
      console.log('🎉 Complete test scenario generated!');
      console.log('📋 You now have:');
      console.log('  • Mock inventory counts from logistics and production zones');
      console.log('  • Zero transactions (Expected = Checked baseline)');
      console.log('  • Ready to test Eugene\'s workflow by creating transactions');
      
    } catch (error) {
      console.error('❌ Failed to generate test scenario:', error);
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
        sku: 'A001',
        itemName: 'Engine Oil Filter', 
        amount: 50,
        location: 'logistics',
        countedBy: 'test.logistics@berjaya.com',
        timestamp: new Date()
      },
      {
        sku: 'A001',
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
    console.log('  • Logistics: 50 Engine Oil Filters');  
    console.log('  • Zone 1: 35 Engine Oil Filters');
    console.log('  • Send 10 from Logistics to Zone 1');
    console.log('  • Expected result: Zone 1 should have 45 total');
  }

  // Clear all mock data
  async clearAllMockData(): Promise<void> {
    console.log('🧹 Clearing all mock data...');
    
    try {
      await inventoryService.clearAllInventory();
      await transactionService.clearAllTransactions();
      console.log('✅ All mock data cleared');
    } catch (error) {
      console.error('❌ Failed to clear mock data:', error);
      throw error;
    }
  }

  // Calculate expected inventory by applying transactions to a baseline
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
}

export const mockDataService = new MockDataService();