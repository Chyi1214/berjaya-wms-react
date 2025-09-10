// Data Cleanup Service - Fix inventory system data integrity issues
import { inventoryService } from './inventory';
import { tableStateService } from './tableState';
import { itemMasterService } from './itemMaster';
import { InventoryCountEntry, ItemMaster } from '../types';

export class DataCleanupService {
  
  // Fix inventory data integrity issues
  async cleanupInventoryData(): Promise<{
    bomsRemoved: number;
    itemNamesFixed: number;
  }> {
    console.log('🧹 Starting inventory data cleanup...');
    
    let bomsRemoved = 0;
    let itemNamesFixed = 0;
    
    try {
      // Get all current data
      const [allCounts, allExpected, allItems] = await Promise.all([
        inventoryService.getAllInventoryCounts(),
        tableStateService.getExpectedInventory(),
        itemMasterService.getAllItems()
      ]);
      
      // Create a map of valid items for quick lookup
      const itemMap = new Map<string, ItemMaster>();
      allItems.forEach(item => {
        itemMap.set(item.sku, item);
      });
      
      console.log(`📊 Found ${allCounts.length} checked entries, ${allExpected.length} expected entries, ${allItems.length} valid items`);
      
      // Clean checked inventory
      const cleanedChecked: InventoryCountEntry[] = [];
      for (const entry of allCounts) {
        // Remove BOM entries (BOMs should not be in inventory)
        if (entry.sku.startsWith('BOM')) {
          console.log(`🗑️ Removing BOM entry from checked: ${entry.sku}`);
          bomsRemoved++;
          continue;
        }
        
        // Keep waste entries - they're for audit tracking in Waste & Lost tab
        // Waste entries in waste_lost_zone_ locations are valid for tracking
        
        // Fix item name misalignment
        const correctItem = itemMap.get(entry.sku);
        if (correctItem && correctItem.name !== entry.itemName) {
          console.log(`🔧 Fixing item name: ${entry.sku} "${entry.itemName}" → "${correctItem.name}"`);
          entry.itemName = correctItem.name;
          itemNamesFixed++;
        }
        
        cleanedChecked.push(entry);
      }
      
      // Clean expected inventory  
      const cleanedExpected: InventoryCountEntry[] = [];
      for (const entry of allExpected) {
        // Remove BOM entries (BOMs should not be in inventory)
        if (entry.sku.startsWith('BOM')) {
          console.log(`🗑️ Removing BOM entry from expected: ${entry.sku}`);
          bomsRemoved++;
          continue;
        }
        
        // Keep waste entries - they're for audit tracking in Waste & Lost tab
        // Waste entries in waste_lost_zone_ locations are valid for tracking
        
        // Fix item name misalignment
        const correctItem = itemMap.get(entry.sku);
        if (correctItem && correctItem.name !== entry.itemName) {
          console.log(`🔧 Fixing item name: ${entry.sku} "${entry.itemName}" → "${correctItem.name}"`);
          entry.itemName = correctItem.name;
          itemNamesFixed++;
        }
        
        cleanedExpected.push(entry);
      }
      
      // Save cleaned data back to database
      console.log('💾 Saving cleaned inventory data...');
      
      // Clear and rebuild checked inventory
      await inventoryService.clearAllInventory();
      for (const entry of cleanedChecked) {
        await inventoryService.saveInventoryCount(entry);
      }
      
      // Clear and rebuild expected inventory
      await tableStateService.saveExpectedInventory(cleanedExpected);
      
      console.log('✅ Inventory data cleanup completed!');
      console.log(`📊 Summary:`);
      console.log(`  • BOM entries removed: ${bomsRemoved}`);
      console.log(`  • Item names fixed: ${itemNamesFixed}`);
      console.log(`  • Valid checked entries: ${cleanedChecked.length}`);
      console.log(`  • Valid expected entries: ${cleanedExpected.length}`);
      
      return {
        bomsRemoved,
        itemNamesFixed
      };
      
    } catch (error) {
      console.error('❌ Failed to cleanup inventory data:', error);
      throw error;
    }
  }
  
  // Validate inventory data integrity
  async validateInventoryIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    console.log('🔍 Validating inventory data integrity...');
    
    const issues: string[] = [];
    
    try {
      const [allCounts, allExpected, allItems] = await Promise.all([
        inventoryService.getAllInventoryCounts(),
        tableStateService.getExpectedInventory(),
        itemMasterService.getAllItems()
      ]);
      
      const itemMap = new Map<string, ItemMaster>();
      allItems.forEach(item => {
        itemMap.set(item.sku, item);
      });
      
      // Check for BOM entries in inventory
      const bomInChecked = allCounts.filter(entry => entry.sku.startsWith('BOM'));
      const bomInExpected = allExpected.filter(entry => entry.sku.startsWith('BOM'));
      
      if (bomInChecked.length > 0) {
        issues.push(`Found ${bomInChecked.length} BOM entries in checked inventory (should be 0)`);
      }
      
      if (bomInExpected.length > 0) {
        issues.push(`Found ${bomInExpected.length} BOM entries in expected inventory (should be 0)`);
      }
      
      // Check for item name misalignment
      let nameIssues = 0;
      [...allCounts, ...allExpected].forEach(entry => {
        if (!entry.sku.startsWith('BOM')) {
          const correctItem = itemMap.get(entry.sku);
          if (correctItem && correctItem.name !== entry.itemName) {
            nameIssues++;
          }
        }
      });
      
      if (nameIssues > 0) {
        issues.push(`Found ${nameIssues} item name misalignments`);
      }
      
      // Note: Waste items in waste_lost_zone_ locations are now allowed for audit tracking
      // They should appear in both Expected table (as reductions) and Waste tracking
      
      const isValid = issues.length === 0;
      
      console.log(`📊 Validation results:`);
      if (isValid) {
        console.log('✅ All inventory data integrity checks passed!');
      } else {
        console.log('❌ Found data integrity issues:');
        issues.forEach(issue => console.log(`  • ${issue}`));
      }
      
      return { isValid, issues };
      
    } catch (error) {
      console.error('❌ Failed to validate inventory integrity:', error);
      throw error;
    }
  }
}

export const dataCleanupService = new DataCleanupService();