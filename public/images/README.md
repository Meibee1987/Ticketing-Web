# 📁 Folder Images untuk Monitor Jadwal

## 📌 Panduan Cepat

Taruh file gambar/iklan Anda di folder ini untuk ditampilkan di Monitor Jadwal.

### Format yang Didukung:

- ✅ `.jpg` / `.jpeg`
- ✅ `.png`
- ✅ `.gif`
- ✅ `.webp`

### Ukuran Rekomendasi:

- **Resolusi**: 1920 x 1080 px (Full HD) atau 3840 x 2160 px (4K)
- **Aspect Ratio**: 16:9 (landscape)
- **File Size**: 2-5 MB max (agar loading cepat)

---

## 📝 Contoh Struktur Folder:

```
public/images/
├── iklan-pendaftaran.jpg     ← Iklan pendaftaran mahasiswa baru
├── pengumuman-kampus.png     ← Pengumuman penting
├── event-bulan-ini.jpg       ← Info event kampus
└── beasiswa.png              ← Info beasiswa
```

---

## 🔧 Cara Menggunakan:

1. **Simpan gambar** di folder ini
2. **Buka file**: `src/Pages/JadwalMonitor.jsx`
3. **Edit bagian SLIDE_IMAGES**:

```jsx
const SLIDE_IMAGES = [
  {
    type: 'image',
    url: '/images/iklan-pendaftaran.jpg',
    title: 'Pendaftaran 2026',
  },
  { type: 'image', url: '/images/pengumuman-kampus.png', title: 'Pengumuman' },
  { type: 'image', url: '/images/event-bulan-ini.jpg', title: 'Event Kampus' },
];
```

4. **Refresh browser** untuk melihat perubahan

---

## 💡 Tips:

### Nama File

- ❌ Hindari: `Iklan 1.JPG` (spasi & uppercase)
- ✅ Gunakan: `iklan-1.jpg` (dash & lowercase)

### Optimasi Gambar

Compress gambar sebelum digunakan:

- Online: [TinyPNG.com](https://tinypng.com), [Squoosh.app](https://squoosh.app)
- Tools: Photoshop, GIMP, IrfanView

### Design Guidelines

- **Font size besar** (minimal 48pt untuk heading)
- **Kontras tinggi** (text gelap di background terang)
- **Simple & Clean** (tidak terlalu banyak informasi)
- **Logo kampus** di pojok untuk branding

---

## 📖 Dokumentasi Lengkap

Lihat: [MONITOR_SETUP_GUIDE.md](../../MONITOR_SETUP_GUIDE.md) di root folder

---

**Happy Monitoring! 📺✨**
