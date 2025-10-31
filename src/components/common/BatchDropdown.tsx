// BatchDropdown - Enhanced dropdown with search and stock info
import { useState, useEffect, useRef } from 'react';

interface BatchOption {
  id: string;
  label: string;
  stockAmount?: number;
}

interface BatchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: BatchOption[];
  placeholder?: string;
  disabled?: boolean;
  showStockBadges?: boolean;
  includeDefault?: boolean;
  className?: string;
}

export function BatchDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select batch...',
  disabled = false,
  showStockBadges = false,
  includeDefault = true,
  className = ''
}: BatchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build full options list
  const fullOptions: BatchOption[] = [
    ...(includeDefault ? [{ id: 'DEFAULT', label: 'Default', stockAmount: undefined }] : []),
    ...options
  ];

  // Filter options based on search term
  const filteredOptions = fullOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display text for selected value
  const selectedOption = fullOptions.find(opt => opt.id === value);
  const displayText = selectedOption
    ? `${selectedOption.label}${showStockBadges && selectedOption.stockAmount !== undefined ? ` (${selectedOption.stockAmount} units)` : ''}`
    : '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          px-4 py-2
          border border-gray-300 rounded-lg
          bg-white
          text-left
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${disabled ? 'text-gray-400' : 'text-gray-900'}
          transition-all duration-150
        `}
      >
        <span className="flex-1 truncate">
          {value ? displayText : <span className="text-gray-500">{placeholder}</span>}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search batches..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-60">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No batches found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`
                      w-full px-4 py-2 text-left text-sm
                      flex items-center justify-between
                      transition-colors duration-100
                      ${isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-900'}
                      ${isHighlighted && !isSelected ? 'bg-gray-100' : ''}
                      ${!isSelected && !isHighlighted ? 'hover:bg-gray-50' : ''}
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {option.id === 'DEFAULT' ? '📁' : '📦'}
                      <span>{option.label}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Stock Badge */}
                      {showStockBadges && option.stockAmount !== undefined && (
                        <span
                          className={`
                            px-2 py-0.5 rounded-full text-xs font-medium
                            ${option.stockAmount > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                            }
                          `}
                        >
                          {option.stockAmount} units
                        </span>
                      )}

                      {/* Selected Checkmark */}
                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchDropdown;
