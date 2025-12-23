// ================================================================================
// KOMPONEN REUSABLE: Pagination
// ================================================================================
// 🎯 Komponen pagination yang reusable untuk menampilkan navigasi halaman
// Bisa dipakai di page mana saja yang perlu pagination

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-sm text-slate-500">
        Halaman {currentPage} dari {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              currentPage === page
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
