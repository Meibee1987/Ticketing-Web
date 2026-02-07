# 🎯 Quick Start: Monitor Jadwal dengan Auto-Slide

## ✨ Fitur Baru yang Ditambahkan

1. ✅ **Pagination**: Maksimal 6 jadwal per halaman
2. ✅ **Auto-Slide**: Otomatis pindah halaman setiap 7 detik
3. ✅ **Dukungan Gambar**: Tampilkan iklan/pengumuman di antara slide
4. ✅ **Manual Navigation**: Tombol kiri/kanan dan dots indicator
5. ✅ **Page Counter**: Menampilkan posisi halaman saat ini

---

## 🚀 Cara Mengaktifkan Gambar/Iklan

### 1. Simpan Gambar Anda

Taruh file gambar di: `public/images/`

Contoh:

```
public/images/
├── iklan1.jpg
├── pengumuman.png
└── banner.jpg
```

### 2. Edit Konfigurasi

Buka: `src/Pages/JadwalMonitor.jsx`

Cari bagian ini (sekitar baris 10-15):

```jsx
// 🖼️ KONFIGURASI GAMBAR
const SLIDE_IMAGES = [
  // Uncomment baris di bawah dan sesuaikan:
  // { type: 'image', url: '/images/iklan1.jpg', title: 'Judul Iklan' },
];
```

**Uncomment dan edit** sesuai gambar Anda:

```jsx
const SLIDE_IMAGES = [
  { type: 'image', url: '/images/iklan1.jpg', title: 'Pendaftaran 2026' },
  { type: 'image', url: '/images/pengumuman.png', title: 'Pengumuman' },
];
```

### 3. Refresh Browser

Gambar akan muncul di rotasi slide! 🎉

---

## ⚙️ Konfigurasi Cepat

Di file yang sama, ubah konstanta ini:

```jsx
const ITEMS_PER_PAGE = 6; // Jumlah jadwal per halaman
const AUTO_SLIDE_INTERVAL = 7000; // 7 detik (dalam milidetik)
```

**Contoh Penyesuaian:**

- Layar TV besar → `ITEMS_PER_PAGE = 4` (text lebih besar)
- Slide lebih lambat → `AUTO_SLIDE_INTERVAL = 10000` (10 detik)

---

## 📖 Dokumentasi Lengkap

Lihat: [MONITOR_SETUP_GUIDE.md](MONITOR_SETUP_GUIDE.md)

---

## 🎨 Tips Gambar yang Bagus

- **Resolusi**: 1920 x 1080 px (Full HD)
- **Ukuran**: Max 2-5 MB
- **Format**: JPG, PNG, WebP
- **Design**: Text besar, kontras tinggi, simple

---

## 🔧 Test Sekarang!

1. Coba file contoh yang sudah disediakan:

```jsx
const SLIDE_IMAGES = [
  { type: 'image', url: '/images/contoh-slide.svg', title: 'Contoh Slide' },
];
```

2. Akses: `http://localhost:5173/monitor`
3. Lihat slide otomatis berganti setiap 7 detik!

---

**Selamat Mencoba! 🚀**
