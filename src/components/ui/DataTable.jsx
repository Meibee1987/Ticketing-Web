/**
 * DataTable – "Jadwal Hari Ini" table matching Figma
 * Columns: Angkatan | Waktu | Agenda | Tempat | Dosen | Jenis | Aksi
 * Row hover, soft shadow container, rounded-16
 */
import Badge from './Badge';
import { Pencil, Trash2 } from 'lucide-react';

export default function DataTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  showActions = true,
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Tidak ada jadwal hari ini.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Angkatan
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Waktu
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Agenda
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tempat
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Dosen
            </th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Jenis
            </th>
            {showActions && (
              <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Aksi
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              className="border-b border-slate-50 hover:bg-primary-50/30 transition-colors"
            >
              {/* Angkatan */}
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-[13px] font-semibold">
                  {row.nama_angkatan || '-'}
                </span>
              </td>

              {/* Waktu */}
              <td className="py-3.5 px-4 text-[13px] text-slate-700 font-medium whitespace-nowrap">
                {row.waktu_display || '-'}
              </td>

              {/* Agenda */}
              <td className="py-3.5 px-4">
                <span className="text-[13px] font-semibold text-slate-900">
                  {row.nama_matkul || row.agenda || '-'}
                </span>
              </td>

              {/* Tempat */}
              <td className="py-3.5 px-4 text-[13px] text-slate-600">
                {row.nama_ruangan || '-'}
              </td>

              {/* Dosen */}
              <td className="py-3.5 px-4 text-[13px] text-slate-600">
                {row.nama_dosen || '-'}
              </td>

              {/* Jenis */}
              <td className="py-3.5 px-4">
                <Badge variant={row.jenis_pertemuan || 'luring'}>
                  {row.jenis_pertemuan === 'daring' ||
                  row.jenis_pertemuan === 'online'
                    ? 'Online'
                    : row.jenis_pertemuan === 'hybrid'
                      ? 'Hybrid'
                      : 'Luring'}
                </Badge>
              </td>

              {/* Aksi */}
              {showActions && (
                <td className="py-3.5 px-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEdit?.(row)}
                      className="p-2 rounded-lg text-primary-500 hover:bg-primary-50 transition"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete?.(row)}
                      className="p-2 rounded-lg text-danger-500 hover:bg-danger-50 transition"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
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
