/**
 * DataTable – "Jadwal Hari Ini" table matching Figma
 * Columns: Angkatan | Waktu | Agenda | Tempat | Dosen | Jenis | Aksi
 * Row hover, soft shadow container, rounded-16
 */
import { Pencil, Trash2 } from 'lucide-react';
import Badge from './Badge';
import StatePanel from './StatePanel';

export default function DataTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  showActions = true,
}) {
  if (loading) {
    return (
      <div className="ui-table-wrap" role="status" aria-label="Memuat jadwal">
        <div className="h-11 animate-pulse bg-slate-100" />
        <div className="divide-y divide-slate-100 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-14 items-center gap-4">
              <span className="h-4 w-16 rounded bg-slate-100" />
              <span className="h-4 w-24 rounded bg-slate-100" />
              <span className="h-4 flex-1 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <StatePanel
        type="empty"
        title="Tidak ada jadwal"
        description="Belum ada jadwal untuk tanggal yang dipilih."
        compact
      />
    );
  }

  return (
    <div className="ui-table-wrap overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Angkatan</th>
            <th className="text-left">Waktu</th>
            <th className="text-left">Agenda</th>
            <th className="text-left">Tempat</th>
            <th className="text-left">Dosen</th>
            <th className="text-left">Jenis</th>
            {showActions && <th className="text-right">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id || index} className="hover:bg-slate-50">
              {/* Angkatan */}
              <td>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-[13px] font-semibold text-slate-700">
                  {row.nama_angkatan || '-'}
                </span>
              </td>

              {/* Waktu */}
              <td className="whitespace-nowrap text-[13px] font-medium text-slate-700">
                {row.waktu_display || '-'}
              </td>

              {/* Agenda */}
              <td>
                <span className="text-[13px] font-medium text-slate-900">
                  {row.nama_matkul || row.agenda || '-'}
                </span>
              </td>

              {/* Tempat */}
              <td className="text-[13px] text-slate-600">
                {row.nama_ruangan || '-'}
              </td>

              {/* Dosen */}
              <td className="text-[13px] text-slate-600">
                {row.nama_dosen || '-'}
              </td>

              {/* Jenis */}
              <td>
                <Badge variant={row.jenis_pertemuan || 'luring'}>
                  {row.jenis_pertemuan === 'daring' ||
                  row.jenis_pertemuan === 'online'
                    ? 'Daring'
                    : row.jenis_pertemuan === 'hybrid'
                      ? 'Hybrid'
                      : 'Luring'}
                </Badge>
              </td>

              {/* Aksi */}
              {showActions && (
                <td>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit?.(row)}
                      className="rounded-lg p-2 text-primary-600 transition hover:bg-primary-50"
                      title="Edit"
                      aria-label={`Edit ${row.nama_matkul || row.agenda || 'jadwal'}`}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(row)}
                      className="rounded-lg p-2 text-danger-600 transition hover:bg-danger-50"
                      title="Hapus"
                      aria-label={`Hapus ${row.nama_matkul || row.agenda || 'jadwal'}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
