/**
 * Pagination Component - Reusable pagination dengan fitur lengkap
 * Features:
 * - Page navigation dengan ellipsis
 * - Page size selector
 * - Total items display
 * - Responsive design
 */

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showTotalItems = true,
  siblingCount = 1,
  boundaryCount = 1,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Generate page numbers dengan ellipsis
  const generatePageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3 + boundaryCount * 2;

    if (totalPages <= totalNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(
      currentPage - siblingCount,
      boundaryCount
    );
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPages - boundaryCount
    );

    const shouldShowLeftDots = leftSiblingIndex > boundaryCount + 1;
    const shouldShowRightDots =
      rightSiblingIndex < totalPages - boundaryCount - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = siblingCount * 2 + boundaryCount + 2;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = siblingCount * 2 + boundaryCount + 1;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, '...', ...middleRange, '...', totalPages];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  const pageNumbers = generatePageNumbers();
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
    // Reset ke halaman 1 saat ganti page size
    if (onPageChange) {
      onPageChange(1);
    }
  };

  return (
    <nav
      className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      {showTotalItems && totalItems > 0 && (
        <div className="text-sm text-slate-600">
          Menampilkan{' '}
          <span className="font-semibold">
            {startItem}-{endItem}
          </span>{' '}
          dari <span className="font-semibold">{totalItems}</span> data
        </div>
      )}

      <div className="flex max-w-full flex-wrap items-center gap-3">
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-slate-600">
              Per halaman:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="ui-field min-h-9 w-auto py-1.5"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        )}

        <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="ui-button ui-button-secondary min-h-9 px-3 disabled:opacity-50"
            aria-label="Halaman sebelumnya"
          >
            &lt;
          </button>

          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-1.5 text-sm text-slate-500"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                type="button"
                key={pageNumber}
                onClick={() => onPageChange && onPageChange(pageNumber)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === pageNumber
                    ? 'border border-primary-600 bg-primary-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
                aria-label={`Halaman ${pageNumber}`}
                aria-current={currentPage === pageNumber ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ui-button ui-button-secondary min-h-9 px-3 disabled:opacity-50"
            aria-label="Halaman berikutnya"
          >
            &gt;
          </button>
        </div>
      </div>
    </nav>
  );
}
