/**
 * Centralized logging service for the Berjaya WMS application
 * Provides configurable logging levels for development and production environments
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private currentLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (data !== undefined) {
      return `${prefix} ${message}`;
    }
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, data);

    switch (level) {
      case LogLevel.DEBUG:
        if (data !== undefined) {
          console.log(formattedMessage, data);
        } else {
          console.log(formattedMessage);
        }
        break;
      case LogLevel.INFO:
        if (data !== undefined) {
          console.info(formattedMessage, data);
        } else {
          console.info(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        if (data !== undefined) {
          console.warn(formattedMessage, data);
        } else {
          console.warn(formattedMessage);
        }
        break;
      case LogLevel.ERROR:
        if (data !== undefined) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }

  /**
   * Debug level logging - only shown in development
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  /**
   * Error level logging - always shown
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  /**
   * Create a logger instance for a specific module
   */
  createModuleLogger(moduleName: string) {
    return {
      debug: (message: string, data?: unknown) => this.debug(`[${moduleName}] ${message}`, data),
      info: (message: string, data?: unknown) => this.info(`[${moduleName}] ${message}`, data),
      warn: (message: string, data?: unknown) => this.warn(`[${moduleName}] ${message}`, data),
      error: (message: string, data?: unknown) => this.error(`[${moduleName}] ${message}`, data),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default logger methods for easy import
export const { debug, info, warn, error } = logger;

// Export module logger creator
export const createModuleLogger = (moduleName: string) => logger.createModuleLogger(moduleName);