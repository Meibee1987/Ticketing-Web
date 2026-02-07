# 📺 Monitor Settings - Panduan Upload Gambar

## ✨ Fitur Baru!

Sekarang Anda bisa mengelola gambar/iklan yang ditampilkan di Monitor Jadwal **tanpa perlu edit kode!**

---

## 🚀 Cara Menggunakan

### 1. **Akses Halaman Monitor Settings**

Login sebagai **Admin** atau **Super Admin**, kemudian:

- Buka menu **"📺 Monitor Settings"** di sidebar dashboard
- Atau akses langsung: `http://localhost:5173/dashboard/monitor-settings`

---

### 2. **Upload Gambar Baru**

![Upload Form](docs/monitor-upload.png)

1. **Isi Judul Gambar**
   - Contoh: "Pendaftaran 2026", "Info Beasiswa", "Event Kampus"
2. **Pilih File Gambar**
   - Klik "Choose File" atau drag & drop
   - Format: JPG, PNG, GIF, WebP
   - Ukuran maksimal: 5MB
   - Resolusi: 1920x1080px (Full HD)

3. **Preview**
   - Gambar akan muncul di panel preview sebelah kanan
4. **Klik "✅ Tambah Gambar"**
   - Tunggu proses upload selesai
   - Gambar akan langsung tersimpan!

---

### 3. **Kelola Gambar**

Setelah upload, gambar akan muncul di daftar:

#### **Lihat Preview Ukuran Penuh**

- Klik thumbnail gambar untuk melihat preview

#### **Ubah Urutan**

- 🔼 **Tombol Panah Atas**: Pindahkan gambar ke atas
- 🔽 **Tombol Panah Bawah**: Pindahkan gambar ke bawah
- Urutan menentukan urutan tampil di monitor

#### **Hapus Gambar**

- 🗑️ **Tombol Delete**: Hapus gambar dari slideshow
- Konfirmasi akan muncul sebelum menghapus

---

## 📺 Lihat Hasil di Monitor

1. **Buka halaman monitor**:
   - URL: `http://localhost:5173/jadwal-monitor`
   - Atau: `http://localhost:5173/monitor`

2. **Gambar akan muncul otomatis**:
   - Bergantian dengan halaman jadwal
   - Auto-slide setiap 7-10 detik
   - Urutan sesuai dengan setting

3. **Refresh otomatis**:
   - Monitor refresh gambar setiap 5 menit
   - Gambar baru otomatis muncul tanpa reload manual

---

## 💡 Tips Gambar yang Bagus

### Resolusi & Ukuran

- ✅ **Resolusi**: 1920 x 1080 px (Full HD)
- ✅ **Aspect Ratio**: 16:9 (landscape)
- ✅ **Ukuran File**: Max 5MB (lebih kecil = loading lebih cepat)

### Format File

- ✅ **JPG/JPEG**: Untuk foto/gambar dengan banyak warna
- ✅ **PNG**: Untuk gambar dengan transparansi atau text
- ✅ **WebP**: Modern format, file lebih kecil
- ✅ **GIF**: Untuk animasi sederhana

### Design Guidelines

- ✅ **Font Besar**: Minimal 48pt untuk heading, 24pt untuk text
- ✅ **Kontras Tinggi**: Text gelap di background terang (atau sebaliknya)
- ✅ **Simple & Clean**: Jangan terlalu banyak informasi
- ✅ **Logo Kampus**: Tambahkan di pojok untuk branding
- ✅ **Jarak Baca**: Desain agar terbaca dari jarak 3-5 meter

---

## 🛠️ Troubleshooting

### Gambar Tidak Muncul?

**1. Cek ukuran file**

- Maksimal 5MB
- Kompres gambar menggunakan [TinyPNG.com](https://tinypng.com)

**2. Cek format file**

- Pastikan JPG, PNG, GIF, atau WebP
- Tidak support PDF, SVG kompleks, atau format lain

**3. Refresh monitor**

- Buka monitor dan tunggu hingga 5 menit
- Atau reload halaman monitor (F5)

**4. Cek browser**

- Clear cache browser (Ctrl + Shift + Delete)
- Coba browser lain (Chrome, Firefox, Edge)

---

### Upload Gagal?

**1. Koneksi internet**

- Pastikan koneksi stabil
- File upload memerlukan bandwidth sesuai ukuran file

**2. Browser support**

- Gunakan browser modern (Chrome, Firefox, Edge)
- Update browser ke versi terbaru

**3. localStorage penuh**

- Browser punya limit localStorage (~5-10MB)
- Hapus gambar lama yang tidak terpakai
- Atau gunakan gambar dengan file size lebih kecil

---

## 🎯 Best Practices

### Untuk Display TV/Monitor Publik

```
Resolusi: 1920 x 1080 px (Full HD)
Font Size: 48-72pt untuk heading
Durasi: 10-15 detik per slide
Jumlah: 3-5 gambar optimal
```

### Untuk Kiosk Touchscreen

```
Resolusi: 1920 x 1080 px atau 3840 x 2160 px (4K)
Font Size: 36-60pt
Durasi: 7-10 detik per slide
Jumlah: 5-8 gambar
```

---

## 📊 Data Storage

### Dimana Gambar Disimpan?

**Opsi 1: Supabase Storage** (Recommended)

- Upload otomatis ke Supabase Storage
- File tersimpan di cloud
- Bisa diakses dari mana saja
- Tidak membebani browser

**Opsi 2: Base64 dalam localStorage** (Fallback)

- Jika Supabase Storage tidak tersedia
- Gambar di-encode ke base64
- Tersimpan di browser
- Limit: ~5-10MB total

### Batasan localStorage

- Browser limit: 5-10MB
- Rekomendasi: Max 10-15 gambar @ 500KB
- Atau: Max 3-5 gambar @ 2MB

---

## 🔧 Advanced Configuration

### Ubah Durasi Auto-Slide

Edit file: `src/Pages/JadwalMonitor.jsx`

```jsx
const AUTO_SLIDE_INTERVAL = 10000; // 10 detik (dalam milidetik)
```

Contoh:

- 5 detik: `5000`
- 7 detik: `7000`
- 15 detik: `15000`

### Ubah Jumlah Jadwal per Halaman

```jsx
const ITEMS_PER_PAGE = 6; // Default: 6 jadwal
```

---

## 📖 Tutorial Video

_(Coming soon - Video tutorial akan ditambahkan)_

---

## 🆘 Need Help?

Jika mengalami kendala:

1. Cek console browser (F12 → Console tab)
2. Screenshot error yang muncul
3. Hubungi admin sistem

---

**Developed by Wanda Saputra**
