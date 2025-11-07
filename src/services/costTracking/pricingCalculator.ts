// Pricing Calculator - Converts operation counts to estimated costs
// Based on current Firebase and Gemini API pricing (2025)

// Firestore Pricing (per 100,000 operations)
const FIRESTORE_PRICING = {
  READ_PER_100K: 0.06, // $0.06 per 100,000 reads (some regions $0.03)
  WRITE_PER_100K: 0.18, // $0.18 per 100,000 writes
  DELETE_PER_100K: 0.02, // $0.02 per 100,000 deletes
  STORAGE_PER_GB_MONTH: 0.18, // $0.18 per GB per month
};

// Firestore Free Tier (daily limits)
const FIRESTORE_FREE_TIER_DAILY = {
  READS: 50000,
  WRITES: 20000,
  DELETES: 20000,
  STORAGE_GB: 1,
};

// Storage Pricing
const STORAGE_PRICING = {
  STORAGE_PER_GB_MONTH: 0.026, // $0.026 per GB per month
  BANDWIDTH_PER_GB: 0.12, // $0.12 per GB (approximate, varies by region)
  FREE_STORAGE_GB: 5,
  FREE_BANDWIDTH_GB_MONTH: 10,
};

const STORAGE_FREE_TIER_GB_MONTH = STORAGE_PRICING.FREE_BANDWIDTH_GB_MONTH;

// Gemini API Pricing (per 1M tokens)
const GEMINI_PRICING = {
  INPUT_PER_1M: 0.30, // $0.30 per 1M input tokens (text/image/video)
  OUTPUT_PER_1M: 2.50, // $2.50 per 1M output tokens
  FREE_TIER_REQUESTS_PER_DAY: 500,
};

export interface CostEstimate {
  firestoreCost: {
    readCost: number;
    writeCost: number;
    deleteCost: number;
    total: number;
  };
  storageCost: {
    bandwidthCost: number;
    total: number;
  };
  geminiCost: {
    inputCost: number;
    outputCost: number;
    total: number;
  };
  totalEstimatedCost: number;
  breakdown: {
    firestore: number;
    storage: number;
    gemini: number;
  };
}

export interface ServiceCostEstimate {
  serviceName: string;
  firestoreCost: number;
  storageCost: number;
  geminiCost: number;
  totalCost: number;
  percentageOfTotal: number;
  operations: {
    reads: number;
    writes: number;
    deletes: number;
    storageBytes: number;
    apiCalls: number;
    apiTokensInput: number;
    apiTokensOutput: number;
  };
}

class PricingCalculator {
  /**
   * Calculate estimated cost for Firestore operations
   * Accounts for free tier limits
   */
  calculateFirestoreCost(reads: number, writes: number, deletes: number): {
    readCost: number;
    writeCost: number;
    deleteCost: number;
    total: number;
  } {
    // Subtract free tier (daily limits)
    const billableReads = Math.max(0, reads - FIRESTORE_FREE_TIER_DAILY.READS);
    const billableWrites = Math.max(0, writes - FIRESTORE_FREE_TIER_DAILY.WRITES);
    const billableDeletes = Math.max(0, deletes - FIRESTORE_FREE_TIER_DAILY.DELETES);

    // Calculate costs
    const readCost = (billableReads / 100000) * FIRESTORE_PRICING.READ_PER_100K;
    const writeCost = (billableWrites / 100000) * FIRESTORE_PRICING.WRITE_PER_100K;
    const deleteCost = (billableDeletes / 100000) * FIRESTORE_PRICING.DELETE_PER_100K;

    return {
      readCost,
      writeCost,
      deleteCost,
      total: readCost + writeCost + deleteCost,
    };
  }

