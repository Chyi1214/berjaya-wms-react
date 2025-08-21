// CSV Import Service - Orchestrates CSV parsing, validation, and transformation
import { InventoryCountEntry, ItemMaster, BOM } from '../types';
import {
  csvParser,
  csvValidator,
  csvTransformer,
  CSVErrorCollector,
  CSVErrorType
} from './csv';
import type {
  CSVParseResult,
  CSVImportOptions
} from './csv';

// Re-export types for external use
export type { CSVParseResult, CSVImportOptions };

class CSVImportService {
  /**
   * Parse inventory CSV content using modular approach
   */
  parseInventoryCSV(
    content: string, 
    options: CSVImportOptions = {}
  ): CSVParseResult<InventoryCountEntry> {
    const { skipFirstRow = true, validateData = true, allowPartialImport = true } = options;
    const errorCollector = new CSVErrorCollector();
    
    try {
      // Parse CSV content
      const parseResult = csvParser.parseWithOptions(content, { skipFirstRow });
      
      if (parseResult.totalRows === 0) {
        errorCollector.addErrorMessage(CSVErrorType.EMPTY_FILE, 'Empty CSV file');
        return errorCollector.createResult<InventoryCountEntry>([], 0);
      }
      
      const { headers, dataRows } = parseResult;
      const data: InventoryCountEntry[] = [];
      
      // Process each data row
      dataRows.forEach((row, index) => {
        const rowNumber = index + (skipFirstRow ? 2 : 1);
        
        if (!validateData) {
          // Simple transformation without validation
          if (row.length >= 4) {
            const entry = csvTransformer.transformToInventoryEntry(row, rowNumber);
            data.push(entry);
          } else {
            errorCollector.addErrorMessage(
              CSVErrorType.INSUFFICIENT_COLUMNS,
              'Insufficient columns (need at least 4: SKU, Name, Amount, Location)',
              { row: rowNumber }
            );
          }
        } else {
          // Validate and parse with field mapping
          const result = csvValidator.validateInventoryEntry(row, headers, rowNumber);
          if (result.entry) {
            data.push(result.entry);
          }
          
          // Add individual errors
          result.errors.forEach(error => {
            errorCollector.addErrorMessage(CSVErrorType.VALIDATION_ERROR, error);
          });
        }
      });
      
      // Add warnings for partial imports
      if (allowPartialImport && data.length > 0 && errorCollector.hasErrors()) {
        errorCollector.addWarning(
          `${errorCollector.getErrors().length} validation errors found, but ${data.length} valid entries exist`
        );
      }
      
      return errorCollector.createResult(data, parseResult.totalRows);
      
    } catch (error) {
      errorCollector.addErrorMessage(
        CSVErrorType.PARSE_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return errorCollector.createResult<InventoryCountEntry>([], 0);
    }
  }
  /**
   * Generate inventory template CSV content
   */
  generateInventoryTemplate(): string {
    return csvTransformer.generateInventoryTemplate();
  }
  /**
   * Download inventory template file
   */
  downloadTemplate(filename: string = 'berjaya-wms-inventory-template.csv'): void {
    const content = this.generateInventoryTemplate();
    csvTransformer.downloadCSVFile(content, filename);
  }
  /**
   * Validate file before processing
   */
  validateFile(file: File): { valid: boolean; errors: string[] } {
    return csvValidator.validateFile(file);
  }
  /**
   * Read file content as text
   */
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
  /**
   * Parse Item Master CSV content using modular approach
   */
  parseItemMasterCSV(
    content: string, 
    options: CSVImportOptions = {}
  ): CSVParseResult<Omit<ItemMaster, 'createdAt' | 'updatedAt'>> {
    const { skipFirstRow = true, validateData = true, allowPartialImport = true } = options;
    const errorCollector = new CSVErrorCollector();
    
    try {
      // Parse CSV content
      const parseResult = csvParser.parseWithOptions(content, { skipFirstRow });
      
      if (parseResult.totalRows === 0) {
        errorCollector.addErrorMessage(CSVErrorType.EMPTY_FILE, 'Empty CSV file');
        return errorCollector.createResult<Omit<ItemMaster, 'createdAt' | 'updatedAt'>>([], 0);
      }
      
      const { headers, dataRows } = parseResult;
      const data: Omit<ItemMaster, 'createdAt' | 'updatedAt'>[] = [];
      
      // Process each data row
      dataRows.forEach((row, index) => {
        const rowNumber = index + (skipFirstRow ? 2 : 1);
        
        if (validateData) {
          const result = csvValidator.validateItemMasterEntry(row, headers, rowNumber);
          if (result.entry) {
            data.push(result.entry);
          }
          
          result.errors.forEach(error => {
            errorCollector.addErrorMessage(CSVErrorType.VALIDATION_ERROR, error);
          });
        } else {
          // Simple transformation without validation
          if (row.length >= 2) {
            const entry = csvTransformer.transformToItemMaster(row, rowNumber);
            data.push(entry);
          } else {
            errorCollector.addErrorMessage(
              CSVErrorType.INSUFFICIENT_COLUMNS,
              'Insufficient columns (need at least 2: SKU, Name)',
              { row: rowNumber }
            );
          }
        }
      });
      
      // Add warnings for partial imports
      if (allowPartialImport && data.length > 0 && errorCollector.hasErrors()) {
        errorCollector.addWarning(
          `${errorCollector.getErrors().length} validation errors found, but ${data.length} valid entries exist`
        );
      }
      
      return errorCollector.createResult(data, parseResult.totalRows);
      
    } catch (error) {
      errorCollector.addErrorMessage(
        CSVErrorType.PARSE_ERROR,
        `Failed to parse Item Master CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return errorCollector.createResult<Omit<ItemMaster, 'createdAt' | 'updatedAt'>>([], 0);
    }
  }
  /**
   * Parse BOM CSV content using modular approach
   */
  parseBOMCSV(
    content: string, 
    options: CSVImportOptions = {}
  ): CSVParseResult<Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>> {
    const { skipFirstRow = true, allowPartialImport = true } = options;
    const errorCollector = new CSVErrorCollector();
    
    try {
      // Parse CSV content
      const parseResult = csvParser.parseWithOptions(content, { skipFirstRow });
      
      if (parseResult.totalRows === 0) {
        errorCollector.addErrorMessage(CSVErrorType.EMPTY_FILE, 'Empty CSV file');
        return errorCollector.createResult<Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>>([], 0);
      }
      
      const { dataRows } = parseResult;
      const data: Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>[] = [];
      
      // Group rows by BOM code
      const groupResult = csvTransformer.groupBOMRows(dataRows, skipFirstRow);
      
      // Add grouping errors
      groupResult.errors.forEach(error => {
        errorCollector.addErrorMessage(CSVErrorType.VALIDATION_ERROR, error);
      });
      
      // Process each BOM group
      for (const [bomCode, bomRows] of Object.entries(groupResult.bomGroups)) {
        const transformResult = csvTransformer.transformToBOM(bomCode, bomRows);
        
        if (transformResult.bom) {
          data.push(transformResult.bom);
        }
        
        transformResult.errors.forEach(error => {
          errorCollector.addErrorMessage(CSVErrorType.VALIDATION_ERROR, error);
        });
      }
      
      // Add warnings for partial imports
      if (allowPartialImport && data.length > 0 && errorCollector.hasErrors()) {
        errorCollector.addWarning(
          `${errorCollector.getErrors().length} validation errors found, but ${data.length} valid BOMs exist`
        );
      }
      
      return errorCollector.createResult(data, parseResult.totalRows);
      
    } catch (error) {
      errorCollector.addErrorMessage(
        CSVErrorType.PARSE_ERROR,
        `Failed to parse BOM CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return errorCollector.createResult<Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>>([], 0);
    }
  }
  /**
   * Generate Item Master template CSV content
   */
  generateItemMasterTemplate(): string {
    return csvTransformer.generateItemMasterTemplate();
  }
  /**
   * Generate BOM template CSV content
   */
  generateBOMTemplate(): string {
    return csvTransformer.generateBOMTemplate();
  }
  /**
   * Download Item Master template file
   */
  downloadItemMasterTemplate(filename: string = 'berjaya-wms-item-master-template.csv'): void {
    const content = this.generateItemMasterTemplate();
    csvTransformer.downloadCSVFile(content, filename);
  }
  /**
   * Download BOM template file
   */
  downloadBOMTemplate(filename: string = 'berjaya-wms-bom-template.csv'): void {
    const content = this.generateBOMTemplate();
    csvTransformer.downloadCSVFile(content, filename);
  }
}

export const csvImportService = new CSVImportService();