// ================================================================================
// KOMPONEN REUSABLE: SearchableSelect
// ================================================================================
// 🎯 Dropdown dengan search functionality - bisa filter options dengan mengetik
// Bisa dipakai untuk dropdown dengan banyak options (dosen, mahasiswa, etc)

import { useState, useRef, useEffect } from "react";

export default function SearchableSelect({ 
  label, 
  value, 
  onChange, 
  options = [], 
  displayKey,
  placeholder = "Pilih...",
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Get display text for an option
  const getDisplayText = (option) => {
    if (!option) return "";
    return typeof displayKey === 'function' ? displayKey(option) : option[displayKey];
  };

  // Get selected option object
  const selectedOption = options.find(opt => opt.id === value);
  const selectedText = selectedOption ? getDisplayText(selectedOption) : "";

  // Filter options based on search query
  const filteredOptions = options.filter(opt => {
    const text = getDisplayText(opt).toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery("");
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
      <div
        onClick={handleInputClick}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white cursor-pointer hover:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 flex items-center justify-between"
      >
        <span className={selectedText ? "text-slate-900" : "text-slate-400"}>
          {selectedText || placeholder}
        </span>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <svg 
                className="absolute left-2 top-2.5 w-4 h-4 text-slate-400"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari ${label.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Tidak ada hasil
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                    option.id === value ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-700"
                  }`}
                >
                  {getDisplayText(option)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
