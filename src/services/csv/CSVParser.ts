// CSV Parser - Core CSV parsing functionality
export interface CSVParseOptions {
  skipFirstRow?: boolean;
}

export class CSVParser {
  
  /**
   * Parse CSV text content into a 2D array of strings
   * Handles quoted fields and escaped quotes properly
   */
  parseCSV(content: string): string[][] {
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

  /**
   * Parse CSV with options and return structured data
   */
  parseWithOptions(content: string, options: CSVParseOptions = {}): {
    headers: string[];
    dataRows: string[][];
    totalRows: number;
  } {
    const { skipFirstRow = true } = options;
    
    const rows = this.parseCSV(content);
    
    if (rows.length === 0) {
      return {
        headers: [],
        dataRows: [],
        totalRows: 0
      };
    }
    
    const headers = skipFirstRow ? rows[0].map(h => h.toLowerCase()) : [];
    const dataRows = skipFirstRow ? rows.slice(1) : rows;
    
    return {
      headers,
      dataRows,
      totalRows: dataRows.length
    };
  }
}

export const csvParser = new CSVParser();