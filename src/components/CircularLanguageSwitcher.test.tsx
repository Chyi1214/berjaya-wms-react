import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CircularLanguageSwitcher } from './CircularLanguageSwitcher';

// Mock the useLanguage hook to provide controlled values for the test
const mockSetLanguage = vi.fn();
vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    currentLanguage: 'en',
    setLanguage: mockSetLanguage,
    languages: [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    ],
    t: (key: string) => key, // Mock translation function
  }),
}));

describe('CircularLanguageSwitcher', () => {
  it('renders the language flags correctly', () => {
    render(<CircularLanguageSwitcher autoRotate={false} />);

    // Check that all language flags are rendered
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    expect(screen.getByText('🇲🇾')).toBeInTheDocument();
    expect(screen.getByText('🇨🇳')).toBeInTheDocument();
  });

  it('calls setLanguage with the correct language code when a flag is clicked', () => {
    render(<CircularLanguageSwitcher autoRotate={false} />);

    // Find the button for Chinese by its aria-label
    const chineseButton = screen.getByLabelText('Switch to Chinese');
    
    // Simulate a user click
    fireEvent.click(chineseButton);

    // Expect that the setLanguage function was called with 'zh'
    expect(mockSetLanguage).toHaveBeenCalledWith('zh');
  });
});
