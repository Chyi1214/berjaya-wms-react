// CSV Import Service - Parse CSV files and validate data
import { InventoryCountEntry, ItemMaster, BOM, BOMComponent } from '../types';

export interface CSVParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

export interface CSVImportOptions {
  skipFirstRow?: boolean;
  validateData?: boolean;
  allowPartialImport?: boolean;
}

class CSVImportService {
  
  // Parse CSV text content
  private parseCSV(content: string): string[][] {
    const lines = content.trim().split('\n');
    const rows: string[][] = [];
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      row.push(current.trim());
      rows.push(row);
    }
    
    return rows;
  }
  
  // Validate required fields for inventory entry
  private validateInventoryEntry(row: string[], headers: string[], rowIndex: number): {
    entry: InventoryCountEntry | null;
    errors: string[];
  } {
    const errors: string[] = [];
    const entry: Partial<InventoryCountEntry> = {};
    
    // Required fields mapping
    const requiredFields = {
      sku: ['sku', 'SKU', 'item_code', 'itemcode'],
      itemName: ['itemName', 'item_name', 'name', 'description'],
      amount: ['amount', 'quantity', 'qty', 'count'],
      location: ['location', 'zone', 'area']
    };
    
    // Optional fields
    const optionalFields = {
      countedBy: ['countedBy', 'counted_by', 'counter', 'user'],
      timestamp: ['timestamp', 'date', 'time', 'created_at']
    };
    
    // Find and validate required fields
    for (const [fieldName, possibleHeaders] of Object.entries(requiredFields)) {
      const headerIndex = headers.findIndex(h => 
        possibleHeaders.includes(h.toLowerCase())
      );
      
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
      const headerIndex = headers.findIndex(h => 
        possibleHeaders.includes(h.toLowerCase())
      );
      
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
  
  // Parse inventory CSV content
  parseInventoryCSV(
    content: string, 
    options: CSVImportOptions = {}
  ): CSVParseResult<InventoryCountEntry> {
    const { skipFirstRow = true, validateData = true, allowPartialImport = true } = options;
    
    try {
      const rows = this.parseCSV(content);
      
      if (rows.length === 0) {
        return {
          success: false,
          data: [],
          errors: ['Empty CSV file'],
          warnings: [],
          totalRows: 0,
          validRows: 0
        };
      }
      
      const headers = skipFirstRow ? rows[0].map(h => h.toLowerCase()) : [];
      const dataRows = skipFirstRow ? rows.slice(1) : rows;
      
      const data: InventoryCountEntry[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Process each data row
      dataRows.forEach((row, index) => {
        const rowNumber = index + (skipFirstRow ? 2 : 1); // Account for header row
        
        if (!validateData) {
          // Simple parsing without validation
          if (row.length >= 4) {
            const entry: InventoryCountEntry = {
              sku: row[0]?.trim() || `item_${rowNumber}`,
              itemName: row[1]?.trim() || 'Imported Item',
              amount: parseInt(row[2]?.trim() || '0', 10) || 0,
              location: row[3]?.trim() || 'unknown',
              countedBy: row[4]?.trim() || 'csv.import',
              timestamp: new Date()
            };
            data.push(entry);
          } else {
            errors.push(`Row ${rowNumber}: Insufficient columns (need at least 4: SKU, Name, Amount, Location)`);
          }
        } else {
          // Validate and parse with field mapping
          const result = this.validateInventoryEntry(row, headers, rowNumber);
          if (result.entry) {
            data.push(result.entry);
          }
          errors.push(...result.errors);
        }
      });
      
      // Check if we have any valid data
      const hasValidData = data.length > 0;
      const success = hasValidData && (allowPartialImport || errors.length === 0);
      
      if (!success && hasValidData) {
        warnings.push(`${errors.length} validation errors found, but ${data.length} valid entries exist`);
      }
      
      return {
        success,
        data,
        errors,
        warnings,
        totalRows: dataRows.length,
        validRows: data.length
      };
      
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        totalRows: 0,
        validRows: 0
      };
    }
  }
  
  // Generate template CSV content for inventory
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
  
  // Download template file
  downloadTemplate(filename: string = 'berjaya-wms-inventory-template.csv'): void {
    const content = this.generateInventoryTemplate();
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
  
  // Validate file before processing
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
  
  // Read file content as text
  async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  // Validate ItemMaster entry
  private validateItemMasterEntry(row: string[], headers: string[], rowIndex: number): {
    entry: Omit<ItemMaster, 'createdAt' | 'updatedAt'> | null;
    errors: string[];
  } {
    const errors: string[] = [];
    const entry: Partial<Omit<ItemMaster, 'createdAt' | 'updatedAt'>> = {};
    
    // Required fields mapping
    const requiredFields = {
      sku: ['sku', 'SKU', 'item_code', 'itemcode', 'code'],
      name: ['name', 'item_name', 'itemname', 'description', 'title']
    };
    
    // Optional fields
    const optionalFields = {
      category: ['category', 'cat', 'type', 'group'],
      unit: ['unit', 'uom', 'unit_of_measure', 'measure']
    };
    
    // Find and validate required fields
    for (const [fieldName, possibleHeaders] of Object.entries(requiredFields)) {
      const headerIndex = headers.findIndex(h => 
        possibleHeaders.includes(h.toLowerCase())
      );
      
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
      const headerIndex = headers.findIndex(h => 
        possibleHeaders.includes(h.toLowerCase())
      );
      
      if (headerIndex >= 0 && row[headerIndex]?.trim()) {
        (entry as any)[fieldName] = row[headerIndex].trim();
      }
    }
    
    return {
      entry: errors.length === 0 ? entry as Omit<ItemMaster, 'createdAt' | 'updatedAt'> : null,
      errors
    };
  }

  // Parse Item Master CSV content
  parseItemMasterCSV(
    content: string, 
    options: CSVImportOptions = {}
  ): CSVParseResult<Omit<ItemMaster, 'createdAt' | 'updatedAt'>> {
    const { skipFirstRow = true, validateData = true, allowPartialImport = true } = options;
    
    try {
      const rows = this.parseCSV(content);
      
      if (rows.length === 0) {
        return {
          success: false,
          data: [],
          errors: ['Empty CSV file'],
          warnings: [],
          totalRows: 0,
          validRows: 0
        };
      }
      
      const headers = skipFirstRow ? rows[0].map(h => h.toLowerCase()) : [];
      const dataRows = skipFirstRow ? rows.slice(1) : rows;
      
      const data: Omit<ItemMaster, 'createdAt' | 'updatedAt'>[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Process each data row
      dataRows.forEach((row, index) => {
        const rowNumber = index + (skipFirstRow ? 2 : 1);
        
        if (validateData) {
          const result = this.validateItemMasterEntry(row, headers, rowNumber);
          if (result.entry) {
            data.push(result.entry);
          }
          errors.push(...result.errors);
        } else {
          // Simple parsing without validation
          if (row.length >= 2) {
            const entry: Omit<ItemMaster, 'createdAt' | 'updatedAt'> = {
              sku: row[0]?.trim() || `item_${rowNumber}`,
              name: row[1]?.trim() || 'Imported Item',
              category: row[2]?.trim() || undefined,
              unit: row[3]?.trim() || undefined
            };
            data.push(entry);
          } else {
            errors.push(`Row ${rowNumber}: Insufficient columns (need at least 2: SKU, Name)`);
          }
        }
      });
      
      const hasValidData = data.length > 0;
      const success = hasValidData && (allowPartialImport || errors.length === 0);
      
      return {
        success,
        data,
        errors,
        warnings,
        totalRows: dataRows.length,
        validRows: data.length
      };
      
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [`Failed to parse Item Master CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        totalRows: 0,
        validRows: 0
      };
    }
  }

  // Parse BOM CSV content (more complex format)
  parseBOMCSV(
    content: string, 
    options: CSVImportOptions = {}
  ): CSVParseResult<Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>> {
    const { skipFirstRow = true, allowPartialImport = true } = options;
    
    try {
      const rows = this.parseCSV(content);
      
      if (rows.length === 0) {
        return {
          success: false,
          data: [],
          errors: ['Empty CSV file'],
          warnings: [],
          totalRows: 0,
          validRows: 0
        };
      }
      
      const dataRows = skipFirstRow ? rows.slice(1) : rows;
      
      const data: Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Group rows by BOM code
      const bomGroups: { [bomCode: string]: string[][] } = {};
      
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
      
      // Process each BOM group
      for (const [bomCode, bomRows] of Object.entries(bomGroups)) {
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
          
          if (bom.components.length > 0) {
            data.push(bom);
          } else {
            errors.push(`BOM ${bomCode}: No valid components found`);
          }
          
        } catch (error) {
          errors.push(`BOM ${bomCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      const hasValidData = data.length > 0;
      const success = hasValidData && (allowPartialImport || errors.length === 0);
      
      return {
        success,
        data,
        errors,
        warnings,
        totalRows: dataRows.length,
        validRows: data.length
      };
      
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [`Failed to parse BOM CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        totalRows: 0,
        validRows: 0
      };
    }
  }

  // Generate template CSV for Item Master
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

  // Generate template CSV for BOM
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

  // Download Item Master template
  downloadItemMasterTemplate(filename: string = 'berjaya-wms-item-master-template.csv'): void {
    const content = this.generateItemMasterTemplate();
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

  // Download BOM template
  downloadBOMTemplate(filename: string = 'berjaya-wms-bom-template.csv'): void {
    const content = this.generateBOMTemplate();
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

export const csvImportService = new CSVImportService();