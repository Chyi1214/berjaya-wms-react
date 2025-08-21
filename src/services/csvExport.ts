// CSV Export Service - Convert data to CSV and trigger downloads
import { InventoryCountEntry, Transaction, ItemMaster, BOM } from '../types';

class CSVExportService {
  
  // Convert array of objects to CSV string
  private arrayToCSV<T extends Record<string, any>>(data: T[], headers: string[]): string {
    if (data.length === 0) return '';
    
    // Create header row
    const headerRow = headers.join(',');
    
    // Create data rows
    const dataRows = data.map(row => {
      return headers.map(header => {
        let value = row[header];
        
        // Handle different data types
        if (value === null || value === undefined) {
          value = '';
        } else if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }
        }
        
        return value.toString();
      }).join(',');
    });
    
    return [headerRow, ...dataRows].join('\n');
  }
  
  // Trigger file download
  private downloadCSV(content: string, filename: string): void {
    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }
  
  // Generate timestamp for filename
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
  }
  
  // Export inventory counts
  exportInventoryCounts(data: InventoryCountEntry[], tableType: string): void {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = [
      'sku',
      'itemName', 
      'amount',
      'location',
      'countedBy',
      'timestamp'
    ];
    
    const csv = this.arrayToCSV(data, headers);
    const filename = `berjaya-wms-${tableType}-${this.getTimestamp()}.csv`;
    
    this.downloadCSV(csv, filename);
    console.log(`✅ Exported ${data.length} ${tableType} entries to ${filename}`);
  }
  
  // Export transactions
  exportTransactions(data: Transaction[]): void {
    if (data.length === 0) {
      alert('No transactions to export');
      return;
    }
    
    const headers = [
      'id',
      'sku',
      'itemName',
      'amount',
      'previousAmount',
      'newAmount',
      'location',
      'toLocation',
      'transactionType',
      'status',
      'performedBy',
      'approvedBy',
      'timestamp',
      'notes',
      'reference'
    ];
    
    const csv = this.arrayToCSV(data, headers);
    const filename = `berjaya-wms-transactions-${this.getTimestamp()}.csv`;
    
    this.downloadCSV(csv, filename);
    console.log(`✅ Exported ${data.length} transactions to ${filename}`);
  }
  
  // Export all data (inventory + transactions)
  exportAllData(
    checkedItems: InventoryCountEntry[],
    expectedItems: InventoryCountEntry[],
    yesterdayResults: InventoryCountEntry[],
    transactions: Transaction[]
  ): void {
    const timestamp = this.getTimestamp();
    
    // Export each table separately
    if (checkedItems.length > 0) {
      this.exportInventoryCounts(checkedItems, 'checked-items');
    }
    
    if (expectedItems.length > 0) {
      this.exportInventoryCounts(expectedItems, 'expected-inventory');
    }
    
    if (yesterdayResults.length > 0) {
      this.exportInventoryCounts(yesterdayResults, 'yesterday-results');
    }
    
    if (transactions.length > 0) {
      this.exportTransactions(transactions);
    }
    
    alert(`✅ All data exported successfully!\nFiles are downloaded with timestamp: ${timestamp}`);
  }
  
  // Export summary report
  exportSummaryReport(
    checkedItems: InventoryCountEntry[],
    expectedItems: InventoryCountEntry[],
    yesterdayResults: InventoryCountEntry[],
    transactions: Transaction[]
  ): void {
    const timestamp = this.getTimestamp();
    
    // Create summary data
    const summary = [
      {
        table: 'Checked Items',
        totalSKUs: checkedItems.length,
        totalQuantity: checkedItems.reduce((sum, item) => sum + item.amount, 0),
        lastUpdated: checkedItems.length > 0 ? Math.max(...checkedItems.map(item => item.timestamp.getTime())) : 0
      },
      {
        table: 'Expected Inventory',
        totalSKUs: expectedItems.length,
        totalQuantity: expectedItems.reduce((sum, item) => sum + item.amount, 0),
        lastUpdated: expectedItems.length > 0 ? Math.max(...expectedItems.map(item => item.timestamp.getTime())) : 0
      },
      {
        table: 'Yesterday Results',
        totalSKUs: yesterdayResults.length,
        totalQuantity: yesterdayResults.reduce((sum, item) => sum + item.amount, 0),
        lastUpdated: yesterdayResults.length > 0 ? Math.max(...yesterdayResults.map(item => item.timestamp.getTime())) : 0
      },
      {
        table: 'Transactions',
        totalSKUs: transactions.length,
        totalQuantity: transactions.reduce((sum, txn) => sum + txn.amount, 0),
        lastUpdated: transactions.length > 0 ? Math.max(...transactions.map(txn => txn.timestamp.getTime())) : 0
      }
    ];
    
    // Convert timestamps to readable dates
    const summaryWithDates = summary.map(row => ({
      ...row,
      lastUpdated: row.lastUpdated > 0 ? new Date(row.lastUpdated).toISOString() : 'Never'
    }));
    
    const headers = ['table', 'totalSKUs', 'totalQuantity', 'lastUpdated'];
    const csv = this.arrayToCSV(summaryWithDates, headers);
    const filename = `berjaya-wms-summary-${timestamp}.csv`;
    
    this.downloadCSV(csv, filename);
    console.log(`✅ Summary report exported to ${filename}`);
  }

  // Export Item Master List
  exportItemMaster(data: ItemMaster[]): void {
    if (data.length === 0) {
      alert('No items to export');
      return;
    }
    
    const headers = [
      'sku',
      'name',
      'category',
      'unit',
      'createdAt',
      'updatedAt'
    ];
    
    const csv = this.arrayToCSV(data, headers);
    const filename = `berjaya-wms-item-master-${this.getTimestamp()}.csv`;
    
    this.downloadCSV(csv, filename);
    console.log(`✅ Exported ${data.length} items to ${filename}`);
  }

  // Export BOMs
  exportBOMs(data: BOM[]): void {
    if (data.length === 0) {
      alert('No BOMs to export');
      return;
    }
    
    // Flatten BOM data - each component gets its own row
    const flattenedData: Record<string, any>[] = [];
    
    data.forEach(bom => {
      if (bom.components.length === 0) {
        // BOM with no components
        flattenedData.push({
          bomCode: bom.bomCode,
          bomName: bom.name,
          bomDescription: bom.description || '',
          componentSKU: '',
          componentName: '',
          quantity: 0,
          unit: '',
          totalComponents: bom.totalComponents,
          createdAt: bom.createdAt.toISOString(),
          updatedAt: bom.updatedAt.toISOString()
        });
      } else {
        // BOM with components
        bom.components.forEach(component => {
          flattenedData.push({
            bomCode: bom.bomCode,
            bomName: bom.name,
            bomDescription: bom.description || '',
            componentSKU: component.sku,
            componentName: component.name,
            quantity: component.quantity,
            unit: component.unit || '',
            totalComponents: bom.totalComponents,
            createdAt: bom.createdAt.toISOString(),
            updatedAt: bom.updatedAt.toISOString()
          });
        });
      }
    });
    
    const headers = [
      'bomCode',
      'bomName', 
      'bomDescription',
      'componentSKU',
      'componentName',
      'quantity',
      'unit',
      'totalComponents',
      'createdAt',
      'updatedAt'
    ];
    
    const csv = this.arrayToCSV(flattenedData, headers);
    const filename = `berjaya-wms-boms-${this.getTimestamp()}.csv`;
    
    this.downloadCSV(csv, filename);
    console.log(`✅ Exported ${data.length} BOMs (${flattenedData.length} component rows) to ${filename}`);
  }

  // Export all Item Master and BOM data
  exportAllItemData(
    itemMaster: ItemMaster[],
    boms: BOM[]
  ): void {
    const timestamp = this.getTimestamp();
    
    // Export each dataset separately
    if (itemMaster.length > 0) {
      this.exportItemMaster(itemMaster);
    }
    
    if (boms.length > 0) {
      this.exportBOMs(boms);
    }
    
    alert(`✅ All item data exported successfully!\\nFiles are downloaded with timestamp: ${timestamp}`);
  }

  // Export item management summary report
  exportItemManagementSummary(
    itemMaster: ItemMaster[],
    boms: BOM[]
  ): void {
    const timestamp = this.getTimestamp();
    
    // Get categories
    const categories = [...new Set(itemMaster
      .map(item => item.category)
      .filter(cat => cat)
    )] as string[];
    
    // Calculate BOM statistics
    const totalComponents = boms.reduce((sum, bom) => sum + bom.components.length, 0);
    const averageComponentsPerBOM = boms.length > 0 ? (totalComponents / boms.length) : 0;
    
    // Get unique component SKUs across all BOMs
    const allComponentSKUs = new Set<string>();
    boms.forEach(bom => {
      bom.components.forEach(component => {
        allComponentSKUs.add(component.sku);
      });
    });
    
    // Create summary data
    const summary = [
      {
        metric: 'Total Items in Master List',
        value: itemMaster.length,
        details: `${categories.length} categories`
      },
      {
        metric: 'Total BOMs',
        value: boms.length,
        details: `${totalComponents} total components`
      },
      {
        metric: 'Average Components per BOM',
        value: Math.round(averageComponentsPerBOM * 10) / 10,
        details: `${allComponentSKUs.size} unique component SKUs`
      },
      {
        metric: 'Item Categories',
        value: categories.length,
        details: categories.join(', ') || 'None'
      }
    ];
    
    const headers = ['metric', 'value', 'details'];
    const csv = this.arrayToCSV(summary, headers);
    const filename = `berjaya-wms-item-summary-${timestamp}.csv`;
    
    this.downloadCSV(csv, filename);
    console.log(`✅ Item management summary exported to ${filename}`);
  }
}

export const csvExportService = new CSVExportService();