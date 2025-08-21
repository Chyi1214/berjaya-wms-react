// CSV Validator - Data validation for different CSV types
import { InventoryCountEntry, ItemMaster, BOMComponent } from '../../types';

export interface ValidationResult<T> {
  entry: T | null;
  errors: string[];
}

export interface FieldMapping {
  [key: string]: string[];
}

export class CSVValidator {
  
  /**
   * Find header index by possible field names
   */
  private findHeaderIndex(headers: string[], possibleNames: string[]): number {
    return headers.findIndex(h => 
      possibleNames.includes(h.toLowerCase())
    );
  }

  /**
   * Validate inventory count entry
   */
  validateInventoryEntry(
    row: string[], 
    headers: string[], 
    rowIndex: number
  ): ValidationResult<InventoryCountEntry> {
    const errors: string[] = [];
    const entry: Partial<InventoryCountEntry> = {};
    
    // Required fields mapping
    const requiredFields: FieldMapping = {
      sku: ['sku', 'SKU', 'item_code', 'itemcode'],
      itemName: ['itemName', 'item_name', 'name', 'description'],
      amount: ['amount', 'quantity', 'qty', 'count'],
      location: ['location', 'zone', 'area']
    };
    
    // Optional fields
    const optionalFields: FieldMapping = {
      countedBy: ['countedBy', 'counted_by', 'counter', 'user'],
      timestamp: ['timestamp', 'date', 'time', 'created_at']
    };
    
    // Find and validate required fields
    for (const [fieldName, possibleHeaders] of Object.entries(requiredFields)) {
      const headerIndex = this.findHeaderIndex(headers, possibleHeaders);
      
      if (headerIndex === -1) {
        errors.push(`Row ${rowIndex}: Missing required field '${fieldName}'`);
        continue;
      }
      
      const value = row[headerIndex]?.trim();
      if (!value) {
        errors.push(`Row ${rowIndex}: Empty value for '${fieldName}'`);
        continue;
      }
      
      // Type-specific validation
      if (fieldName === 'amount') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`Row ${rowIndex}: Invalid amount '${value}' (must be positive number)`);
          continue;
        }
        entry.amount = numValue;
      } else {
        (entry as any)[fieldName] = value;
      }
    }
    
    // Handle optional fields
    for (const [fieldName, possibleHeaders] of Object.entries(optionalFields)) {
      const headerIndex = this.findHeaderIndex(headers, possibleHeaders);
      
      if (headerIndex >= 0 && row[headerIndex]?.trim()) {
        const value = row[headerIndex].trim();
        
        if (fieldName === 'timestamp') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            entry.timestamp = date;
          }
        } else {
          (entry as any)[fieldName] = value;
        }
      }
    }
    
    // Set defaults for missing optional fields
    if (!entry.countedBy) {
      entry.countedBy = 'csv.import';
    }
    if (!entry.timestamp) {
      entry.timestamp = new Date();
    }
    
    return {
      entry: errors.length === 0 ? entry as InventoryCountEntry : null,
      errors
    };
  }

  /**
   * Validate Item Master entry
   */
  validateItemMasterEntry(
    row: string[], 
    headers: string[], 
    rowIndex: number
  ): ValidationResult<Omit<ItemMaster, 'createdAt' | 'updatedAt'>> {
    const errors: string[] = [];
    const entry: Partial<Omit<ItemMaster, 'createdAt' | 'updatedAt'>> = {};
    
    // Required fields mapping
    const requiredFields: FieldMapping = {
      sku: ['sku', 'SKU', 'item_code', 'itemcode', 'code'],
      name: ['name', 'item_name', 'itemname', 'description', 'title']
    };
    
    // Optional fields
    const optionalFields: FieldMapping = {
      category: ['category', 'cat', 'type', 'group'],
      unit: ['unit', 'uom', 'unit_of_measure', 'measure']
    };
    
    // Find and validate required fields
    for (const [fieldName, possibleHeaders] of Object.entries(requiredFields)) {
      const headerIndex = this.findHeaderIndex(headers, possibleHeaders);
      
      if (headerIndex === -1) {
        errors.push(`Row ${rowIndex}: Missing required field '${fieldName}'`);
        continue;
      }
      
      const value = row[headerIndex]?.trim();
      if (!value) {
        errors.push(`Row ${rowIndex}: Empty value for '${fieldName}'`);
        continue;
      }
      
      (entry as any)[fieldName] = value;
    }
    
    // Handle optional fields
    for (const [fieldName, possibleHeaders] of Object.entries(optionalFields)) {
      const headerIndex = this.findHeaderIndex(headers, possibleHeaders);
      
      if (headerIndex >= 0 && row[headerIndex]?.trim()) {
        (entry as any)[fieldName] = row[headerIndex].trim();
      }
    }
    
    return {
      entry: errors.length === 0 ? entry as Omit<ItemMaster, 'createdAt' | 'updatedAt'> : null,
      errors
    };
  }

  /**
   * Validate BOM component from row data
   */
  validateBOMComponent(row: string[], rowIndex: number): {
    component: BOMComponent | null;
    errors: string[];
  } {
    const errors: string[] = [];
    
    const componentSKU = row[3]?.trim();
    const componentName = row[4]?.trim();
    const componentQtyStr = row[5]?.trim();
    const componentUnit = row[6]?.trim();
    
    if (!componentSKU) {
      errors.push(`Row ${rowIndex}: Missing component SKU`);
    }
    
    if (!componentName) {
      errors.push(`Row ${rowIndex}: Missing component name`);
    }
    
    const componentQty = parseInt(componentQtyStr || '0', 10);
    if (!componentQtyStr || isNaN(componentQty) || componentQty <= 0) {
      errors.push(`Row ${rowIndex}: Invalid component quantity '${componentQtyStr}' (must be positive number)`);
    }
    
    if (errors.length > 0) {
      return { component: null, errors };
    }
    
    const component: BOMComponent = {
      sku: componentSKU!,
      name: componentName!,
      quantity: componentQty,
      unit: componentUnit || undefined
    };
    
    return { component, errors: [] };
  }

  /**
   * Validate file before processing
   */
  validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file type
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      errors.push('File must be a CSV (.csv) file');
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 5MB');
    }
    
    // Check file size (min 1 byte)
    if (file.size === 0) {
      errors.push('File is empty');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const csvValidator = new CSVValidator();