// ================================================================================
// KOMPONEN REUSABLE: Pagination
// ================================================================================
// 🎯 Komponen pagination yang reusable untuk menampilkan navigasi halaman
// Bisa dipakai di page mana saja yang perlu pagination

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <div className="text-[13px] text-slate-500">
        Halaman {currentPage} dari {totalPages}
      </div>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:opacity-50"
          aria-label="Halaman sebelumnya"
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-[13px] font-semibold transition-colors ${
              currentPage === page
                ? 'bg-primary-600 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            aria-label={`Halaman ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:opacity-50"
          aria-label="Halaman berikutnya"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
