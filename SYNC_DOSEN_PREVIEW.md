# Preview Sinkronisasi Dosen

Tanggal preview: 2026-11-04 (Asia/Jakarta)

Sumber: Google Sheet **Estella New**, tab **Dosen** (`gid=114439575`), dibaca langsung melalui integrasi Google Drive menggunakan akun `wandasaputra@apps.ipb.ac.id`.

Database: Supabase dari konfigurasi `.env` project, dibaca melalui REST secara read-only. Pada saat preview, kolom `public.dosen.id_external` belum ada.

## Ruang perubahan yang diusulkan

- Record lama yang cocok: isi `id_external` saja.
- Record baru: insert `nama_dosen`, `id_dosen`, `id_external`, email/telepon bila tersedia, dan status.
- Tidak menghapus record.
- Tidak mengubah `id` atau `id_dosen` record lama.
- Tidak mengubah nama, email, telepon, status, role, atau `auth_id` record lama.
- Dua konflik `NSBDSN376` dan lima duplikat tidak diproses otomatis.

## Ringkasan preview

| Kategori | Jumlah |
| --- | ---: |
| Baris Google Sheet | 580 |
| Baris database saat ini | 527 |
| Cocok ke record lama | 524 |
| Record baru aman diinsert | 49 |
| Duplikat sumber yang dilewati | 5 |
| Baris konflik yang ditahan | 2 |
| Record database tidak ditemukan di Sheet | 3 |
| Perbedaan nama substantif | 3 |
| Perbedaan nama kosmetik/punctuation | 23 |
| Perbedaan status (tidak akan diubah) | 35 |
| Total database setelah eksekusi | 576 |
| Record dengan `id_external` setelah eksekusi | 573 |

## Pencocokan khusus

| Row | ID Sheet | Kode Sheet | Target DB | Alasan |
| --- | --- | --- | --- | --- |
| 20 | e9d5ac1b | SBIDSN003 | SBIDSN003 (id 15) | duplikat diselesaikan |
| 576 | 2d4c1bf0 | SBIDSN005 | SBIDSN005 (id 17) | duplikat diselesaikan |
| 19 | 5ba195e8 | SBIDSN002 | SBIDSN008 (id 20) | nama + email + aktif |
| 35 | 041c7082 | SBIDSN023 | SBIDSN023 (id 35) | duplikat diselesaikan |
| 140 | ed372148 | IPBDSN081 | IPBDSN081 (id 151) | duplikat diselesaikan |
| 255 | 1e1c5628 | NSBDSN056 | NSBDSN056 (id 265) | duplikat diselesaikan |

Catatan: baris Annisa pada Sheet berkode `SBIDSN002`, tetapi dipasangkan ke master aktif database `SBIDSN008` berdasarkan nama, email, dan status aktif. Master lama/nonaktif `SBIDSN002` dipertahankan tanpa perubahan.

## Konflik yang ditahan

| Row | ID | Kode | Nama |
| --- | --- | --- | --- |
| 575 | 2f731c91 | NSBDSN376 | Dr. Benedicta Evienia Prabawanti, S.E., M.M. |
| 578 | e2695ca4 | NSBDSN376 | M. Riza Damanik, S.T., M.Si., Ph.D., I.P.U. |

Kode `NSBDSN376` menunjuk dua orang berbeda sehingga keduanya tidak diinsert sampai kode yang benar dikonfirmasi pada sumber.

## Duplikat sumber yang dilewati

| Row | ID | Kode | Nama | Status |
| --- | --- | --- | --- | --- |
| 4 | 683f94af | SBIDSN005 | Andina Oktariani, S.E., M.Si. | Tidak Aktif |
| 7 | 2635c649 | SBIDSN023 | Zenal Asikin, S.E., M.Si. | Tidak Aktif |
| 141 | f9c590cd | IPBDSN081 | Dr Ir Dedi Budiman Hakim, MEc | Aktif |
| 256 | 7c263910 | NSBDSN056 | Dr Hendro Sasongko, Ak, MM | Aktif |
| 577 | db466900 | SBIDSN003 | Dr. Adhitya Rahmana, S.Pt., M.M. | Aktif |

