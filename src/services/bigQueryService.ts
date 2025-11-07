// BigQuery Service - Fetches real cost data from Google Cloud Platform
//
// IMPORTANT: BigQuery cannot be accessed directly from browser/client-side code.
// You need to set up a backend Cloud Function or API endpoint to query BigQuery.
//
// Setup Instructions:
// 1. Enable BigQuery Billing Export in GCP Console
// 2. Create a Cloud Function or backend endpoint that queries BigQuery
// 3. Configure the VITE_BIGQUERY_API_URL environment variable
//
// See setup guide in: docs/bigquery-setup.md

import { createModuleLogger } from './logger';

const logger = createModuleLogger('BigQueryService');

export interface BigQueryCostData {
  date: string;
  service: string;
  sku: string;
  cost: number;
}

export interface DailyCostSummary {
  date: string;
  totalCost: number;
  firestoreCost: number;
  storageCost: number;
  geminiCost: number;
  otherCosts: number;
  breakdown: {
    service: string;
    cost: number;
  }[];
}

class BigQueryService {
  private apiEndpoint: string;
  private isConfigured: boolean;

  constructor() {
    // Get BigQuery API endpoint from environment variables
    // This should point to your Cloud Function or backend API
    this.apiEndpoint = import.meta.env.VITE_BIGQUERY_API_URL || '';
    this.isConfigured = !!this.apiEndpoint;

    if (!this.isConfigured) {
      logger.warn('BigQuery API endpoint not configured. Real cost data will not be available.');
      logger.info('To enable: Set VITE_BIGQUERY_API_URL in your .env file');
    } else {
      logger.info('BigQuery service initialized', { endpoint: this.apiEndpoint });
    }
  }

  /**
   * Check if BigQuery service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Fetch real costs from BigQuery for a specific date range
   */
  async getCosts(startDate: Date, endDate: Date): Promise<BigQueryCostData[]> {
    if (!this.isConfigured) {
      logger.error('Cannot fetch costs: BigQuery API endpoint not configured');
      return [];
    }

    try {
      logger.info('Fetching costs from BigQuery', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`${this.apiEndpoint}/costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`BigQuery API error: ${response.status}`);
      }

      const data: BigQueryCostData[] = await response.json();
      logger.info('Fetched costs successfully', { rowCount: data.length });

      return data;
    } catch (error) {
      logger.error('Failed to fetch costs from BigQuery', error);
      return [];
    }
  }

  /**
   * Get today's cost summary
   */
  async getTodayCosts(): Promise<DailyCostSummary | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const costs = await this.getCosts(today, tomorrow);

    if (costs.length === 0) {
      return null;
    }

    return this.summarizeCosts(costs, today.toISOString().split('T')[0]);
  }

  /**
   * Get cost summary for the last N days
   */
  async getLastNDaysCosts(days: number): Promise<DailyCostSummary[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costs = await this.getCosts(startDate, endDate);

    // Group by date
    const costsByDate = new Map<string, BigQueryCostData[]>();
    for (const cost of costs) {
      if (!costsByDate.has(cost.date)) {
        costsByDate.set(cost.date, []);
      }
      costsByDate.get(cost.date)!.push(cost);
    }

    // Summarize each date
    const summaries: DailyCostSummary[] = [];
    for (const [date, dateCosts] of costsByDate.entries()) {
      summaries.push(this.summarizeCosts(dateCosts, date));
    }

    return summaries.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Summarize costs by service
   */
  private summarizeCosts(costs: BigQueryCostData[], date: string): DailyCostSummary {
    let totalCost = 0;
    let firestoreCost = 0;
    let storageCost = 0;
    let geminiCost = 0;
    let otherCosts = 0;

    const serviceBreakdown = new Map<string, number>();

    for (const cost of costs) {
      totalCost += cost.cost;

      // Categorize by service
      if (cost.service.toLowerCase().includes('firestore') ||
          cost.service.toLowerCase().includes('cloud firestore')) {
        firestoreCost += cost.cost;
      } else if (cost.service.toLowerCase().includes('storage') ||
                 cost.service.toLowerCase().includes('cloud storage')) {
        storageCost += cost.cost;
      } else if (cost.service.toLowerCase().includes('vertex ai') ||
                 cost.service.toLowerCase().includes('gemini') ||
                 cost.service.toLowerCase().includes('generative language')) {
        geminiCost += cost.cost;
      } else {
        otherCosts += cost.cost;
      }

      // Track by service
      const currentCost = serviceBreakdown.get(cost.service) || 0;
      serviceBreakdown.set(cost.service, currentCost + cost.cost);
    }

    return {
      date,
      totalCost,
      firestoreCost,
      storageCost,
      geminiCost,
      otherCosts,
      breakdown: Array.from(serviceBreakdown.entries())
        .map(([service, cost]) => ({ service, cost }))
        .sort((a, b) => b.cost - a.cost),
    };
  }
}

// Export singleton instance
export const bigQueryService = new BigQueryService();
