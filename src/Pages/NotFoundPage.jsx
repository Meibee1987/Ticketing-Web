import { Link } from 'react-router-dom';
import { ArrowLeft, Home, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <SearchX size={38} aria-hidden="true" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Kembali
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Home size={17} aria-hidden="true" />
            Ke Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
