// Firestore utility functions for data cleaning and validation

/**
 * Removes undefined fields from an object before saving to Firestore
 * Firestore doesn't accept undefined values and will throw an error
 */
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      // Handle nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const nestedCleaned = cleanFirestoreData(value);
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key as keyof T] = nestedCleaned as T[keyof T];
        }
      } else {
        cleaned[key as keyof T] = value;
      }
    }
  }
  
  return cleaned;
}

/**
 * Validates that required fields are present and not undefined
 */
export function validateRequiredFields<T>(
  data: T, 
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(String(field));
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Converts Firestore timestamp to Date object safely
 */
export function convertFirestoreTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();
  
  // Handle Firestore Timestamp
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  // Handle regular Date
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Handle string or number
  return new Date(timestamp);
}

/**
 * Prepares data for Firestore by cleaning undefined fields and adding timestamps
 */
export function prepareForFirestore<T extends Record<string, any>>(
  data: T,
  options: {
    addCreatedAt?: boolean;
    addUpdatedAt?: boolean;
    updatedBy?: string;
  } = {}
): Partial<T> & { createdAt?: Date; updatedAt?: Date; updatedBy?: string } {
  const cleaned = cleanFirestoreData(data);
  const now = new Date();
  
  const result: any = { ...cleaned };
  
  if (options.addCreatedAt) {
    result.createdAt = now;
  }
  
  if (options.addUpdatedAt) {
    result.updatedAt = now;
  }
  
  if (options.updatedBy) {
    result.updatedBy = options.updatedBy;
  }
  
  return result;
}