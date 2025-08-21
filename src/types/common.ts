// Common Utility Types for Berjaya WMS

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Firebase Error Types
export interface FirebaseError {
  code: string;
  message: string;
}