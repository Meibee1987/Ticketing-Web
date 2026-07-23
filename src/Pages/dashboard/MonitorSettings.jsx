/**
 * ================================================================================
 * FILE: MonitorSettings.jsx
 * DESKRIPSI: Halaman pengaturan Monitor Jadwal - Upload gambar slides
 * ================================================================================
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

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
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ⚙️ Pengaturan Monitor Jadwal
          </h1>
          <p className="text-gray-600">
            Kelola gambar/iklan yang ditampilkan di monitor jadwal
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📤 Tambah Gambar Baru
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Judul Gambar
                </label>
                <input
                  type="text"
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
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: JPG, PNG, GIF, WebP • Max: 5MB • Resolusi: 1920x1080px
                </p>
              </div>

              <button
                onClick={handleAddSlide}
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? '⏳ Mengupload...' : '✅ Tambah Gambar'}
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
                    <svg
                      className="w-16 h-16 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p>Pilih gambar untuk preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Slides List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🖼️ Gambar yang Ditampilkan ({slides.length})
          </h2>

          {slides.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-semibold">Belum ada gambar</p>
              <p className="text-sm">Upload gambar pertama Anda di atas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
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
                        onClick={() => moveSlide(index, 'up')}
                        disabled={index === 0}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Pindah ke atas"
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
                        onClick={() => moveSlide(index, 'down')}
                        disabled={index === slides.length - 1}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Pindah ke bawah"
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
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Hapus"
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
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Cara Kerja</h3>
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
                href="/monitor"
                target="_blank"
                className="font-semibold underline"
              >
                /monitor
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
        >
          <div className="max-w-6xl max-h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-screen object-contain"
            />
          </div>
          <button
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2"
            onClick={() => setPreviewImage(null)}
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
