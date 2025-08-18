// Language Switcher Component
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LanguageSwitcher({ 
  className = '', 
  showLabels = false,
  size = 'md' 
}: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find(lang => lang.code === currentLanguage)!;

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      flag: 'text-sm',
      dropdown: 'text-xs'
    },
    md: {
      button: 'px-3 py-2 text-sm',
      flag: 'text-base',
      dropdown: 'text-sm'
    },
    lg: {
      button: 'px-4 py-3 text-base',
      flag: 'text-lg',
      dropdown: 'text-base'
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    setLanguage(languageCode as any);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size].button}
          flex items-center space-x-2 bg-white border border-gray-300 rounded-lg 
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-blue-500 transition-colors duration-200
        `}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <span className={sizeClasses[size].flag}>{currentLang.flag}</span>
        {showLabels && (
          <span className="font-medium text-gray-700">
            {currentLang.nativeName}
          </span>
        )}
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language.code)}
                className={`
                  w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-150
                  ${sizeClasses[size].dropdown} flex items-center space-x-3
                  ${currentLanguage === language.code 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700'
                  }
                `}
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.nativeName}</div>
                  {language.name !== language.nativeName && (
                    <div className="text-xs text-gray-500">{language.name}</div>
                  )}
                </div>
                {currentLanguage === language.code && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;