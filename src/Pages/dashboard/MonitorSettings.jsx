/**
 * ================================================================================
 * FILE: MonitorSettings.jsx
 * DESKRIPSI: Halaman pengaturan Monitor Jadwal - Upload gambar slides
 * ================================================================================
 */

import { useState, useEffect } from 'react';
import { ImagePlus, Images, Info, Upload } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import PageHeader from '../../components/ui/PageHeader';
import StatePanel from '../../components/ui/StatePanel';

const STORAGE_KEY = 'jadwal_monitor_slides';

export default function MonitorSettings() {
  const [slides, setSlides] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [newSlide, setNewSlide] = useState({
    title: '',
    file: null,
    preview: null,
  });

  // Load slides dari localStorage
  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = () => {
    try {
      const savedSlides = localStorage.getItem(STORAGE_KEY);
      if (savedSlides) {
        setSlides(JSON.parse(savedSlides));
      }
    } catch (error) {
      console.error('Error loading slides:', error);
    }
  };

  const saveSlides = (newSlides) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlides));
      setSlides(newSlides);
    } catch (error) {
      console.error('Error saving slides:', error);
      alert('Gagal menyimpan: ' + error.message);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi file
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      alert('Ukuran file maksimal 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setNewSlide({
        ...newSlide,
        file: file,
        preview: e.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  // Upload gambar ke Supabase Storage
  const uploadToStorage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `slide-${Date.now()}.${fileExt}`;
      const filePath = `monitor-slides/${fileName}`;

      const { error } = await supabase.storage
        .from('public-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('public-files').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      throw error;
    }
  };

  // Add slide
  const handleAddSlide = async () => {
    if (!newSlide.title.trim()) {
      alert('Judul harus diisi');
      return;
    }

    if (!newSlide.file && !newSlide.preview) {
      alert('Pilih gambar terlebih dahulu');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = newSlide.preview;

      // Jika ada file baru, upload ke Supabase Storage
      // Jika tidak ada Supabase Storage, gunakan Data URL (base64)
      if (newSlide.file) {
        try {
          imageUrl = await uploadToStorage(newSlide.file);
        } catch (storageError) {
          console.warn('Storage upload failed, using base64:', storageError);
          // Fallback ke base64 jika storage gagal
          imageUrl = newSlide.preview;
        }
      }

      const slide = {
        id: Date.now(),
        type: 'image',
        url: imageUrl,
        title: newSlide.title,
        createdAt: new Date().toISOString(),
      };

      const updatedSlides = [...slides, slide];
      saveSlides(updatedSlides);

      // Reset form
      setNewSlide({ title: '', file: null, preview: null });
      alert('Gambar berhasil ditambahkan!');
    } catch (error) {
      console.error('Error adding slide:', error);
      alert('Gagal menambahkan gambar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete slide
  const handleDeleteSlide = (id) => {
    if (!confirm('Hapus gambar ini dari slideshow?')) return;

    const updatedSlides = slides.filter((s) => s.id !== id);
    saveSlides(updatedSlides);
    alert('Gambar berhasil dihapus!');
  };

  // Move slide up/down
  const moveSlide = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;

    const updatedSlides = [...slides];
    [updatedSlides[index], updatedSlides[newIndex]] = [
      updatedSlides[newIndex],
      updatedSlides[index],
    ];
    saveSlides(updatedSlides);
  };

  return (
    <div className="ui-page">
      <div className="w-full">
        <PageHeader
          title="Konten Monitor"
          description="Kelola gambar informasi yang ditampilkan pada Monitor Jadwal."
        />
        {/* Upload Section */}
        <div className="ui-card mt-6 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <ImagePlus size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="ui-card-title">Tambah Gambar Baru</h2>
              <p className="ui-description">
                Unggah materi visual dengan rasio yang sesuai untuk monitor.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Judul Gambar
                </label>
                <input
                  type="text"
                  aria-label="Judul gambar"
                  value={newSlide.title}
                  onChange={(e) =>
                    setNewSlide({ ...newSlide, title: e.target.value })
                  }
                  placeholder="Contoh: Pendaftaran 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  File Gambar
                </label>
                <input
                  type="file"
                  aria-label="File gambar"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: JPG, PNG, GIF, WebP • Max: 5MB • Resolusi: 1920x1080px
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSlide}
                disabled={uploading}
                className="ui-button ui-button-primary w-full disabled:border-slate-300 disabled:bg-slate-300"
                aria-label={uploading ? 'Mengunggah gambar' : 'Tambah gambar'}
              >
                <Upload size={16} aria-hidden="true" />
                {uploading ? 'Mengunggah...' : 'Tambah Gambar'}
              </button>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Preview
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center bg-gray-50">
                {newSlide.preview ? (
                  <img
                    src={newSlide.preview}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImagePlus
                      size={48}
                      className="mx-auto mb-2"
                      aria-hidden="true"
                    />
                    <p>Pilih gambar untuk preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Slides List */}
        <div className="ui-card mt-6 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Images size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="ui-card-title">
                Gambar yang Ditampilkan ({slides.length})
              </h2>
              <p className="ui-description">
                Atur urutan konten sesuai prioritas penayangan.
              </p>
            </div>
          </div>
          {slides.length === 0 ? (
            <StatePanel
              type="empty"
              title="Belum ada gambar"
              description="Unggah gambar pertama melalui formulir di atas."
            />
          ) : (
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Thumbnail */}
                    <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={slide.url}
                        alt={slide.title}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImage(slide.url)}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {slide.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Urutan: #{index + 1} •{' '}
                        {new Date(slide.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 'up')}
                        disabled={index === 0}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Pindah ke atas"
                        aria-label={`Pindahkan ${slide.title} ke atas`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 'down')}
                        disabled={index === slides.length - 1}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Pindah ke bawah"
                        aria-label={`Pindahkan ${slide.title} ke bawah`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Hapus"
                        aria-label={`Hapus ${slide.title}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-primary-900">
            <Info size={16} aria-hidden="true" />
            Cara Kerja
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Gambar akan otomatis ditampilkan di Monitor Jadwal secara
              bergantian
            </li>
            <li>
              • Urutan gambar sesuai dengan urutan di daftar (gunakan tombol
              panah)
            </li>
            <li>
              • Monitor akan refresh otomatis setiap 5 menit untuk update gambar
              terbaru
            </li>
            <li>
              • Buka{' '}
              <a
                href="/jadwal-monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                /jadwal-monitor
              </a>{' '}
              untuk melihat tampilan monitor
            </li>
          </ul>
        </div>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Preview gambar monitor"
        >
          <div className="max-w-6xl max-h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-screen object-contain"
            />
          </div>
          <button
            type="button"
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
            onClick={() => setPreviewImage(null)}
            aria-label="Tutup preview"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
