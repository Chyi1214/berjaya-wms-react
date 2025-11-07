// Cost Tracker Service - Central tracking for all Firebase and API operations
// Tracks operations in-memory and provides metrics for dashboard

export interface OperationMetric {
  serviceName: string;
  functionName: string;
  operationType: 'read' | 'write' | 'delete' | 'storage' | 'api';
  count: number;
  timestamp: Date;
  metadata?: {
    documentCount?: number;
    bytes?: number;
    tokens?: {
      input: number;
      output: number;
    };
  };
}

export interface ServiceMetrics {
  serviceName: string;
  operations: {
    reads: number;
    writes: number;
    deletes: number;
    storageUploads: number;
    storageBytes: number;
    apiCalls: number;
    apiTokensInput: number;
    apiTokensOutput: number;
  };
  functions: Map<string, FunctionMetrics>;
}

export interface FunctionMetrics {
  functionName: string;
  reads: number;
  writes: number;
  deletes: number;
  storageUploads: number;
  storageBytes: number;
  apiCalls: number;
  apiTokensInput: number;
  apiTokensOutput: number;
}

class CostTracker {
  private metrics: Map<string, ServiceMetrics> = new Map();
  private operations: OperationMetric[] = [];
  private startDate: Date = new Date();

  // Memory limits to prevent unbounded growth
  private readonly MAX_OPERATIONS_LOG = 10000; // Keep last 10K operations
  private readonly MAX_SERVICES = 100; // Max 100 services tracked

  // Track an operation
  trackOperation(metric: OperationMetric): void {
    // Debug log for storage operations
    if (metric.operationType === 'storage') {
      const sizeKB = (metric.metadata?.bytes || 0) / 1024;
      console.log(`💾 Storage tracked: ${metric.serviceName}.${metric.functionName} - ${sizeKB.toFixed(2)} KB`);
    }

    // Add to operations log
    this.operations.push(metric);

    // Enforce memory limit - keep only recent operations
    if (this.operations.length > this.MAX_OPERATIONS_LOG) {
      this.operations = this.operations.slice(-this.MAX_OPERATIONS_LOG);
    }

    // Update service metrics
    let serviceMetrics = this.metrics.get(metric.serviceName);
    if (!serviceMetrics) {
      // Enforce service limit to prevent memory issues
      if (this.metrics.size >= this.MAX_SERVICES) {
        console.warn(`⚠️ Max services (${this.MAX_SERVICES}) reached. Skipping tracking for ${metric.serviceName}`);
        return;
      }
      serviceMetrics = this.createEmptyServiceMetrics(metric.serviceName);
      this.metrics.set(metric.serviceName, serviceMetrics);
    }

    // Update service-level totals
    this.updateServiceTotals(serviceMetrics, metric);

    // Update function-level metrics
    this.updateFunctionMetrics(serviceMetrics, metric);
  }

  private createEmptyServiceMetrics(serviceName: string): ServiceMetrics {
    return {
      serviceName,
      operations: {
        reads: 0,
        writes: 0,
        deletes: 0,
        storageUploads: 0,
        storageBytes: 0,
        apiCalls: 0,
        apiTokensInput: 0,
        apiTokensOutput: 0,
      },
      functions: new Map(),
    };
  }

  private updateServiceTotals(service: ServiceMetrics, metric: OperationMetric): void {
    const count = metric.count || 1;

    switch (metric.operationType) {
      case 'read':
        service.operations.reads += count;
        break;
      case 'write':
        service.operations.writes += count;
        break;
      case 'delete':
        service.operations.deletes += count;
        break;
      case 'storage':
        service.operations.storageUploads += count;
        service.operations.storageBytes += metric.metadata?.bytes || 0;
        break;
      case 'api':
        service.operations.apiCalls += count;
        service.operations.apiTokensInput += metric.metadata?.tokens?.input || 0;
        service.operations.apiTokensOutput += metric.metadata?.tokens?.output || 0;
        break;
    }
  }

  private updateFunctionMetrics(service: ServiceMetrics, metric: OperationMetric): void {
    let funcMetrics = service.functions.get(metric.functionName);
    if (!funcMetrics) {
      funcMetrics = {
        functionName: metric.functionName,
        reads: 0,
        writes: 0,
        deletes: 0,
        storageUploads: 0,
        storageBytes: 0,
        apiCalls: 0,
        apiTokensInput: 0,
        apiTokensOutput: 0,
      };
      service.functions.set(metric.functionName, funcMetrics);
    }

    const count = metric.count || 1;

    switch (metric.operationType) {
      case 'read':
        funcMetrics.reads += count;
        break;
      case 'write':
        funcMetrics.writes += count;
        break;
      case 'delete':
        funcMetrics.deletes += count;
        break;
      case 'storage':
        funcMetrics.storageUploads += count;
        funcMetrics.storageBytes += metric.metadata?.bytes || 0;
        break;
      case 'api':
        funcMetrics.apiCalls += count;
        funcMetrics.apiTokensInput += metric.metadata?.tokens?.input || 0;
        funcMetrics.apiTokensOutput += metric.metadata?.tokens?.output || 0;
        break;
    }
  }

