# 📺 Panduan Pengaturan Monitor Jadwal

## ✨ Fitur-fitur Monitor Jadwal

### 1. **Pagination Otomatis**

- ✅ Menampilkan **maksimal 6 jadwal** per halaman
- ✅ **Auto-slide** otomatis setiap **7 detik**
- ✅ Manual navigation dengan tombol panah kiri/kanan
- ✅ Indikator halaman dengan dots dan counter

### 2. **Dukungan Gambar/Iklan**

- ✅ Menampilkan gambar/iklan di antara slide jadwal
- ✅ Full-screen display untuk gambar
- ✅ Support URL lokal dan remote

### 3. **Auto-refresh**

- ✅ Data jadwal diperbarui otomatis setiap 5 menit
- ✅ Jam realtime update setiap detik

---

## 🖼️ Cara Menambahkan Gambar/Iklan

### Langkah 1: Siapkan File Gambar

Ada 2 cara menempatkan gambar:

#### **Opsi A: File Lokal** (Recommended)

1. Simpan gambar Anda di folder: `public/images/`
2. Format yang didukung: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
3. Contoh struktur:
   ```
   public/
   └── images/
       ├── iklan1.jpg
       ├── pengumuman.png
       └── banner.jpg
   ```

#### **Opsi B: URL Remote**

Gunakan URL langsung dari internet (contoh: dari Google Drive, Imgur, dll)

---

### Langkah 2: Konfigurasi di JadwalMonitor.jsx

Buka file: `src/Pages/JadwalMonitor.jsx`

Cari bagian **KONFIGURASI GAMBAR** (sekitar baris 10-15):

```jsx
// 🖼️ KONFIGURASI GAMBAR - Tambahkan URL gambar/iklan di sini
const SLIDE_IMAGES = [
  // Uncomment dan tambahkan URL gambar Anda di sini:
  // { type: 'image', url: '/images/iklan1.jpg', title: 'Iklan 1' },
  // { type: 'image', url: '/images/pengumuman.jpg', title: 'Pengumuman' },
  // { type: 'image', url: 'https://example.com/banner.jpg', title: 'Banner' },
];
```

**Uncomment** dan editkan sesuai gambar Anda:

```jsx
const SLIDE_IMAGES = [
  { type: 'image', url: '/images/iklan1.jpg', title: 'Promosi Pendaftaran' },
  { type: 'image', url: '/images/pengumuman.png', title: 'Pengumuman Penting' },
  {
    type: 'image',
    url: 'https://i.imgur.com/abc123.jpg',
    title: 'Info Kampus',
  },
];
```

**Properties:**

- `type`: Selalu isi dengan `'image'`
- `url`: Path atau URL gambar
  - Lokal: `/images/nama-file.jpg` (tanpa `public/`)
  - Remote: `https://...`
- `title`: Judul yang muncul di bawah gambar (opsional)

---

### Langkah 3: Simpan dan Refresh

1. **Simpan file** `JadwalMonitor.jsx`
2. **Refresh browser** untuk melihat perubahan
3. Gambar akan muncul di rotasi slide setelah halaman terakhir data jadwal

---

## ⚙️ Konfigurasi Lanjutan

### Mengubah Jumlah Data per Halaman

Ubah konstanta `ITEMS_PER_PAGE`:

```jsx
const ITEMS_PER_PAGE = 6; // Ubah sesuai kebutuhan (default: 6)
```

**Rekomendasi:**

- **4-6 items**: Untuk tampilan TV/layar besar (agar text besar dan jelas)
- **8-10 items**: Untuk layar komputer biasa

---

### Mengubah Kecepatan Auto-Slide

Ubah konstanta `AUTO_SLIDE_INTERVAL`:

```jsx
const AUTO_SLIDE_INTERVAL = 7000; // Waktu dalam milidetik (7000 = 7 detik)
```

**Contoh:**

- 5 detik: `5000`
- 10 detik: `10000`
- 15 detik: `15000`

---

## 📋 Contoh Lengkap Konfigurasi

