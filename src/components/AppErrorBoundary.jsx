import { Component } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled application error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
        <section
          className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-12"
          role="alert"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={38} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Aplikasi mengalami kendala
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Data Anda tidak diubah. Muat ulang halaman atau kembali ke dashboard
            untuk melanjutkan.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RotateCcw size={17} aria-hidden="true" />
              Muat Ulang
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Home size={17} aria-hidden="true" />
              Ke Dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }
}