  // Get all service metrics
  getAllMetrics(): ServiceMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Get metrics for a specific service
  getServiceMetrics(serviceName: string): ServiceMetrics | undefined {
    return this.metrics.get(serviceName);
  }

  // Get total operation counts across all services
  getTotalOperations(): {
    reads: number;
    writes: number;
    deletes: number;
    storageUploads: number;
    storageBytes: number;
    apiCalls: number;
    apiTokensInput: number;
    apiTokensOutput: number;
  } {
    const totals = {
      reads: 0,
      writes: 0,
      deletes: 0,
      storageUploads: 0,
      storageBytes: 0,
      apiCalls: 0,
      apiTokensInput: 0,
      apiTokensOutput: 0,
    };

    for (const service of this.metrics.values()) {
      totals.reads += service.operations.reads;
      totals.writes += service.operations.writes;
      totals.deletes += service.operations.deletes;
      totals.storageUploads += service.operations.storageUploads;
      totals.storageBytes += service.operations.storageBytes;
      totals.apiCalls += service.operations.apiCalls;
      totals.apiTokensInput += service.operations.apiTokensInput;
      totals.apiTokensOutput += service.operations.apiTokensOutput;
    }

    return totals;
  }

  // Get recent operations (for debugging)
  getRecentOperations(limit: number = 100): OperationMetric[] {
    return this.operations.slice(-limit);
  }

  // Reset metrics (call at midnight or manually)
  reset(): void {
    this.metrics.clear();
    this.operations = [];
    this.startDate = new Date();
  }

  // Get tracking start time
  getStartDate(): Date {
    return this.startDate;
  }

  // Export metrics as JSON for external analysis
  exportMetrics(): string {
    const data = {
      startDate: this.startDate,
      endDate: new Date(),
      services: Array.from(this.metrics.entries()).map(([name, metrics]) => ({
        serviceName: name,
        operations: metrics.operations,
        functions: Array.from(metrics.functions.values()),
      })),
      totals: this.getTotalOperations(),
    };

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const costTracker = new CostTracker();

// Helper function to track Firestore reads
export function trackFirestoreRead(serviceName: string, functionName: string, count: number): void {
  costTracker.trackOperation({
    serviceName,
    functionName,
    operationType: 'read',
    count,
    timestamp: new Date(),
    metadata: { documentCount: count },
  });
}

// Helper function to track Firestore writes
export function trackFirestoreWrite(serviceName: string, functionName: string, count: number = 1): void {
  costTracker.trackOperation({
    serviceName,
    functionName,
    operationType: 'write',
    count,
    timestamp: new Date(),
    metadata: { documentCount: count },
  });
}

// Helper function to track Firestore deletes
export function trackFirestoreDelete(serviceName: string, functionName: string, count: number = 1): void {
  costTracker.trackOperation({
    serviceName,
    functionName,
    operationType: 'delete',
    count,
    timestamp: new Date(),
    metadata: { documentCount: count },
  });
}

// Helper function to track Storage uploads
export function trackStorageUpload(serviceName: string, functionName: string, bytes: number): void {
  costTracker.trackOperation({
    serviceName,
    functionName,
    operationType: 'storage',
    count: 1,
    timestamp: new Date(),
    metadata: { bytes },
  });
}

// Helper function to track Storage downloads (bandwidth)
export function trackStorageDownload(serviceName: string, functionName: string, bytes: number): void {
  costTracker.trackOperation({
    serviceName,
    functionName,
    operationType: 'storage',
    count: 1,
    timestamp: new Date(),
    metadata: { bytes },
  });
}

// Helper function to track API calls
export function trackAPICall(
  serviceName: string,
  functionName: string,
  inputTokens: number,
  outputTokens: number
): void {
  costTracker.trackOperation({
    serviceName,
    functionName,
    operationType: 'api',
    count: 1,
    timestamp: new Date(),
    metadata: {
      tokens: {
        input: inputTokens,
        output: outputTokens,
      },
    },
  });
}
