// Centralized Error Handling - Standard error types and utilities for all services

import { createModuleLogger } from './logger';

type ModuleLogger = ReturnType<typeof createModuleLogger>;

export enum ServiceErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ServiceError extends Error {
  public readonly type: ServiceErrorType;
  public readonly service: string;
  public readonly operation: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    type: ServiceErrorType,
    message: string,
    service: string,
    operation: string,
    options?: {
      originalError?: Error;
      context?: Record<string, any>;
    }
  ) {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
    this.service = service;
    this.operation = operation;
    this.originalError = options?.originalError;
    this.context = options?.context;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case ServiceErrorType.NETWORK_ERROR:
        return 'Network connection problem. Please check your internet connection and try again.';
      case ServiceErrorType.PERMISSION_DENIED:
        return 'Access denied. You do not have permission to perform this action.';
      case ServiceErrorType.NOT_FOUND:
        return 'The requested item could not be found.';
      case ServiceErrorType.ALREADY_EXISTS:
        return 'This item already exists in the system.';
      case ServiceErrorType.VALIDATION_ERROR:
        return `Invalid data: ${this.message}`;
      case ServiceErrorType.STORAGE_ERROR:
        return 'Database error. Please try again later.';
      case ServiceErrorType.AUTHENTICATION_ERROR:
        return 'Authentication failed. Please sign in again.';
      case ServiceErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get technical error details for logging
   */
  getTechnicalDetails(): Record<string, any> {
    return {
      type: this.type,
      service: this.service,
      operation: this.operation,
      message: this.message,
      originalError: this.originalError?.message,
      stack: this.stack,
      context: this.context
    };
  }
}

export class ErrorHandler {
  private logger: ModuleLogger;
  private serviceName: string;

  constructor(serviceName: string, logger: ModuleLogger) {
    this.serviceName = serviceName;
    this.logger = logger;
  }

  /**
   * Handle and transform Firebase/Firestore errors
   */
  handleFirebaseError(error: any, operation: string, context?: Record<string, any>): ServiceError {
    let errorType: ServiceErrorType;
    let message: string;

    // Firebase error code mapping
    switch (error.code) {
      case 'permission-denied':
        errorType = ServiceErrorType.PERMISSION_DENIED;
        message = 'Permission denied for this operation';
        break;
      case 'not-found':
        errorType = ServiceErrorType.NOT_FOUND;
        message = 'Document not found';
        break;
      case 'already-exists':
        errorType = ServiceErrorType.ALREADY_EXISTS;
        message = 'Document already exists';
        break;
      case 'unavailable':
      case 'deadline-exceeded':
        errorType = ServiceErrorType.NETWORK_ERROR;
        message = 'Service temporarily unavailable';
        break;
      case 'resource-exhausted':
        errorType = ServiceErrorType.RATE_LIMIT_ERROR;
        message = 'Rate limit exceeded';
        break;
      case 'unauthenticated':
        errorType = ServiceErrorType.AUTHENTICATION_ERROR;
        message = 'Authentication required';
        break;
      default:
        errorType = ServiceErrorType.STORAGE_ERROR;
        message = error.message || 'Database operation failed';
    }

    const serviceError = new ServiceError(
      errorType,
      message,
      this.serviceName,
      operation,
      { originalError: error, context }
    );

    this.logger.error(`${operation} failed`, serviceError.getTechnicalDetails());
    return serviceError;
  }

  /**
   * Handle generic errors
   */
  handleGenericError(error: any, operation: string, context?: Record<string, any>): ServiceError {
    const errorType = error instanceof Error ? 
      ServiceErrorType.UNKNOWN_ERROR : 
      ServiceErrorType.VALIDATION_ERROR;
    
    const message = error instanceof Error ? error.message : String(error);

    const serviceError = new ServiceError(
      errorType,
      message,
      this.serviceName,
      operation,
      { originalError: error instanceof Error ? error : undefined, context }
    );

    this.logger.error(`${operation} failed`, serviceError.getTechnicalDetails());
    return serviceError;
  }

  /**
   * Create validation error
   */
  createValidationError(message: string, operation: string, context?: Record<string, any>): ServiceError {
    const serviceError = new ServiceError(
      ServiceErrorType.VALIDATION_ERROR,
      message,
      this.serviceName,
      operation,
      { context }
    );

    this.logger.warn(`Validation error in ${operation}`, serviceError.getTechnicalDetails());
    return serviceError;
  }

  /**
   * Wrap async operations with error handling
   */
  async wrapAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      this.logger.debug(`Starting ${operation}`, context);
      const result = await fn();
      this.logger.debug(`Completed ${operation}`, context);
      return result;
    } catch (error: any) {
      if (error instanceof ServiceError) {
        throw error; // Re-throw ServiceError as-is
      }
      
      // Handle Firebase errors
      if (error.code && typeof error.code === 'string') {
        throw this.handleFirebaseError(error, operation, context);
      }
      
      // Handle generic errors
      throw this.handleGenericError(error, operation, context);
    }
  }

  /**
   * Log successful operations
   */
  logSuccess(operation: string, context?: Record<string, any>): void {
    this.logger.info(`${operation} completed successfully`, context);
  }
}