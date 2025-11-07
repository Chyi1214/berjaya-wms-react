// QR Code Extraction Service - Universal QR code processing for SKU extraction
import { scanLookupService } from './scanLookupService';
import { itemMasterService } from './itemMaster';
import { ScanLookup, ItemMaster } from '../types';

export interface QRExtractionResult {
  success: boolean;
  extractedSKU?: string;
  lookupData?: ScanLookup[];
  itemMaster?: ItemMaster;
  attemptedLookups: string[];
}

export class QRExtractionService {
  
  /**
   * Universal QR code processing that extracts SKU from complex QR codes
   * Uses the same logic as Inbound Scanner for consistency
   * Now checks both Scanner Lookup AND Item Master (like UnifiedScannerView)
   */
  async extractSKUFromQRCode(rawCode: string, carType: string = 'TK1'): Promise<QRExtractionResult> {
    console.log('🌍 Processing universal QR code...');
    const attemptedLookups: string[] = [];
    
    // Step 1: Clean basic whitespace and newlines
    const cleanedCode = rawCode
      .trim()
      .replace(/[\r\n\t]/g, '');
    
    console.log('✨ Basic cleaned code:', JSON.stringify(cleanedCode));

    // First, always try the exact cleaned code as-is
    const exactCleanCode = cleanedCode.toUpperCase();
    console.log('🎯 Trying exact cleaned code lookup:', exactCleanCode);
    attemptedLookups.push(exactCleanCode);

    try {
      // Check both scanner lookup AND item master (like UnifiedScannerView)
      const allLookups = await scanLookupService.getAllLookupsBySKU(exactCleanCode, carType);

      let masterItem: ItemMaster | undefined;
      try {
        const foundItem = await itemMasterService.getItemBySKU(exactCleanCode);
        masterItem = foundItem || undefined;
      } catch (error) {
        console.log('⚠️ Item Master lookup failed for:', exactCleanCode);
        masterItem = undefined;
      }

      // Success if we found zones OR item master (or both)
      if (allLookups.length > 0 || masterItem) {
        console.log(`✅ SUCCESS! Found data for: ${exactCleanCode}`);
        console.log(`📍 Zones: ${allLookups.length}, Item Master: ${masterItem ? 'Yes' : 'No'}`);

        return {
          success: true,
          extractedSKU: exactCleanCode,
          lookupData: allLookups.length > 0 ? allLookups : undefined,
          itemMaster: masterItem,
          attemptedLookups
        };
      }
      console.log('❌ No exact match found for:', exactCleanCode);
    } catch (error) {
      console.log('⚠️ Exact lookup error:', error);
    }

    // Step 2: Normalize - replace all non-alphanumeric and non-dash with *
    const normalizedCode = cleanedCode.replace(/[^a-zA-Z0-9\-\.]/g, '*').toUpperCase();
    console.log('🔧 Normalized code:', normalizedCode);

    // Step 3: Split by * to get potential SKU candidates
    const allSegments = normalizedCode.split('*').filter(str => str.length >= 3);
    
    // Smart filtering: prioritize segments that look like actual SKU values, not field names
    const skuLikeSegments = allSegments.filter(segment => {
      // Skip obvious field names
      const fieldNames = ['BT', 'MO', 'ITEMCODE', 'ITEMNAME', 'SPEC', 'QTY', 'UNIT', 'UNITNAME', 'LOT', 'SN', 'MEMO', 'CLC'];
      if (fieldNames.includes(segment)) return false;
      
      // Skip very short segments that are likely noise
      if (segment.length < 4) return false;
      
      // Prioritize segments that contain numbers and letters (typical SKU pattern)
      const hasNumbers = /\d/.test(segment);
      const hasLetters = /[A-Z]/.test(segment);
      
      return hasNumbers || hasLetters;
    });
    
    // Sort by likelihood of being a SKU (segments with both numbers and letters first)
    const sortedCandidates = skuLikeSegments.sort((a, b) => {
      const aHasBoth = /\d/.test(a) && /[A-Z]/.test(a);
      const bHasBoth = /\d/.test(b) && /[A-Z]/.test(b);
      
      if (aHasBoth && !bHasBoth) return -1;
      if (!aHasBoth && bHasBoth) return 1;
      
      // If both or neither have both, prefer shorter ones (more likely to be simple SKUs)
      return a.length - b.length;
    });
    
    // Take top candidates
    const candidates = sortedCandidates.slice(0, 8);
    
    console.log('📋 All segments:', allSegments);
    console.log('📋 SKU-like candidates (filtered):', skuLikeSegments);
    console.log('📋 Sorted candidates:', sortedCandidates);
    console.log('📋 Final candidates to test:', candidates);

    // Step 4: Try lookup for each candidate until one succeeds
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      console.log(`🔍 Testing candidate ${i + 1}/${candidates.length}: ${candidate}`);
      attemptedLookups.push(candidate);

      try {
        // Check both scanner lookup AND item master (like UnifiedScannerView)
        const allLookups = await scanLookupService.getAllLookupsBySKU(candidate, carType);

        let masterItem: ItemMaster | undefined;
        try {
          const foundItem = await itemMasterService.getItemBySKU(candidate);
          masterItem = foundItem || undefined;
        } catch (error) {
          masterItem = undefined;
        }

        // Success if we found zones OR item master (or both)
        if (allLookups.length > 0 || masterItem) {
          console.log(`✅ SUCCESS! Found data for: ${candidate}`);
          console.log(`📍 Zones: ${allLookups.length}, Item Master: ${masterItem ? 'Yes' : 'No'}`);

          // Return immediately on first successful match to avoid confusion
          return {
            success: true,
            extractedSKU: candidate,
            lookupData: allLookups.length > 0 ? allLookups : undefined,
            itemMaster: masterItem,
            attemptedLookups
          };
        } else {
          console.log('❌ No lookup found for:', candidate);
        }
      } catch (error) {
        console.log('⚠️ Lookup error for', candidate, ':', error);
        continue; // Try next candidate
      }
    }

    console.log('😞 No valid SKU found in any candidates');
    console.log('📋 Total attempts made:', attemptedLookups);
    
    return {
      success: false,
      attemptedLookups
    };
  }
}

// Export singleton instance
export const qrExtractionService = new QRExtractionService();
export default qrExtractionService;