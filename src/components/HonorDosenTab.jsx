import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  buildHonorDosenRows,
  getHonorPeriodLabel,
  groupHonorRows,
} from '../utils/honorDosen';

const pad = (value) => String(value).padStart(2, '0');

const defaultMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);

const formatTime = (date) =>
  Number.isNaN(date?.getTime())
    ? '-'
    : `${pad(date.getHours())}.${pad(date.getMinutes())}`;

const titleCase = (value) =>
  String(value || '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export default function HonorDosenTab({ data, loading, error }) {
  const now = new Date();
  const [monthValue, setMonthValue] = useState(defaultMonth);
  const [period, setPeriod] = useState(
    now.getDate() <= 15 ? 'first' : 'second'
  );
  const [strataFilter, setStrataFilter] = useState('S1');
  const [downloading, setDownloading] = useState(false);

  const rows = useMemo(
    () => buildHonorDosenRows(data, { monthValue, period, strataFilter }),
    [data, monthValue, period, strataFilter]
  );
  const groups = useMemo(() => groupHonorRows(rows), [rows]);
  const grandTotal = useMemo(
    () => groups.reduce((total, group) => total + group.total, 0),
    [groups]
  );
  const periodLabel = getHonorPeriodLabel(monthValue, period);

  const downloadExcel = async () => {
    if (rows.length === 0) return;
    setDownloading(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const output = [
        ['Tanggal', 'Jam', 'Dosen', 'Mata Kuliah', 'Akt', 'Kegiatan', 'Ket'],
      ];
      const merges = [];
      const groupRanges = [];

      groups.forEach((group, groupIndex) => {
        const groupStartRow = output.length;
        group.rows.forEach((row) => {
          output.push([
            row.mulai,
            `${formatTime(row.mulai)} - ${formatTime(row.akhir)}`,
            row.dosen,
            row.mataKuliah,
            row.angkatan,
            titleCase(row.kegiatan),
            row.ket,
          ]);
        });
        const totalRowIndex = output.length;
        output.push(['TOTAL', '', '', '', '', '', group.total]);
        groupRanges.push({
          startRow: groupStartRow,
          endRow: totalRowIndex - 1,
          totalRow: totalRowIndex,
          groupIndex,
        });
        merges.push({
          s: { r: totalRowIndex, c: 0 },
          e: { r: totalRowIndex, c: 5 },
        });
      });

      const worksheet = XLSX.utils.aoa_to_sheet(output, { cellDates: true });
      worksheet['!merges'] = merges;
      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 18 },
        { wch: 38 },
        { wch: 44 },
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
      ];
      worksheet['!autofilter'] = { ref: `A1:G${output.length}` };
      worksheet['!rows'] = output.map((_, index) => ({
        hpt: index === 0 ? 26 : 22,
      }));

      const border = {
        top: { style: 'thin', color: { rgb: '808080' } },
        bottom: { style: 'thin', color: { rgb: '808080' } },
        left: { style: 'thin', color: { rgb: '808080' } },
        right: { style: 'thin', color: { rgb: '808080' } },
      };
      const getCell = (row, column) =>
        worksheet[XLSX.utils.encode_cell({ r: row, c: column })];

      for (let column = 0; column < 7; column += 1) {
        getCell(0, column).s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
          fill: { patternType: 'solid', fgColor: { rgb: '1F4E78' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border,
        };
      }

      groupRanges.forEach(({ startRow, endRow, totalRow, groupIndex }) => {
        const dataFill = groupIndex % 2 === 0 ? 'FFFFFF' : 'F2F7FB';
        for (let row = startRow; row <= endRow; row += 1) {
          for (let column = 0; column < 7; column += 1) {
            const cell = getCell(row, column);
            cell.s = {
              font: { color: { rgb: '1F2937' }, sz: 11 },
              fill: { patternType: 'solid', fgColor: { rgb: dataFill } },
              alignment: {
                horizontal: [0, 1, 4, 5, 6].includes(column)
                  ? 'center'
                  : 'left',
                vertical: 'center',
                wrapText: true,
              },
              border,
              ...(column === 0 ? { numFmt: 'd mmm yyyy' } : {}),
            };
            if (column === 6) cell.s.font.bold = true;
          }
        }

        for (let column = 0; column < 7; column += 1) {
          const cell = getCell(totalRow, column);
          cell.s = {
            font: { bold: true, color: { rgb: '17320B' }, sz: 11 },
            fill: { patternType: 'solid', fgColor: { rgb: 'A9D18E' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border,
          };
        }
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Honor Dosen');
      const safePeriod = period === 'first' ? '01-15' : '16-akhir';
      XLSX.writeFile(
        workbook,
        `Honor Dosen Mengajar ${strataFilter} ${safePeriod} ${monthValue}.xlsx`,
        { cellStyles: true, compression: true }
      );
    } catch (downloadError) {
      console.error('Gagal membuat laporan honor dosen:', downloadError);
      window.alert(`Gagal download laporan: ${downloadError.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Memuat data jadwal...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            Bulan laporan
          </span>
          <input
            type="month"
            value={monthValue}
            onChange={(event) => setMonthValue(event.target.value)}
            className="ui-input min-w-48"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            Periode
          </span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="ui-input min-w-48"
          >
            <option value="first">Tanggal 1–15</option>
            <option value="second">Tanggal 16–akhir bulan</option>
          </select>
        </label>
        <fieldset>
          <legend className="mb-1 block text-xs font-semibold text-slate-600">
            Strata
          </legend>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            {['S1', 'S2', 'S3'].map((strata) => (
              <button
                key={strata}
                type="button"
                onClick={() => setStrataFilter(strata)}
                className={`min-w-16 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  strataFilter === strata
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                aria-pressed={strataFilter === strata}
              >
                {strata}
              </button>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={downloadExcel}
          disabled={rows.length === 0 || downloading}
          className="ui-button ui-button-primary lg:ml-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} aria-hidden="true" />
          {downloading ? 'Menyiapkan...' : 'Download Excel'}
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-blue-900">
            Honor dosen {strataFilter} periode {periodLabel}
          </div>
          <div className="text-blue-700">
            {groups.length} dosen · {rows.length} kegiatan · total {grandTotal}{' '}
            honor
          </div>
        </div>
        <div className="text-xs text-blue-700">
          Ket: durasi sampai 150 menit = 2, lebih dari 150 menit = 4.
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileSpreadsheet
            size={42}
            className="mb-3 text-slate-400"
            aria-hidden="true"
          />
          <div className="font-semibold text-slate-800">
            Belum ada data honor pada periode ini
          </div>
          <div className="mt-1 max-w-lg text-sm text-slate-500">
            Pastikan jadwal perkuliahan pada periode tersebut memiliki dosen dan
            angkatan dengan strata yang sesuai.
          </div>
        </div>
      ) : (
        <div className="ui-table-wrap overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr>
                {[
                  'Tanggal',
                  'Jam',
                  'Dosen',
                  'Mata Kuliah',
                  'Akt',
                  'Kegiatan',
                  'Ket',
                ].map((header) => (
                  <th
                    key={header}
                    className="border border-slate-300 px-3 py-3 text-left font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <React.Fragment key={group.dosen}>
                  {group.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-blue-50">
                      <td className="whitespace-nowrap border border-slate-200 px-3 py-2.5">
                        {formatDate(row.mulai)}
                      </td>
                      <td className="whitespace-nowrap border border-slate-200 px-3 py-2.5">
                        {formatTime(row.mulai)} - {formatTime(row.akhir)}
                      </td>
                      <td className="border border-slate-200 px-3 py-2.5 font-medium text-slate-900">
                        {row.dosen}
                      </td>
                      <td className="border border-slate-200 px-3 py-2.5">
                        {row.mataKuliah}
                      </td>
                      <td className="border border-slate-200 px-3 py-2.5">
                        {row.angkatan}
                      </td>
                      <td className="border border-slate-200 px-3 py-2.5">
                        {titleCase(row.kegiatan)}
                      </td>
                      <td className="border border-slate-200 px-3 py-2.5 text-center font-semibold">
                        {row.ket}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-semibold text-slate-900">
                    <td
                      colSpan={6}
                      className="border border-slate-300 px-3 py-2 text-right"
                    >
                      TOTAL {group.dosen}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-center">
                      {group.total}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
