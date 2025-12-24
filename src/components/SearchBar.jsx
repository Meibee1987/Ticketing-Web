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
      <div className="relative flex-1 min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {/* Hint text */}
        {value && !showClear && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            Tekan Enter
          </span>
        )}
      </div>
      <button
        onClick={onSearch}
        className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
      >
        Cari
      </button>
      {showClear && (
        <button
          onClick={onClear}
          className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          Reset
        </button>
      )}
    </>
  );
}