```jsx
export default function JadwalMonitor() {
  const [jadwalData, setJadwalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);

  // 🎯 KONFIGURASI - Ubah sesuai kebutuhan
  const ITEMS_PER_PAGE = 6; // 6 jadwal per halaman
  const AUTO_SLIDE_INTERVAL = 7000; // 7 detik per slide

  // 🖼️ KONFIGURASI GAMBAR
  const SLIDE_IMAGES = [
    {
      type: 'image',
      url: '/images/iklan-pendaftaran.jpg',
      title: 'Pendaftaran Mahasiswa Baru 2026',
    },
    {
      type: 'image',
      url: '/images/info-beasiswa.png',
      title: 'Program Beasiswa',
    },
    {
      type: 'image',
      url: '/images/event-kampus.jpg',
      title: 'Event Bulan Ini',
    },
  ];

  // ... rest of code
}
```

---

## 🎨 Tips Gambar yang Bagus

### Resolusi yang Disarankan

- **Full HD Display**: 1920 x 1080 px
- **4K Display**: 3840 x 2160 px
- **Aspect Ratio**: 16:9 (landscape)

### Ukuran File

- Maksimal **2-5 MB** per gambar (agar load cepat)
- Gunakan format **WebP** atau **JPEG** untuk file lebih kecil

### Design Tips

- ✅ Text harus **besar dan jelas terbaca dari jauh**
- ✅ Gunakan **kontras warna tinggi**
- ✅ Hindari terlalu banyak text kecil
- ✅ Logo dan branding di pojok atas/bawah

---

## 🚀 Mode Fullscreen untuk TV/Monitor

Tekan **F11** di browser untuk masuk mode fullscreen.

Atau tambahkan shortcut:

1. Buka browser
2. Navigate ke `http://localhost:5173/monitor` (atau URL monitor Anda)
3. Tekan `F11` untuk fullscreen
4. Monitor akan auto-slide terus menerus!

---

## 🔧 Troubleshooting

### Gambar Tidak Muncul?

**1. Cek path gambar:**

```jsx
// ❌ SALAH
url: '/public/images/gambar.jpg'; // jangan pakai /public/
url: 'images/gambar.jpg'; // harus pakai / di depan

// ✅ BENAR
url: '/images/gambar.jpg';
```

**2. Cek format file:**

- Gunakan lowercase untuk ekstensi: `.jpg` bukan `.JPG`
- Pastikan tidak ada spasi di nama file: `iklan_1.jpg` bukan `iklan 1.jpg`

**3. Cek console browser:**

- Tekan `F12` → tab Console
- Lihat apakah ada error loading gambar

### Slide Terlalu Cepat/Lambat?

Ubah `AUTO_SLIDE_INTERVAL` di JadwalMonitor.jsx

### Ingin Nonaktifkan Auto-Slide?

Comment out bagian useEffect:

```jsx
// useEffect(() => {
//   if (totalPages <= 1) return;
//   const slideTimer = setInterval(() => {
//     setCurrentPage((prev) => (prev + 1) % totalPages);
//   }, AUTO_SLIDE_INTERVAL);
//   return () => clearInterval(slideTimer);
// }, [jadwalData.length, SLIDE_IMAGES.length]);
```

---

## 📱 Kontrol Manual

Pengguna tetap bisa navigasi manual:

- **Tombol Panah Kiri/Kanan**: Pindah halaman
- **Klik Dots**: Langsung ke halaman tertentu
- **Counter**: Menampilkan posisi saat ini

---

## 🎯 Best Practice

### Untuk Display TV/Monitor Publik:

```jsx
const ITEMS_PER_PAGE = 4 - 6; // Agar text besar
const AUTO_SLIDE_INTERVAL = 10000; // 10 detik, cukup waktu baca
```

### Untuk Kiosk/Touchscreen:

```jsx
const ITEMS_PER_PAGE = 6 - 8; // Lebih banyak info
const AUTO_SLIDE_INTERVAL = 7000; // 7 detik
// User bisa navigasi manual dengan touch
```

---

## 📞 Support

Jika ada masalah atau pertanyaan, hubungi developer:
**Wanda Saputra** - Developer Sistem Ticketing

---

**Selamat Menggunakan Monitor Jadwal! 🎉**
