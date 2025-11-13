// Numeral Filter Utilities - Prevent input freezing from non-Western numerals
// Only accepts Western numerals (0-9), filters out everything else gracefully

/**
 * Filter out all non-Western numerals, keeping only 0-9
 * This prevents input freezing when Bengali/Myanmar/other numerals slip in
 *
 * Examples:
 *   "123" → "123" ✓
 *   "১২৩" (Bengali) → "" (filtered out)
 *   "1২3" (mixed) → "13" (Bengali filtered, Western kept)
 */
export function filterToWesternNumerals(input: string): string {
  return input.replace(/[^0-9]/g, '');
}

/**
 * Filter and parse integer, only accepting Western numerals (0-9)
 * Returns parsed number or defaultValue if empty/invalid
 */
export function parseFilteredInt(input: string, defaultValue: number = 0): number {
  const filtered = filterToWesternNumerals(input);
  if (filtered === '') return defaultValue;
  const parsed = parseInt(filtered, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Filter and parse float, only accepting Western numerals and decimal point
 * Returns parsed number or defaultValue if empty/invalid
 */
export function parseFilteredFloat(input: string, defaultValue: number = 0): number {
  // Allow 0-9 and decimal point only
  const filtered = input.replace(/[^0-9.]/g, '');
  if (filtered === '' || filtered === '.') return defaultValue;
  const parsed = parseFloat(filtered);
  return isNaN(parsed) ? defaultValue : parsed;
}
