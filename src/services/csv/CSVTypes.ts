// CSV Types and Error Handling - Common interfaces and error utilities

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

export enum CSVErrorType {
  EMPTY_FILE = 'EMPTY_FILE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_DATA_TYPE = 'INVALID_DATA_TYPE',
  INSUFFICIENT_COLUMNS = 'INSUFFICIENT_COLUMNS'
}

export class CSVError extends Error {
  public readonly type: CSVErrorType;
  public readonly row?: number;
  public readonly field?: string;
  public readonly value?: string;

  constructor(
    type: CSVErrorType,
    message: string,
    options?: {
      row?: number;
      field?: string;
      value?: string;
    }
  ) {
    super(message);
    this.name = 'CSVError';
    this.type = type;
    this.row = options?.row;
    this.field = options?.field;
    this.value = options?.value;
  }

  /**
   * Create a user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case CSVErrorType.EMPTY_FILE:
        return 'The uploaded CSV file is empty. Please select a file with data.';
      case CSVErrorType.INVALID_FILE_TYPE:
        return 'Please upload a valid CSV file (.csv extension).';
      case CSVErrorType.FILE_TOO_LARGE:
        return 'The file is too large. Please upload a file smaller than 5MB.';
      case CSVErrorType.MISSING_REQUIRED_FIELD:
        return `Row ${this.row}: The required field '${this.field}' is missing or empty.`;
      case CSVErrorType.INVALID_DATA_TYPE:
        return `Row ${this.row}: Invalid ${this.field} value '${this.value}'. Please check the data format.`;
      case CSVErrorType.INSUFFICIENT_COLUMNS:
        return `Row ${this.row}: Not enough columns in this row. Please check your CSV format.`;
      case CSVErrorType.PARSE_ERROR:
        return `Failed to parse CSV file: ${this.message}`;
      case CSVErrorType.VALIDATION_ERROR:
        return this.message;
      default:
        return this.message;
    }
  }
}

export class CSVErrorCollector {
  private errors: CSVError[] = [];
  private warnings: string[] = [];

  addError(error: CSVError): void {
    this.errors.push(error);
  }

  addErrorMessage(type: CSVErrorType, message: string, options?: {
    row?: number;
    field?: string;
    value?: string;
  }): void {
    this.addError(new CSVError(type, message, options));
  }

  addWarning(warning: string): void {
    this.warnings.push(warning);
  }

  getErrors(): CSVError[] {
    return [...this.errors];
  }

  getErrorMessages(): string[] {
    return this.errors.map(error => error.getUserFriendlyMessage());
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Create a result object with current errors and warnings
   */
  createResult<T>(data: T[], totalRows: number): CSVParseResult<T> {
    const hasValidData = data.length > 0;
    const errorMessages = this.getErrorMessages();
    
    return {
      success: hasValidData && !this.hasErrors(),
      data,
      errors: errorMessages,
      warnings: this.getWarnings(),
      totalRows,
      validRows: data.length
    };
  }
}