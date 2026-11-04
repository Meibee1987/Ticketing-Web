# Hasil Sinkronisasi Dosen

Tanggal verifikasi: 2026-11-04 (Asia/Jakarta)

## Status

Sinkronisasi sudah tersimpan di database dan telah diverifikasi melalui
pembacaan ulang tabel `public.dosen`.

Pesan `42P01: relation "_sync_dosen_source" does not exist` terjadi setelah
temporary table dihapus oleh `ON COMMIT DROP`. Kondisi database membuktikan
bahwa transaksi utama telah selesai. Query migrasi tidak boleh dijalankan ulang.

## Hasil terverifikasi

| Pemeriksaan | Hasil |
| --- | ---: |
| Total baris `public.dosen` | 576 |
| Mapping yang diharapkan | 573 |
| Mapping yang ditemukan kembali | 573 |
| Record lama yang mendapat `id_external` | 524 |
| Record baru | 49 |
| Rentang primary key record baru | 541–589 |
| `id_external` terisi | 573 |
| `id_external` unik | 573 |
| Duplikat `id_external` | 0 |
| Kode dosen tidak kosong | 574 |
| Kode dosen unik | 574 |
| Duplikat kode dosen | 0 |

Tiga record lama tetap tidak memiliki `id_external`, sesuai preview:

| DB id | `id_dosen` | Nama | Keterangan |
| ---: | --- | --- | --- |
| 11 | SBIDSN002 | Annisa Ramadanti S.E., M.M. | Master lama/nonaktif |
| 539 | kosong | Nawangsita Noorardini Winoto, B.Econ, MIntEcon&F | Dipertahankan |
| 540 | kosong | Dr. Harry Koeswanda, S.Sos., MSM | Dipertahankan |

## Kandidat duplikasi berbasis nama

Tidak ada duplikasi key, tetapi verifikasi nama ternormalisasi menemukan kandidat
berikut. Tidak ada koreksi atau penghapusan otomatis yang dilakukan:

| Record baru | Record lain | Catatan |
| --- | --- | --- |
| id 541 / IPBDSN098 / Prof. Dr. Ir. Herry Suhardiyanto M.Sc. | id 169 / IPBDSN099 | Sumber memiliki record tidak aktif dan aktif dengan ID eksternal berbeda |
| id 577 / NSBDSN366 / Dr. Eko Ruddy Cahyadi, S.Hut, M.M. | id 249 / NSBDSN040 | Nama sama, kode dan ID eksternal berbeda |
| id 578 / NSBDSN367 / Nawangsita Noorardini Winoto | id 539 / kode kosong | Nama sama persis; record lama dipertahankan |
| id 553 / NSBDSN341 / Dr. Wempi Saputra | id 555 / NSBDSN343 | Dua record baru dengan nama sama dan ID eksternal berbeda |

Penanganan kandidat tersebut memerlukan keputusan terpisah karena penggabungan
akan membutuhkan pemilihan record kanonis dan dapat melibatkan penghapusan record
baru. Sampai ada persetujuan, seluruh data dibiarkan seperti hasil transaksi.
