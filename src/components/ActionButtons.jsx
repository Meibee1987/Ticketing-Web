// ================================================================================
// KOMPONEN REUSABLE: ActionButtons
// ================================================================================
// 🎯 Komponen ini menggabungkan tombol Edit & Delete agar tidak duplikat di setiap tabel
// Bisa dipakai di table mana saja yang perlu tombol Edit & Delete

export default function ActionButtons({ onEdit, onDelete, row }) {
  const handleDelete = () => {
    // Jika row punya property 'jenis', pass juga ke onDelete (untuk JadwalPageAdmin)
    // Jika tidak ada, hanya pass id (untuk MasterData dan page lain)
    if (row.jenis) {
      onDelete(row.id, row.jenis);
    } else {
      onDelete(row.id);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Edit Button */}
      <button
        onClick={() => onEdit(row)}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title="Edit"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Hapus"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
