// Multilingual Helper - Utilities for handling multilingual text
import type { MultilingualText } from '../types/inspection';

export type LanguageCode = 'en' | 'ms' | 'zh' | 'my' | 'bn';

/**
 * Get text in the specified language from MultilingualText or string
 * Falls back to English if the requested language is not available
 */
export function getLocalizedText(
  text: string | MultilingualText | undefined,
  language: LanguageCode = 'en'
): string {
  if (!text) return '';

  // If it's a plain string, return it as is (legacy support)
  if (typeof text === 'string') {
    return text;
  }

  // If it's multilingual text, get the requested language or fall back to English
  return text[language] || text.en || '';
}

/**
 * Check if a text object is multilingual
 */
export function isMultilingualText(text: any): text is MultilingualText {
  return (
    text &&
    typeof text === 'object' &&
    'en' in text &&
    typeof text.en === 'string'
  );
}

/**
 * Convert language code to display name
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  ms: 'Bahasa Melayu',
  zh: '中文',
  my: 'မြန်မာ',
  bn: 'বাংলা'
};
