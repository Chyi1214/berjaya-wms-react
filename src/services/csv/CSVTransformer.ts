// CSV Transformer - Data transformation and template generation
import { InventoryCountEntry, ItemMaster, BOM, BOMComponent } from '../../types';

export interface CSVTransformOptions {
  validateData?: boolean;
  allowPartialImport?: boolean;
}

export class CSVTransformer {
  
  /**
   * Transform raw CSV row to InventoryCountEntry (simple mode)
   */
  transformToInventoryEntry(row: string[], rowNumber: number): InventoryCountEntry {
    return {
      sku: row[0]?.trim() || `item_${rowNumber}`,
      itemName: row[1]?.trim() || 'Imported Item',
      amount: parseInt(row[2]?.trim() || '0', 10) || 0,
      location: row[3]?.trim() || 'unknown',
      countedBy: row[4]?.trim() || 'csv.import',
      timestamp: new Date()
    };
  }

  /**
   * Transform raw CSV row to ItemMaster (simple mode)
   */
  transformToItemMaster(row: string[], rowNumber: number): Omit<ItemMaster, 'createdAt' | 'updatedAt'> {
    return {
      sku: row[0]?.trim() || `item_${rowNumber}`,
      name: row[1]?.trim() || 'Imported Item',
      category: row[2]?.trim() || undefined,
      unit: row[3]?.trim() || undefined
    };
  }

  /**
   * Transform grouped BOM rows into BOM object
   */
  transformToBOM(
    bomCode: string, 
    bomRows: string[][]
  ): { bom: Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'> | null; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const firstRow = bomRows[0];
      const bom: Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'> = {
        bomCode,
        name: firstRow[1]?.trim() || `BOM ${bomCode}`,
        description: firstRow[2]?.trim() || undefined,
        components: []
      };
      
      // Process components
      for (const row of bomRows) {
        const componentSKU = row[3]?.trim();
        const componentName = row[4]?.trim();
        const componentQty = parseInt(row[5]?.trim() || '0', 10);
        const componentUnit = row[6]?.trim();
        
        if (componentSKU && componentName && componentQty > 0) {
          const component: BOMComponent = {
            sku: componentSKU,
            name: componentName,
            quantity: componentQty,
            unit: componentUnit || undefined
          };
          bom.components.push(component);
        }
      }
      
      if (bom.components.length === 0) {
        errors.push(`BOM ${bomCode}: No valid components found`);
        return { bom: null, errors };
      }
      
      return { bom, errors: [] };
      
    } catch (error) {
      errors.push(`BOM ${bomCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { bom: null, errors };
    }
  }

  /**
   * Group BOM rows by BOM code
   */
  groupBOMRows(dataRows: string[][], skipFirstRow: boolean = true): { 
    bomGroups: { [bomCode: string]: string[][] }; 
    errors: string[] 
  } {
    const bomGroups: { [bomCode: string]: string[][] } = {};
    const errors: string[] = [];
    
    dataRows.forEach((row, index) => {
      const rowNumber = index + (skipFirstRow ? 2 : 1);
      const bomCode = row[0]?.trim();
      
      if (!bomCode) {
        errors.push(`Row ${rowNumber}: Missing BOM code`);
        return;
      }
      
      if (!bomGroups[bomCode]) {
        bomGroups[bomCode] = [];
      }
      bomGroups[bomCode].push(row);
    });
    
    return { bomGroups, errors };
  }

  /**
   * Generate inventory template CSV content
   */
  generateInventoryTemplate(): string {
    const headers = ['sku', 'itemName', 'amount', 'location', 'countedBy', 'timestamp'];
    const sampleData = [
      ['A001', 'Sample Product A', '100', 'logistics', 'system.template', new Date().toISOString()],
      ['B002', 'Sample Product B', '50', 'production_zone_1', 'system.template', new Date().toISOString()],
      ['C003', 'Sample Product C', '75', 'production_zone_2', 'system.template', new Date().toISOString()]
    ];
    
    const csvLines = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ];
    
    return csvLines.join('\n');
  }

  /**
   * Generate Item Master template CSV content
   */
  generateItemMasterTemplate(): string {
    const headers = ['sku', 'name', 'category', 'unit'];
    const sampleData = [
      ['A001', 'Sample Item A', 'Hardware', 'pcs'],
      ['B002', 'Sample Item B', 'Electronics', 'kg'],
      ['C003', 'Sample Item C', 'Materials', 'liters']
    ];
    
    const csvLines = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ];
    
    return csvLines.join('\n');
  }

  /**
   * Generate BOM template CSV content
   */
  generateBOMTemplate(): string {
    const headers = ['bomCode', 'bomName', 'bomDescription', 'componentSKU', 'componentName', 'quantity', 'unit'];
    const sampleData = [
      ['BOM001', 'Engine Assembly', 'Complete engine assembly', 'A001', 'Engine Block', '1', 'pcs'],
      ['BOM001', 'Engine Assembly', 'Complete engine assembly', 'A002', 'Piston Set', '4', 'pcs'],
      ['BOM001', 'Engine Assembly', 'Complete engine assembly', 'A003', 'Gasket Kit', '1', 'set'],
      ['BOM002', 'Brake System', 'Complete brake system', 'B001', 'Brake Disc', '2', 'pcs'],
      ['BOM002', 'Brake System', 'Complete brake system', 'B002', 'Brake Pads', '1', 'set']
    ];
    
    const csvLines = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ];
    
    return csvLines.join('\n');
  }

  /**
   * Download CSV file with UTF-8 BOM for Excel compatibility
   */
  downloadCSVFile(content: string, filename: string): void {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

export const csvTransformer = new CSVTransformer();