  /**
   * Calculate estimated cost for Storage operations
   * Focuses on bandwidth (upload is free, storage calculated monthly)
   */
  calculateStorageCost(bytes: number): {
    bandwidthCost: number;
    total: number;
  } {
    const gigabytes = bytes / (1024 * 1024 * 1024);

    // Subtract free tier
    const billableGB = Math.max(0, gigabytes - STORAGE_FREE_TIER_GB_MONTH);

    const bandwidthCost = billableGB * STORAGE_PRICING.BANDWIDTH_PER_GB;

    return {
      bandwidthCost,
      total: bandwidthCost,
    };
  }

  /**
   * Calculate estimated cost for Gemini API calls
   * Based on token usage
   */
  calculateGeminiCost(inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    total: number;
  } {
    // If under free tier requests, cost is $0
    // Note: Free tier is 500 requests per day, but we calculate conservatively
    // assuming paid tier since we want to show potential costs

    const inputCost = (inputTokens / 1000000) * GEMINI_PRICING.INPUT_PER_1M;
    const outputCost = (outputTokens / 1000000) * GEMINI_PRICING.OUTPUT_PER_1M;

    return {
      inputCost,
      outputCost,
      total: inputCost + outputCost,
    };
  }

  /**
   * Calculate total estimated cost for all operations
   */
  calculateTotalCost(operations: {
    reads: number;
    writes: number;
    deletes: number;
    storageBytes: number;
    apiTokensInput: number;
    apiTokensOutput: number;
    apiCalls: number;
  }): CostEstimate {
    const firestoreCost = this.calculateFirestoreCost(
      operations.reads,
      operations.writes,
      operations.deletes
    );

    const storageCost = this.calculateStorageCost(operations.storageBytes);

    const geminiCost = this.calculateGeminiCost(
      operations.apiTokensInput,
      operations.apiTokensOutput
    );

    const totalEstimatedCost = firestoreCost.total + storageCost.total + geminiCost.total;

    return {
      firestoreCost,
      storageCost,
      geminiCost,
      totalEstimatedCost,
      breakdown: {
        firestore: firestoreCost.total,
        storage: storageCost.total,
        gemini: geminiCost.total,
      },
    };
  }

  /**
   * Calculate cost for a specific service
   */
  calculateServiceCost(
    serviceName: string,
    operations: {
      reads: number;
      writes: number;
      deletes: number;
      storageBytes: number;
      apiTokensInput: number;
      apiTokensOutput: number;
      apiCalls: number;
    }
  ): Omit<ServiceCostEstimate, 'percentageOfTotal'> {
    const firestoreCost = this.calculateFirestoreCost(
      operations.reads,
      operations.writes,
      operations.deletes
    ).total;

    const storageCost = this.calculateStorageCost(operations.storageBytes).total;

    const geminiCost = this.calculateGeminiCost(
      operations.apiTokensInput,
      operations.apiTokensOutput
    ).total;

    return {
      serviceName,
      firestoreCost,
      storageCost,
      geminiCost,
      totalCost: firestoreCost + storageCost + geminiCost,
      operations,
    };
  }

  /**
   * Get pricing information for display
   */
  getPricingInfo(): {
    firestore: typeof FIRESTORE_PRICING;
    storage: typeof STORAGE_PRICING;
    gemini: typeof GEMINI_PRICING;
    freeTier: {
      firestore: typeof FIRESTORE_FREE_TIER_DAILY;
      storage: typeof STORAGE_FREE_TIER_GB_MONTH;
      gemini: typeof GEMINI_PRICING.FREE_TIER_REQUESTS_PER_DAY;
    };
  } {
    return {
      firestore: FIRESTORE_PRICING,
      storage: STORAGE_PRICING,
      gemini: GEMINI_PRICING,
      freeTier: {
        firestore: FIRESTORE_FREE_TIER_DAILY,
        storage: STORAGE_FREE_TIER_GB_MONTH,
        gemini: GEMINI_PRICING.FREE_TIER_REQUESTS_PER_DAY,
      },
    };
  }
}

// Export singleton instance
export const pricingCalculator = new PricingCalculator();

// Export pricing constants for reference
export { FIRESTORE_PRICING, STORAGE_PRICING, GEMINI_PRICING, FIRESTORE_FREE_TIER_DAILY };