## Record database yang tidak ditemukan di Sheet

| DB id | id_dosen | nama_dosen | Aktif |
| --- | --- | --- | --- |
| 11 | SBIDSN002 | Annisa Ramadanti S.E., M.M. | Tidak |
| 539 | (kosong) | Nawangsita Noorardini Winoto, B.Econ, MIntEcon&F | Ya |
| 540 | (kosong) | Dr. Harry Koeswanda, S.Sos., MSM  | Ya |

Ketiga record tetap dipertahankan dan tidak diubah.

## Perbedaan nama substantif

| DB id | id_dosen | Nama DB | Nama Sheet | ID Sheet |
| --- | --- | --- | --- | --- |
| 17 | SBIDSN005 | Andina Oktariani, S.E., M.Si. | Dr. Andina Oktariani, S.E., M.Si. | 2d4c1bf0 |
| 90 | IPBDSN020 | Dr. Ir. Budi Suharjo, M. Sc.  | Dr. Ir. Budi Suharjo, M.S. | 16708078 |
| 359 | NSBDSN150 | Dr. Koes Pranowo, MSM | Dr. Koes Pranowo, SE., MSM | 46ff4f62 |

Preview konservatif tidak mengubah nama record lama. Perbedaan ini hanya dilaporkan untuk peninjauan.

## 49 record baru yang diusulkan

