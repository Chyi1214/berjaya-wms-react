// Combined Search Service - Search across Items and BOMs for autocomplete
import { ItemMaster, BOM } from '../types';
import { itemMasterService } from './itemMaster';
import { bomService } from './bom';

export interface SearchResult {
  type: 'item' | 'bom';
  code: string;
  name: string;
  description?: string;
  componentCount?: number; // For BOMs
  category?: string; // For Items
}

export interface SearchOptions {
  limit?: number;
  includeItems?: boolean;
  includeBOMs?: boolean;
}

class CombinedSearchService {
  private itemsCache: ItemMaster[] = [];
  private bomsCache: BOM[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache management for better performance
  private async ensureCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_DURATION) {
      try {
        const [items, boms] = await Promise.all([
          itemMasterService.getAllItems(),
          bomService.getAllBOMs()
        ]);
        this.itemsCache = items;
        this.bomsCache = boms;
        this.lastCacheUpdate = now;
      } catch (error) {
        console.error('Failed to update search cache:', error);
        // Continue with existing cache if available
      }
    }
  }

  // Simple fuzzy matching for typos and partial matches
  private fuzzyMatch(searchTerm: string, text: string): boolean {
    const search = searchTerm.toLowerCase();
    const target = text.toLowerCase();
    
    // Exact match or starts with
    if (target.includes(search)) {
      return true;
    }
    
    // Simple character-by-character fuzzy matching
    let searchIndex = 0;
    for (let i = 0; i < target.length && searchIndex < search.length; i++) {
      if (target[i] === search[searchIndex]) {
        searchIndex++;
      }
    }
    
    return searchIndex === search.length;
  }

  // Calculate relevance score for sorting results
  private getRelevanceScore(searchTerm: string, text: string): number {
    const search = searchTerm.toLowerCase();
    const target = text.toLowerCase();
    
    if (target === search) return 100; // Exact match
    if (target.startsWith(search)) return 80; // Starts with
    if (target.includes(search)) return 60; // Contains
    
    // Fuzzy match score based on character density
    let matches = 0;
    let searchIndex = 0;
    
    for (let i = 0; i < target.length && searchIndex < search.length; i++) {
      if (target[i] === search[searchIndex]) {
        matches++;
        searchIndex++;
      }
    }
    
    return Math.floor((matches / search.length) * 40); // Max 40 for fuzzy
  }

  // Search across both Items and BOMs
  async search(searchTerm: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      limit = 20,
      includeItems = true,
      includeBOMs = true
    } = options;

    if (!searchTerm.trim()) {
      return [];
    }

    await this.ensureCache();

    const results: Array<SearchResult & { score: number }> = [];

    // Search Items
    if (includeItems) {
      this.itemsCache.forEach(item => {
        const codeMatch = this.fuzzyMatch(searchTerm, item.sku);
        const nameMatch = this.fuzzyMatch(searchTerm, item.name);
        const categoryMatch = item.category ? this.fuzzyMatch(searchTerm, item.category) : false;

        if (codeMatch || nameMatch || categoryMatch) {
          const codeScore = this.getRelevanceScore(searchTerm, item.sku);
          const nameScore = this.getRelevanceScore(searchTerm, item.name);
          const categoryScore = item.category ? this.getRelevanceScore(searchTerm, item.category) : 0;
          
          const maxScore = Math.max(codeScore, nameScore, categoryScore);

          results.push({
            type: 'item',
            code: item.sku,
            name: item.name,
            category: item.category,
            description: item.category ? `Category: ${item.category}` : undefined,
            score: maxScore
          });
        }
      });
    }

    // Search BOMs
    if (includeBOMs) {
      this.bomsCache.forEach(bom => {
        const codeMatch = this.fuzzyMatch(searchTerm, bom.bomCode);
        const nameMatch = this.fuzzyMatch(searchTerm, bom.name);
        const descriptionMatch = bom.description ? this.fuzzyMatch(searchTerm, bom.description) : false;

        if (codeMatch || nameMatch || descriptionMatch) {
          const codeScore = this.getRelevanceScore(searchTerm, bom.bomCode);
          const nameScore = this.getRelevanceScore(searchTerm, bom.name);
          const descriptionScore = bom.description ? this.getRelevanceScore(searchTerm, bom.description) : 0;
          
          const maxScore = Math.max(codeScore, nameScore, descriptionScore);

          results.push({
            type: 'bom',
            code: bom.bomCode,
            name: bom.name,
            description: bom.description,
            componentCount: bom.components.length,
            score: maxScore
          });
        }
      });
    }

    // Sort by relevance score (highest first) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...result }) => result);
  }

  // Get specific item or BOM by code
  async getByCode(code: string): Promise<{ type: 'item' | 'bom'; data: ItemMaster | BOM } | null> {
    await this.ensureCache();

    // Check items first
    const item = this.itemsCache.find(i => i.sku === code);
    if (item) {
      return { type: 'item', data: item };
    }

    // Check BOMs
    const bom = this.bomsCache.find(b => b.bomCode === code);
    if (bom) {
      return { type: 'bom', data: bom };
    }

    return null;
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.itemsCache = [];
    this.bomsCache = [];
    this.lastCacheUpdate = 0;
  }

  // Get quick stats for debugging
  getCacheStats(): { items: number; boms: number; lastUpdate: Date | null } {
    return {
      items: this.itemsCache.length,
      boms: this.bomsCache.length,
      lastUpdate: this.lastCacheUpdate ? new Date(this.lastCacheUpdate) : null
    };
  }
}

export const combinedSearchService = new CombinedSearchService();