import { Search, X } from 'lucide-react';

// ================================================================================
// KOMPONEN REUSABLE: SearchBar
// ================================================================================
// 🎯 Komponen ini menggabungkan input search, tombol Cari, dan tombol Reset
// Search hanya trigger saat: 1) Tekan Enter, atau 2) Klik tombol Cari
// Bisa dipakai di page mana saja (JadwalPageAdmin, MasterData, UsersPage, dll)

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Cari...',
  showClear = false,
}) {
  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      onSearch();
    }
  };

  return (
    <>
      <div className="relative min-w-[220px] flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="ui-field w-full pl-10 pr-10"
          aria-label={placeholder}
        />
        {value && showClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Bersihkan pencarian"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="ui-button ui-button-primary"
      >
        Cari
      </button>
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="ui-button ui-button-secondary hidden sm:inline-flex"
        >
          Reset
        </button>
      )}
    </>
  );
}
