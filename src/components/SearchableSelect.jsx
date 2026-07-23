// ================================================================================
// KOMPONEN REUSABLE: SearchableSelect
// ================================================================================
// 🎯 Dropdown dengan search functionality - bisa filter options dengan mengetik
// Bisa dipakai untuk dropdown dengan banyak options (dosen, mahasiswa, etc)

import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  displayKey,
  placeholder = 'Pilih...',
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Get display text for an option
  const getDisplayText = (option) => {
    if (!option) return '';
    return typeof displayKey === 'function'
      ? displayKey(option)
      : option[displayKey];
  };

  // Get selected option object
  const selectedOption = options.find((opt) => opt.id === value);
  const selectedText = selectedOption ? getDisplayText(selectedOption) : '';

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    const text = getDisplayText(opt).toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleInputClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input Display */}
      <button
        type="button"
        onClick={handleInputClick}
        className="ui-field flex items-center justify-between text-left hover:border-primary-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className={selectedText ? 'text-slate-900' : 'text-slate-400'}>
          {selectedText || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-2 top-2.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari ${label.toLowerCase()}...`}
                className="ui-field min-h-9 w-full py-1.5 pl-8"
                autoFocus
                aria-label={`Cari ${label}`}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Tidak ada hasil
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-primary-50 ${
                    option.id === value
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-slate-700'
                  }`}
                  role="option"
                  aria-selected={option.id === value}
                >
                  {getDisplayText(option)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