| Row | ID | Kode Dosen | User Name |
| --- | --- | --- | --- |
| 158 | 12ec8b3a | IPBDSN098 | Prof. Dr. Ir. Herry Suhardiyanto M.Sc. |
| 530 | 4b174759 | NSBDSN330 | R. Fiza Anwar Sharif, M.M. |
| 531 | 47a49607 | NSBDSN331 | Dr. Shandra Widiyanti, S.E., M.M. |
| 532 | 447238d9 | NSBDSN332 | Dr. Heni Hasanah, S.E., M.Si |
| 533 | aafdd6ae | NSBDSN333 | I Kadek Dian Sutrisna Artha M.Sc., Ph.D. |
| 534 | 17f4a6dd | NSBDSN334 | Dr. Muhammad Faisal, S.P., M.M. |
| 535 | d30cca18 | NSBDSN335 | Dr. Indra Wahyudi, S.T., M.M. |
| 536 | 1ef26f2b | NSBDSN336 | Mohammad Haekal, S.Si., M.Si., Ph.D. |
| 537 | 79854f39 | NSBDSN337 | Dr. Subekti, S.E., M.M. |
| 538 | 2103ee8a | NSBDSN338 | Dr. Antony Japari, S.E., M.M. |
| 539 | c1532b37 | NSBDSN339 | Prof. Dr. Mohamad Fazli Sabri |
| 540 | ab06ec82 | NSBDSN340 | Dr. Ahmad Giffari, S.Sos., M.S.E., M.B.A., CRGP |
| 541 | ea9f4db2 | NSBDSN341 | Dr. Wempi Saputra, S.E., M.P.F. |
| 542 | 3c91e40f | NSBDSN342 | Prof. Dr. Ir. Jono Mintarto Munandar, M.Sc. |
| 543 | b6b3b273 | NSBDSN343 | Dr. Wempi Saputra, S.E., M.P.F. |
| 544 | 4c359f83 | NSBDSN344 | Prof. Dr. Fandy Tjiptono, M.Com., Ph.D. |
| 545 | 140bcf6b | NSBDSN345 | Prof. Dr. Ir. T. Ezni Balqiah, M.E., M.H. |
| 546 | dfbd5c0a | NSBDSN346 | Prof. Dr. Mahrinasari M.S., S.E., M.Sc |
| 547 | b3fa17b4 | NSBDSN347 | Dr. Mushthofa, S.Komp, M.Sc. |
| 548 | c58e7971 | NSBDSN348 | Dr. Ir. Syaiful Anwar, M.Sc. |
| 549 | 2b02515b | NSBDSN349 | Dr. Furqon Syarief Hidayatulloh, S.Ag., M.Pdi. |
| 550 | 8fcb2dcc | NSBDSN350 | Prof. Dr. Gancar Candra Premananto, SE., MSi. |
| 551 | 1651cae6 | NSBDSN351 | Prof. Dr. Iis Diatin, M.M. |
| 552 | a07e136b | NSBDSN352 | Dr. Ir. Asep Darmansyah, M.Si. |
| 553 | 293cf4d1 | NSBDSN353 | Dr. Edi Supardi, S.E.,M.M. |
| 554 | 911302b6 | NSBDSN354 | Dr. Munadi Herlambang, S.T., M.A. |
| 555 | f0b0bb3c | NSBDSN355 | Dr. Janita Sembiring Meliala, S.E., M.M. |
| 556 | 20e35870 | NSBDSN356 | Rezza Frisma Prisandy, Ph.D. |
| 557 | 57991745 | NSBDSN357 | Dr. Tjahja Muhandri, S.T.P., M.T |
| 558 | c8c4b89a | NSBDSN359 | Dr. Henri Togar Hasiholan Tambunan, S.E., M.A. |
| 559 | 0c0abcaa | NSBDSN360 | Prof. Dr. Ir. Idat Galih Permana, M.Sc.Agr |
| 560 | 4b3907ad | NSBDSN361 | Dr. Ir. Audy Joinaldy, S.Pt., MM., M.IP., IPU., ASEAN.Eng |
| 561 | ea6abc79 | NSBDSN362 | Chaidate Inchaisri D.V.M., M.Sc., PhD. |
| 562 | d8048160 | NSBDSN363 | Dr. Ir. Safriyana, S.T.P., M.Si. |
| 563 | 706bead2 | NSBDSN364 | Prof. Dr. Adi Zakaria Afiff, S.E., M.B.A |
| 564 | 72b9c3c4 | NSBDSN365 | Drs. Sumedi Andono Mulyo, MA. PhD |
| 565 | 058a062a | NSBDSN366 | Dr. Eko Ruddy Cahyadi, S.Hut, M.M. |
| 566 | 18128920 | NSBDSN367 | Nawangsita Noorardini Winoto, B.Econ, MIntEcon&F |
| 567 | a9636d04 | NSBDSN368 | Dr. Marissa Malahayati, S.E, M.A. |
| 568 | e02d0c1b | NSBDSN369 | Prof. Dr. Ir. Endar Hasafah Nugrahani, M.S. |
| 569 | 41808d5e | NSBDSN370 | Prof. Dr. Anita Maharani, S.E., M.M. |
| 570 | ac127159 | NSBDSN371 | Dr. Dadang Muljawan Satria, S.T., M.B.A. |
| 571 | 65a3f70a | NSBDSN372 | Gan Gan Dirgantara, S.T., M.T., M.Sc., Ph.D. |
| 572 | b5820327 | NSBDSN373 | Dr. Eng. Ir. Awaluddin Nurmiyanto, S.T., Dipl.E.S., M.Eng. |
| 573 | 0ba20819 | NSBDSN374 | Prof. Dr. Ence Oos Mukhamad Anwas, M.Si. |
| 574 | 66017f5b | NSBDSN375 | Dr. Sidik Herman S.Sn., M.M. |
| 579 | 8577db24 | NSBDSN377 | Dr. Ir. Agus Siswanto, AAAIJ, AMRP |
| 580 | a3391f4e | NSBDSN378 | Dr. Emrus Sihombing, M.Si. |
| 581 | 619afa92 | NSBDSN379 | Dr. Alfiasari, S.P., M.Si. |

## Pengaman eksekusi

File `MIGRATION_SYNC_DOSEN_EXTERNAL_IDS.sql`:

- menjalankan seluruh DDL/DML dalam satu transaksi;
- mengunci tabel selama sinkronisasi;
- berhenti bila jumlah awal bukan lagi 527 baris;
- memvalidasi 573 ID sumber unik, 524 target update, dan 49 insert;
- menolak konflik ID/kode;
- membuat `id_external` unik;
- memverifikasi total akhir 576 dan 573 mapping sebelum `COMMIT`;
- otomatis rollback jika salah satu pemeriksaan gagal.

Migrasi telah dijalankan pada 2026-11-04. Hasil akhirnya tercatat di
`SYNC_DOSEN_RESULT.md`.
