// ================================================================================
// KOMPONEN REUSABLE: Pagination
// ================================================================================
// 🎯 Komponen pagination yang reusable untuk menampilkan navigasi halaman
// Bisa dipakai di page mana saja yang perlu pagination

import { useEffect, useState } from 'react';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemSummary,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  isLoading = false,
}) {
  const [jumpPage, setJumpPage] = useState(String(currentPage));

  useEffect(() => {
    setJumpPage(String(currentPage));
  }, [currentPage]);

  if (totalPages <= 1 && !itemSummary) return null;

  const maxVisiblePages = 10;
  const startPage =
    Math.floor((currentPage - 1) / maxVisiblePages) * maxVisiblePages + 1;
  const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index
  );

  const handleJumpPage = (event) => {
    event.preventDefault();

    if (isLoading) return;

    const parsedPage = Number(jumpPage);
    if (!Number.isFinite(parsedPage) || jumpPage.trim() === '') {
      setJumpPage(String(currentPage));
      return;
    }

    const targetPage = Math.min(
      Math.max(Math.trunc(parsedPage), 1),
      totalPages
    );

    onPageChange(targetPage);
    setJumpPage(String(targetPage));
  };

  return (
    <nav
      className="grid w-full grid-cols-1 items-center justify-items-center gap-3 border-t border-slate-200 pt-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
      aria-label="Pagination"
      aria-busy={isLoading}
    >
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600 lg:justify-self-start lg:justify-start">
        {itemSummary && <div>{itemSummary}</div>}
        {pageSize && onPageSizeChange && (
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-slate-500">
            Per halaman:
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={isLoading}
              className="ui-field min-h-9 w-auto py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Jumlah data per halaman"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <form
          className="flex flex-wrap items-center justify-center gap-2 lg:justify-self-center"
          onSubmit={handleJumpPage}
          noValidate
          aria-label="Pindah ke halaman"
        >
          <label className="flex items-center gap-2 text-[13px] text-slate-500">
            Ke halaman:
            <input
              type="number"
              min={1}
              max={totalPages}
              step={1}
              value={jumpPage}
              onChange={(event) => setJumpPage(event.target.value)}
              disabled={isLoading}
              className="ui-field min-h-9 w-16 px-2 py-1.5 text-center text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Go
          </button>
        </form>
      )}

      {totalPages > 1 && (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-3 lg:justify-self-end lg:justify-end">
          <div className="text-[13px] whitespace-nowrap text-slate-500">
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1 lg:justify-end">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={isLoading || currentPage === 1}
              className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:opacity-50"
              aria-label="Halaman pertama"
            >
              First
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={isLoading || currentPage === 1}
              className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:opacity-50"
              aria-label="Halaman sebelumnya"
            >
              Prev
            </button>
            {visiblePages.map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => onPageChange(page)}
                disabled={isLoading}
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
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={isLoading || currentPage === totalPages}
              className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:opacity-50"
              aria-label="Halaman berikutnya"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={isLoading || currentPage === totalPages}
              className="ui-button ui-button-secondary min-h-9 px-3 text-[13px] disabled:opacity-50"
              aria-label="Halaman terakhir"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
