-- STATUS 2026-11-04: SUDAH DIEKSEKUSI DAN DIVERIFIKASI.
-- JANGAN JALANKAN ULANG. Hasil akhir tercatat di SYNC_DOSEN_RESULT.md.
--
-- Sinkronisasi dosen dari Google Sheet "Estella New", tab "Dosen".
-- Sumber:
-- https://docs.google.com/spreadsheets/d/1rWviRLe3kNd6atNWRABkjeVHxFpWjQS8TvAOpvGrOuo/edit?gid=114439575
--
-- Preview dibuat 2026-11-04 dari:
--   Google Sheet : 580 baris data
--   public.dosen : 527 baris
--   Cocok/update : 524 baris (hanya id_external)
--   Baru/insert  : 49 baris
--   Duplikat skip: 5 baris
--   Konflik skip : 2 baris (NSBDSN376 dipakai dua nama berbeda)
--   DB tanpa pasangan: 3 baris (dipertahankan)
--
-- Jaminan:
--   * Tidak ada DELETE.
--   * id dan id_dosen record lama tidak pernah diubah.
--   * Nama, email, telepon, status, role, auth_id record lama tidak diubah.
--   * Semua perubahan berada dalam satu transaksi. Error apa pun membatalkan transaksi.
--   * Guard jumlah awal mencegah eksekusi jika database sudah berubah sejak preview.
--
-- PENTING: file ini belum dijalankan. Jalankan hanya setelah preview disetujui.

BEGIN;

LOCK TABLE public.dosen IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE public.dosen
  ADD COLUMN IF NOT EXISTS id_external text;

CREATE TEMP TABLE _sync_dosen_source (
  source_row integer NOT NULL,
  source_id text NOT NULL,
  source_name text NOT NULL,
  source_code text NOT NULL,
  source_email text,
  source_phone text,
  source_active boolean NOT NULL,
  target_code text,
  action text NOT NULL CHECK (action IN ('update', 'insert'))
) ON COMMIT DROP;

INSERT INTO _sync_dosen_source (
  source_row,
  source_id,
  source_name,
  source_code,
  source_email,
  source_phone,
  source_active,
  target_code,
  action
)
VALUES
  (158, '12ec8b3a', 'Prof. Dr. Ir. Herry Suhardiyanto M.Sc.', 'IPBDSN098', NULL, '8111123579', false, NULL, 'insert'),
  (530, '4b174759', 'R. Fiza Anwar Sharif, M.M.', 'NSBDSN330', NULL, NULL, true, NULL, 'insert'),
  (531, '47a49607', 'Dr. Shandra Widiyanti, S.E., M.M.', 'NSBDSN331', NULL, NULL, true, NULL, 'insert'),
  (532, '447238d9', 'Dr. Heni Hasanah, S.E., M.Si', 'NSBDSN332', NULL, NULL, true, NULL, 'insert'),
  (533, 'aafdd6ae', 'I Kadek Dian Sutrisna Artha M.Sc., Ph.D.', 'NSBDSN333', NULL, NULL, true, NULL, 'insert'),
  (534, '17f4a6dd', 'Dr. Muhammad Faisal, S.P., M.M.', 'NSBDSN334', NULL, NULL, true, NULL, 'insert'),
  (535, 'd30cca18', 'Dr. Indra Wahyudi, S.T., M.M.', 'NSBDSN335', NULL, NULL, true, NULL, 'insert'),
  (536, '1ef26f2b', 'Mohammad Haekal, S.Si., M.Si., Ph.D.', 'NSBDSN336', NULL, NULL, true, NULL, 'insert'),
  (537, '79854f39', 'Dr. Subekti, S.E., M.M.', 'NSBDSN337', NULL, NULL, true, NULL, 'insert'),
  (538, '2103ee8a', 'Dr. Antony Japari, S.E., M.M.', 'NSBDSN338', NULL, NULL, true, NULL, 'insert'),
  (539, 'c1532b37', 'Prof. Dr. Mohamad Fazli Sabri', 'NSBDSN339', NULL, NULL, true, NULL, 'insert'),
  (540, 'ab06ec82', 'Dr. Ahmad Giffari, S.Sos., M.S.E., M.B.A., CRGP', 'NSBDSN340', NULL, NULL, true, NULL, 'insert'),
  (541, 'ea9f4db2', 'Dr. Wempi Saputra, S.E., M.P.F.', 'NSBDSN341', NULL, NULL, true, NULL, 'insert'),
  (542, '3c91e40f', 'Prof. Dr. Ir. Jono Mintarto Munandar, M.Sc.', 'NSBDSN342', NULL, NULL, true, NULL, 'insert'),
  (543, 'b6b3b273', 'Dr. Wempi Saputra, S.E., M.P.F.', 'NSBDSN343', NULL, NULL, true, NULL, 'insert'),
  (544, '4c359f83', 'Prof. Dr. Fandy Tjiptono, M.Com., Ph.D.', 'NSBDSN344', NULL, NULL, true, NULL, 'insert'),
  (545, '140bcf6b', 'Prof. Dr. Ir. T. Ezni Balqiah, M.E., M.H.', 'NSBDSN345', NULL, NULL, true, NULL, 'insert'),
  (546, 'dfbd5c0a', 'Prof. Dr. Mahrinasari M.S., S.E., M.Sc', 'NSBDSN346', NULL, NULL, true, NULL, 'insert'),
  (547, 'b3fa17b4', 'Dr. Mushthofa, S.Komp, M.Sc.', 'NSBDSN347', NULL, NULL, true, NULL, 'insert'),
  (548, 'c58e7971', 'Dr. Ir. Syaiful Anwar, M.Sc.', 'NSBDSN348', NULL, NULL, true, NULL, 'insert'),
  (549, '2b02515b', 'Dr. Furqon Syarief Hidayatulloh, S.Ag., M.Pdi.', 'NSBDSN349', NULL, NULL, true, NULL, 'insert'),
  (550, '8fcb2dcc', 'Prof. Dr. Gancar Candra Premananto, SE., MSi.', 'NSBDSN350', NULL, NULL, true, NULL, 'insert'),
  (551, '1651cae6', 'Prof. Dr. Iis Diatin, M.M.', 'NSBDSN351', NULL, NULL, true, NULL, 'insert'),
  (552, 'a07e136b', 'Dr. Ir. Asep Darmansyah, M.Si.', 'NSBDSN352', NULL, NULL, true, NULL, 'insert'),
  (553, '293cf4d1', 'Dr. Edi Supardi, S.E.,M.M.', 'NSBDSN353', NULL, NULL, true, NULL, 'insert'),
  (554, '911302b6', 'Dr. Munadi Herlambang, S.T., M.A.', 'NSBDSN354', NULL, NULL, true, NULL, 'insert'),
  (555, 'f0b0bb3c', 'Dr. Janita Sembiring Meliala, S.E., M.M.', 'NSBDSN355', NULL, NULL, true, NULL, 'insert'),
  (556, '20e35870', 'Rezza Frisma Prisandy, Ph.D.', 'NSBDSN356', NULL, NULL, true, NULL, 'insert'),
  (557, '57991745', 'Dr. Tjahja Muhandri, S.T.P., M.T', 'NSBDSN357', NULL, NULL, true, NULL, 'insert'),
  (558, 'c8c4b89a', 'Dr. Henri Togar Hasiholan Tambunan, S.E., M.A.', 'NSBDSN359', NULL, NULL, true, NULL, 'insert'),
  (559, '0c0abcaa', 'Prof. Dr. Ir. Idat Galih Permana, M.Sc.Agr', 'NSBDSN360', NULL, NULL, true, NULL, 'insert'),
  (560, '4b3907ad', 'Dr. Ir. Audy Joinaldy, S.Pt., MM., M.IP., IPU., ASEAN.Eng', 'NSBDSN361', NULL, NULL, true, NULL, 'insert'),
  (561, 'ea6abc79', 'Chaidate Inchaisri D.V.M., M.Sc., PhD.', 'NSBDSN362', NULL, NULL, true, NULL, 'insert'),
  (562, 'd8048160', 'Dr. Ir. Safriyana, S.T.P., M.Si.', 'NSBDSN363', NULL, NULL, true, NULL, 'insert'),
  (563, '706bead2', 'Prof. Dr. Adi Zakaria Afiff, S.E., M.B.A', 'NSBDSN364', NULL, NULL, true, NULL, 'insert'),
  (564, '72b9c3c4', 'Drs. Sumedi Andono Mulyo, MA. PhD', 'NSBDSN365', NULL, NULL, true, NULL, 'insert'),
  (565, '058a062a', 'Dr. Eko Ruddy Cahyadi, S.Hut, M.M.', 'NSBDSN366', NULL, NULL, true, NULL, 'insert'),
  (566, '18128920', 'Nawangsita Noorardini Winoto, B.Econ, MIntEcon&F', 'NSBDSN367', 'nnwinoto@gmail.com', NULL, true, NULL, 'insert'),
  (567, 'a9636d04', 'Dr. Marissa Malahayati, S.E, M.A.', 'NSBDSN368', NULL, NULL, true, NULL, 'insert'),
  (568, 'e02d0c1b', 'Prof. Dr. Ir. Endar Hasafah Nugrahani, M.S.', 'NSBDSN369', NULL, NULL, true, NULL, 'insert'),
  (569, '41808d5e', 'Prof. Dr. Anita Maharani, S.E., M.M.', 'NSBDSN370', NULL, NULL, true, NULL, 'insert'),
  (570, 'ac127159', 'Dr. Dadang Muljawan Satria, S.T., M.B.A.', 'NSBDSN371', NULL, NULL, true, NULL, 'insert'),
  (571, '65a3f70a', 'Gan Gan Dirgantara, S.T., M.T., M.Sc., Ph.D.', 'NSBDSN372', NULL, NULL, true, NULL, 'insert'),
  (572, 'b5820327', 'Dr. Eng. Ir. Awaluddin Nurmiyanto, S.T., Dipl.E.S., M.Eng.', 'NSBDSN373', NULL, NULL, true, NULL, 'insert'),
  (573, '0ba20819', 'Prof. Dr. Ence Oos Mukhamad Anwas, M.Si.', 'NSBDSN374', NULL, NULL, true, NULL, 'insert'),
  (574, '66017f5b', 'Dr. Sidik Herman S.Sn., M.M.', 'NSBDSN375', NULL, NULL, true, NULL, 'insert'),
  (579, '8577db24', 'Dr. Ir. Agus Siswanto, AAAIJ, AMRP', 'NSBDSN377', NULL, NULL, true, NULL, 'insert'),
  (580, 'a3391f4e', 'Dr. Emrus Sihombing, M.Si.', 'NSBDSN378', NULL, NULL, true, NULL, 'insert'),
  (581, '619afa92', 'Dr. Alfiasari, S.P., M.Si.', 'NSBDSN379', NULL, NULL, true, NULL, 'insert'),
  (2, '41a1bafa', 'Achmad Fadillah, S.E., M.Sc.', 'SBIDSN001', 'achmadfadillah@apps.ipb.ac.id', NULL, false, 'SBIDSN001', 'update'),
  (3, 'd02240cc', 'Agustina Widi Palupiningrum, S.E., M.M.', 'SBIDSN004', 'a.widipalupi@apps.ipb.ac.id', NULL, false, 'SBIDSN004', 'update'),
  (5, '0b60744d', 'Asaduddin Abdullah, B.Sc., M.Sc.', 'SBIDSN009', 'asaduddin.abdullah@apps.ipb.ac.id', NULL, false, 'SBIDSN009', 'update'),
  (6, 'e28e9578', 'Dr. Ir. Idqan Fahmi, M.Ec.', 'SBIDSN013', 'ifahmi@apps.ipb.ac.id', '8121101429', false, 'SBIDSN013', 'update'),
  (8, '632a769c', 'Dra. Alfa Chasanah, M.A.', 'SBIDSN024', 'alfac@apps.ipb.ac.id', NULL, false, 'SBIDSN024', 'update'),
  (9, 'e9c6567e', 'Fithriyyah Shalihati, S.E., M.M.', 'SBIDSN026', 'oktyshalihati@apps.ipb.ac.id', NULL, false, 'SBIDSN026', 'update'),
  (10, '87cda1e9', 'Ir. Lien Herlina, M.Sc.', 'SBIDSN028', 'lienherlina@apps.ipb.ac.id', NULL, false, 'SBIDSN028', 'update'),
  (11, '61d9f380', 'Muchamad Bachtiar S.T.P., M.M.', 'SBIDSN032', 'muchamadbachtiar@apps.ipb.ac.id', NULL, false, 'SBIDSN032', 'update'),
  (12, '26f137af', 'Nyayu Lathifah Tirdasari, S.E., M.S.M.', 'SBIDSN033', 'nyayu.lathifah@apps.ipb.ac.id', NULL, false, 'SBIDSN033', 'update'),
  (13, 'c049835c', 'Dr. Ir. Arif Imam Suroso, M.Sc.', 'SBIDSN034', 'arifimamsuroso@apps.ipb.ac.id', '81906181961', false, 'SBIDSN034', 'update'),
  (14, '90e941a5', 'Dr. Ir. Hartoyo, M.Sc.', 'SBIDSN036', 'hartoyo@apps.ipb.ac.id', '8121105699', false, 'SBIDSN036', 'update'),
  (15, 'a534ee56', 'Prof. Dr. Ir. Rizal Sjarief Sjaiful Nazli, D.E.S.S.', 'SBIDSN040', 'rsyarief@apps.ipb.ac.id', '81394031169', false, 'SBIDSN040', 'update'),
  (16, 'eceef335', 'Raden Isma Anggraini, S.P., M.M.', 'SBIDSN042', 'isma.anggraini@apps.ipb.ac.id', '81317475944', false, 'SBIDSN042', 'update'),
  (17, 'fce6306b', 'Salsa Dilla, S.E., M.Si.', 'SBIDSN043', 'salsadilla@apps.ipb.ac.id', NULL, false, 'SBIDSN043', 'update'),
  (18, 'ac064cd7', 'Suhendi, S.P., M.M.', 'SBIDSN044', 'suhendisb@apps.ipb.ac.id', NULL, false, 'SBIDSN044', 'update'),
  (19, '5ba195e8', 'Annisa Ramadanti, S.E., M.M.', 'SBIDSN002', 'aramadanti@apps.ipb.ac.id', NULL, true, 'SBIDSN008', 'update'),
  (20, 'e9d5ac1b', 'Adhitya Rahmana, S.Pt., M.M.', 'SBIDSN003', 'adhitya.rahmana@apps.ipb.ac.id', NULL, true, 'SBIDSN003', 'update'),
  (21, '68074455', 'Ani Nuraisyah, S.T.P., M.Si.', 'SBIDSN006', 'anynuraisyah@apps.ipb.ac.id', NULL, true, 'SBIDSN006', 'update'),
  (22, 'c08f8282', 'Anita Primaswari Widhiani, S.P., M.Si.', 'SBIDSN007', 'anitawi@apps.ipb.ac.id', NULL, true, 'SBIDSN007', 'update'),
  (23, '6439f6d9', 'Dr. Asep Taryana, S.T.P., M.M.', 'SBIDSN010', 'kang.astar@apps.ipb.ac.id', NULL, true, 'SBIDSN010', 'update'),
  (24, 'ae8f6ee3', 'Dr. Drs. Yudha Heryawan Asnawi, M.M.', 'SBIDSN011', 'yudha.asnawi@apps.ipb.ac.id', NULL, true, 'SBIDSN011', 'update'),
  (25, 'f965b40f', 'Dr. Ir. Anny Ratnawati, M.S.', 'SBIDSN012', 'aratna@apps.ipb.ac.id', '8121038157', true, 'SBIDSN012', 'update'),
  (26, '5c13761b', 'Dr. Ir. Joyo Winoto, M.Sc.', 'SBIDSN014', 'joyowinoto@apps.ipb.ac.id', '8111173581', true, 'SBIDSN014', 'update'),
  (27, '7e2ce2e6', 'Dr. Ir. Popong Nurhayati, M.M.', 'SBIDSN015', 'popong@apps.ipb.ac.id', NULL, true, 'SBIDSN015', 'update'),
  (28, 'a366bd7e', 'Dr. Ir. Rr. Heny Kuswanti Suwarsinah, M.Ec.', 'SBIDSN016', 'henysu@apps.ipb.ac.id', '8121103262', true, 'SBIDSN016', 'update'),
  (29, 'ae2abe80', 'Dr. Linda Karlina Sari, S.Stat., M.Si.', 'SBIDSN017', 'lindakarlinas@apps.ipb.ac.id', '85353333340', true, 'SBIDSN017', 'update'),
  (30, '98f932da', 'Dr. Nimmi Zulbainarni, S.Pi., M.Si.', 'SBIDSN018', 'nimmizu@apps.ipb.ac.id', NULL, true, 'SBIDSN018', 'update'),
  (31, 'd4f2c0f9', 'Dr. Nur Hasanah, S.Kom., M.Eng.', 'SBIDSN019', 'nur.hasanah@apps.ipb.ac.id', '81289811374', true, 'SBIDSN019', 'update'),
  (32, 'f2cd0935', 'Dr. Raden Dikky Indrawan, S.P., M.M.', 'SBIDSN020', 'rdikky@apps.ipb.ac.id', NULL, true, 'SBIDSN020', 'update'),
  (33, '26fb1d3e', 'Dr. Siti Jahroh, B.Sc., M.Sc.', 'SBIDSN021', 'sitijahro@apps.ipb.ac.id', NULL, true, 'SBIDSN021', 'update'),
  (34, 'f2cd0934', 'Dr. Tanti Novianti, S.P., M.Si.', 'SBIDSN022', 'tantinovianti@apps.ipb.ac.id', NULL, true, 'SBIDSN022', 'update'),
  (35, '041c7082', 'Dr. Zenal Asikin, S.E., M.Si.', 'SBIDSN023', 'zasikin@apps.ipb.ac.id', NULL, true, 'SBIDSN023', 'update'),
  (36, '01d70f2b', 'Febriantina Dewi, S.E., M.M., M.Sc.', 'SBIDSN025', 'febriantinade@apps.ipb.ac.id', '811112982', true, 'SBIDSN025', 'update'),
  (37, '437dc9c0', 'Fuad Wahdan Muhibuddin, S.Pi., M.M.', 'SBIDSN027', 'fuadwahdan@apps.ipb.ac.id', NULL, true, 'SBIDSN027', 'update'),
  (38, 'de5f75b9', 'Ir. Retnaningsih, M.Si.', 'SBIDSN029', 'retno_ikk@apps.ipb.ac.id', NULL, true, 'SBIDSN029', 'update'),
  (39, '5bde69e0', 'Khairiyah Kamilah, S.E., M.Si.', 'SBIDSN030', 'khairiyah-kamilah@apps.ipb.ac.id', '85781255086', true, 'SBIDSN030', 'update'),
  (40, '557843c5', 'Lokita Rizky Megawati, S.Pd., M.M.', 'SBIDSN031', 'lokita.rizky@apps.ipb.ac.id', NULL, true, 'SBIDSN031', 'update'),
  (41, '7028b830', 'Prof. Dr. Ir. Arif Imam Suroso, M.Sc.', 'SBIDSN035', 'arifimamsuroso@apps.ipb.ac.id', '81906181961', true, 'SBIDSN035', 'update'),
  (42, '14d561db', 'Prof. Dr. Ir. Hartoyo, M.Sc.', 'SBIDSN037', 'hartoyo@apps.ipb.ac.id', '8121105699', true, 'SBIDSN037', 'update'),
  (43, '4fd97d1c', 'Prof. Dr. Ir. Mohammad Syamsul Maarif, M.Eng.', 'SBIDSN038', 'msyamsul@apps.ipb.ac.id', '811119705', true, 'SBIDSN038', 'update'),
  (44, '1eac0484', 'Prof. Dr. Ir. Noer Azam Achsani, M.S.', 'SBIDSN039', 'achsani@apps.ipb.ac.id', '81381250476', true, 'SBIDSN039', 'update'),
  (45, '1cf3b506', 'Prof. Dr. Ir. Ujang Sumarwan, M.Sc.', 'SBIDSN041', 'sumarwan@apps.ipb.ac.id', '8121104989', true, 'SBIDSN041', 'update'),
  (46, '526cae50', 'Ade Holis, S.E., M.Si.', 'SBIDSN045', 'holisade@apps.ipb.ac.id', NULL, true, 'SBIDSN045', 'update'),
  (47, 'de399e08', 'Anggi Mayang Sari, S.Si., M.B.A.', 'SBIDSN046', 'anggimayang@apps.ipb.ac.id', NULL, true, 'SBIDSN046', 'update'),
  (48, 'ca763dbd', 'Sendy Watazawwadu''Ilmi, S.E., M.M.', 'SBIDSN047', 'sendywataz@apps.ipb.ac.id', '-', true, 'SBIDSN047', 'update'),
  (49, '9a3951b2', 'Dr. Suhendi, S.P., M.M.', 'SBIDSN048', 'suhendisb@apps.ipb.ac.id', NULL, true, 'SBIDSN048', 'update'),
  (50, '28213694', 'Achmad Fadillah, S.E., M.Sc., Ph.D.', 'SBIDSN049', 'achmadfadillah@apps.ipb.ac.id', NULL, true, 'SBIDSN049', 'update'),
  (51, '424a859c', 'Dr. Asaduddin Abdullah, B.Sc., M.Sc.', 'SBIDSN050', 'asaduddin.abdullah@apps.ipb.ac.id', NULL, true, 'SBIDSN050', 'update'),
  (52, '3bf89879', 'Dr. Raden Isma Anggraini, S.P., M.M.', 'SBIDSN051', 'isma.anggraini@apps.ipb.ac.id', '81317475944', true, 'SBIDSN051', 'update'),
  (53, 'bfeedda4', 'Dr. Fithriyyah Shalihati, S.E., M.M.', 'SBIDSN052', 'oktyshalihati@apps.ipb.ac.id', NULL, true, 'SBIDSN052', 'update'),
  (54, '800d31f0', 'Dr. Muchamad Bachtiar, S.T.P., M.M.', 'SBIDSN053', 'muchamadbachtiar@apps.ipb.ac.id', NULL, true, 'SBIDSN053', 'update'),
  (55, '07b11de5', 'Dr. Agustina Widi Palupiningrum, S.E., M.M.', 'SBIDSN054', 'a.widipalupi@apps.ipb.ac.id', NULL, true, 'SBIDSN054', 'update'),
  (56, '6e024145', 'Dr. Nyayu Lathifah Tirdasari S.E., M.S.M.', 'SBIDSN055', 'nyayu.lathifah@apps.ipb.ac.id', NULL, true, 'SBIDSN055', 'update'),
  (57, '284ad82d', 'Salsa Dilla, S.E., M.Si., Ph.D.', 'SBIDSN056', 'salsadilla@apps.ipb.ac.id', NULL, true, 'SBIDSN056', 'update'),
  (58, '11187940', 'Maulana Agung Wibowo, S.E., M.B.A.', 'SBIDSN057', 'mawibowo@apps.ipb.ac.id', NULL, true, 'SBIDSN057', 'update'),
  (59, '6aab5357', 'Dr. Raden Trizaldi Prima Alamsyah, S.Agr., M.Agr.', 'SBIDSN058', 'rdtrizaldi@apps.ipb.ac.id', NULL, true, 'SBIDSN058', 'update'),
  (60, '3cc575b1', 'Dean Apriana Ramadhan, S.Kom., M.Kom.', 'IPBDSN001', 'deanaprianaramadhan@apps.ipb.ac.id', NULL, true, 'IPBDSN001', 'update'),
  (61, 'f3b927e0', 'Deni Achmad Soeboer, S.Pi., M.Si.', 'IPBDSN002', NULL, NULL, false, 'IPBDSN002', 'update'),
  (62, '7f73198c', 'Dr Alfian Helmi, S.K.Pm., M.Sc.', 'IPBDSN003', 'alfianhelmi@apps.ipb.ac.id', NULL, true, 'IPBDSN003', 'update'),
  (63, '9810d581', 'Dr. Abdul Muin, D.E.A.', 'IPBDSN004', NULL, '8111803543', true, 'IPBDSN004', 'update'),
  (64, '7d832493', 'Dr. Alim Setiawan Slamet, S.TP, M.Si.', 'IPBDSN005', 'alimss@apps.ipb.ac.id', '8121866092', true, 'IPBDSN005', 'update'),
  (65, 'cc4365e5', 'Dr. Asep Nurhalim, Lc., M.Pd.I', 'IPBDSN006', 'asepnu@apps.ipb.ac.id', '081315150768', true, 'IPBDSN006', 'update'),
  (66, '6b345d5e', 'Dr. Bagus Sartono, S.Si., M.Si.', 'IPBDSN007', 'bagusco@apps.ipb.ac.id', '85215231823', true, 'IPBDSN007', 'update'),
  (67, '34547af1', 'Dr. Doni Yusri, S.P., M.M.', 'IPBDSN008', 'doniyusri@apps.ipb.ac.id', NULL, true, 'IPBDSN008', 'update'),
  (68, '1d067477', 'Dr. drh. Trioso Purnawarman, M.Si.', 'IPBDSN009', NULL, NULL, true, 'IPBDSN009', 'update'),
  (69, '18e913fd', 'Dr. Elisa Anggraeni, S.T.P., M.Sc.', 'IPBDSN010', 'elisa_anggraeni@apps.ipb.ac.id', NULL, true, 'IPBDSN010', 'update'),
  (70, 'ab878e44', 'Dr. Fahim Muchammad Taqi, S.T.P., D.E.A.', 'IPBDSN011', NULL, NULL, true, 'IPBDSN011', 'update'),
  (71, '5f26fa70', 'Dr. Farit Mochamad Afendi, S.Si., M.Si.', 'IPBDSN012', NULL, NULL, true, 'IPBDSN012', 'update'),
  (72, 'ac907331', 'Dr. Ing. Dase Hunaefi, S.T.P, M.Food.St', 'IPBDSN013', NULL, NULL, true, 'IPBDSN013', 'update'),
  (73, '070488dc', 'Dr. Ir. Aceng Hidayat, M.T.', 'IPBDSN014', 'acenghidayat@apps.ipb.ac.id', NULL, true, 'IPBDSN014', 'update'),
  (74, '29a8c557', 'Dr. Ir. Adil Basuki Ahza, M.S.', 'IPBDSN015', 'ahzaadil@gmail.com', '81317713889', true, 'IPBDSN015', 'update'),
  (75, '8b1198e0', 'Dr. Ir. Aji Hermawan, M.M.', 'IPBDSN016', NULL, NULL, false, 'IPBDSN016', 'update'),
  (76, 'c1b3f060', 'Dr. Ir. Anggraini Sukmawati, M.M.', 'IPBDSN017', 'anggrainism@apps.ipb.ac.id', '81297979852', true, 'IPBDSN017', 'update'),
  (77, '3272374f', 'Dr. Ir. Basita Ginting Sugihen, M.A.', 'IPBDSN018', NULL, NULL, false, 'IPBDSN018', 'update'),
  (78, 'e8632427', 'Dr. Ir. Budhi Hascaryo Iskandar, M.Si.', 'IPBDSN019', 'budhihascaryo@apps.ipb.ac.id', '8129044621', true, 'IPBDSN019', 'update'),
  (79, '16708078', 'Dr. Ir. Budi Suharjo, M.S.', 'IPBDSN020', 'bsuharjo@apps.ipb.ac.id', '8121115962', true, 'IPBDSN020', 'update'),
  (80, 'c8b6dd22', 'Dr. Ir. Dahrul Syah, M.Sc.Agr.', 'IPBDSN021', NULL, NULL, false, 'IPBDSN021', 'update'),
  (81, '4c9fc77b', 'Dr. Ir. Diah Krisnatuti, M.S.', 'IPBDSN022', 'krisnatuti@apps.ipb.ac.id', '8128351101', true, 'IPBDSN022', 'update'),
  (82, 'bbda4927', 'Dr. Ir. Drajat Martianto, M.Si.', 'IPBDSN023', 'dmartianto@apps.ipb.ac.id', NULL, true, 'IPBDSN023', 'update'),
  (83, '98b945b6', 'Dr. Ir. Edy Hartulistiyoso, M.Sc.Agr.', 'IPBDSN024', 'edyhartulistiyoso@apps.ipb.ac.id', '0812-8715-9171', true, 'IPBDSN024', 'update'),
  (84, '7be0fba8', 'Dr. Ir. Eka Intan Kumala Putri, M.Si.', 'IPBDSN025', 'ekaintan@apps.ipb.ac.id', NULL, true, 'IPBDSN025', 'update'),
  (85, '85273a86', 'Dr. Ir. Erizal, M.Agr.', 'IPBDSN026', 'erizal@apps.ipb.ac.id', '8128067400', true, 'IPBDSN026', 'update'),
  (86, 'db264edd', 'Dr. Ir. Ibnul Qayim', 'IPBDSN027', 'i-qayim@apps.ipb.ac.id', NULL, true, 'IPBDSN027', 'update'),
  (87, '87dec2e5', 'Dr. Ir. Illah Sailah, M.S.', 'IPBDSN028', 'illahsailah@apps.ipb.ac.id', '811167836', false, 'IPBDSN028', 'update'),
  (88, 'e267a0fe', 'Dr. Ir. Iman Sugema, M.Sc.', 'IPBDSN029', NULL, NULL, true, 'IPBDSN029', 'update'),
  (89, 'd7819959', 'Dr. Ir. Istiqlaliyah Muflikhati, M.Si.', 'IPBDSN030', 'istiqlaliyah@apps.ipb.ac.id', '8129517352', true, 'IPBDSN030', 'update'),
  (90, '644543b9', 'Dr. Ir. Meika Syahbana Rusli, M.Sc.Agr.', 'IPBDSN031', 'mrusli@apps.ipb.ac.id', NULL, true, 'IPBDSN031', 'update'),
  (91, '214dfad2', 'Dr. Ir. Netti Tinaprilla, M.M.', 'IPBDSN032', 'tinaprila@gmail.com', '82125159555', true, 'IPBDSN032', 'update'),
  (92, '899acfd9', 'Dr. Ir. Ninuk Purnaningsih, M.Si.', 'IPBDSN033', 'ninukpu@apps.ipb.ac.id', NULL, true, 'IPBDSN033', 'update'),
  (93, '77561fc9', 'Dr. Ir. Ruddy Suwandi, M.S., M.Phil.', 'IPBDSN034', 'rsuwandi@apps.ipb.ac.id', '816636424', true, 'IPBDSN034', 'update'),
  (94, '7ba85d3d', 'Dr. Ir. Setyo Pertiwi, M.Agr.', 'IPBDSN035', 'pertiwi@apps.ipb.ac.id', NULL, true, 'IPBDSN035', 'update'),
  (95, '0e01fca1', 'Dr. Ir. Siti Amanah, M.Sc.', 'IPBDSN036', 'siti_amanah@apps.ipb.ac.id', NULL, true, 'IPBDSN036', 'update'),
  (96, '9a495fa3', 'Dr. Ir. Sugeng Hari Wisudo, M.Sc.', 'IPBDSN037', 'wisudo@apps.ipb.ac.id', NULL, true, 'IPBDSN037', 'update'),
  (97, '5c4c9731', 'Dr. Khalifah Muhammad Ali, S.Hut., M.Si.', 'IPBDSN038', 'khalifahma@apps.ipb.ac.id', '0813-1657-2524', true, 'IPBDSN038', 'update'),
  (98, '4f5b72a2', 'Dr. Laily Dwi Arsyianti, S.E., M.Sc.', 'IPBDSN039', 'arsyianti@apps.ipb.ac.id', NULL, true, 'IPBDSN039', 'update'),
  (99, '3ea6f264', 'Dr. Lukytawati Anggraeni, S.P., M.Si.', 'IPBDSN040', 'lukytawati@apps.ipb.ac.id', '81380006543', true, 'IPBDSN040', 'update'),
  (100, 'fea1785e', 'Dr. Medhanita Dewi Renanti, S.Kom., M.Kom.', 'IPBDSN041', 'medhanita@apps.ipb.ac.id', NULL, true, 'IPBDSN041', 'update'),
  (101, '73a69250', 'Dr. Muhammad Findi Alexandi, S.E., M.Si.', 'IPBDSN042', 'muhammadfindi73@yahoo.com', NULL, true, 'IPBDSN042', 'update'),
  (102, '92dd0aad', 'Dr. Nurmala Katrina Pandjaitan, M.S., D.E.A.', 'IPBDSN043', 'nurmala_katrina@apps.ipb.ac.id', '81288198173', true, 'IPBDSN043', 'update'),
  (103, '34f7b349', 'Dr. rer. nat. Jaenal Effendi, S.Ag., M.A.', 'IPBDSN044', 'jaenalef@apps.ipb.ac.id', NULL, true, 'IPBDSN044', 'update'),
  (104, 'f4c1911f', 'Dr. rer. pol. Mohammad Iqbal Irfany, S.E., M.App.Ec', 'IPBDSN045', 'iqbal.irfany@apps.ipb.ac.id', '082230000125', true, 'IPBDSN045', 'update'),
  (105, 'b696520c', 'Dr. Rico Rizal Budidarmo, S.E., M.B.A.', 'IPBDSN046', 'rico.budidarmo@yahoo.com', NULL, true, 'IPBDSN046', 'update'),
  (106, '892a6a2b', 'Dr. Sahara, S.P., M.Si.', 'IPBDSN047', 'sahara@apps.ipb.ac.id', NULL, true, 'IPBDSN047', 'update'),
  (107, 'ec65d109', 'Dr. Suprehatin, S.P., M.AB.', 'IPBDSN048', 'suprehatin@apps.ipb.ac.id', NULL, true, 'IPBDSN048', 'update'),
  (108, 'cf5aa0e8', 'Dr. Tony Irawan, S.E., M.App.Ec.', 'IPBDSN049', 'tonyirawan@apps.ipb.ac.id', NULL, true, 'IPBDSN049', 'update'),
  (109, 'dc48c566', 'Dr. Utami Dyah Safitri, S.Si., M.Si.', 'IPBDSN050', 'utamids@apps.ipb.ac.id', NULL, true, 'IPBDSN050', 'update'),
  (110, '7e24e497', 'Dr. Yonvitner, S.Pi, M.Si.', 'IPBDSN051', NULL, '81317865610', true, 'IPBDSN051', 'update'),
  (111, '88edd743', 'Dr.rer.pol. Heti Mulyati, S.T.P., M.T.', 'IPBDSN052', 'heti@apps.ipb.ac.id', NULL, true, 'IPBDSN052', 'update'),
  (112, '4e4fc238', 'Dyah Retno Panuju, S.P., M.Si., Ph.D.', 'IPBDSN053', 'panuju@apps.ipb.ac.id', '81315852175', true, 'IPBDSN053', 'update'),
  (113, '31de4aa6', 'Irman Hermadi, S.Kom., M.S., Ph.D.', 'IPBDSN054', 'irmanhermadi@apps.ipb.ac.id', '81514330184', true, 'IPBDSN054', 'update'),
  (114, '702774f0', 'Medria Kusuma Dewi Hardhienata, S.Komp., Ph.D.', 'IPBDSN055', 'medria.hardhienata@apps.ipb.ac.id', NULL, true, 'IPBDSN055', 'update'),
  (115, 'dcbaafd3', 'Prof Dr Ir. Luki Abdullah, M.Sc.Agr.', 'IPBDSN056', 'labdull@apps.ipb.ac.id', NULL, true, 'IPBDSN056', 'update'),
  (116, '5ebf7a30', 'Prof. Dr. Alla Asmara, S.Pt., M.Si.', 'IPBDSN057', 'allasmara@apps.ipb.ac.id', NULL, true, 'IPBDSN057', 'update'),
  (117, '7bca8a98', 'Prof. Dr. Amzul Rifin, S.P., M.A.', 'IPBDSN058', 'amzul@apps.ipb.ac.id', '81318882045', true, 'IPBDSN058', 'update'),
  (118, 'd03a553c', 'Prof. Dr. Arif Satria, S.P., M.Si.', 'IPBDSN059', 'arifsatria@apps.ipb.ac.id', '8121102455', true, 'IPBDSN059', 'update'),
  (119, 'a1588293', 'Prof. Dr. Didin S. Damanhuri, S.E., M.S., D.E.A.', 'IPBDSN060', NULL, NULL, false, 'IPBDSN060', 'update'),
  (120, 'e6178cad', 'Prof. Dr. Drs. Endriatmo Soetarto, M.A.', 'IPBDSN061', NULL, NULL, true, 'IPBDSN061', 'update'),
  (121, '969a74b0', 'Prof. Dr. Endang Warsiki, S.T.P., M.Si.', 'IPBDSN062', 'endangwarsiki@apps.ipb.ac.id', '81219550337', true, 'IPBDSN062', 'update'),
  (122, 'dda77bd0', 'Prof. Dr. Erizal Jamal, M.Si.', 'IPBDSN063', NULL, NULL, true, 'IPBDSN063', 'update'),
  (123, '94d76da8', 'Prof. Dr. I.r Muladno, M.S.A.', 'IPBDSN064', NULL, NULL, true, 'IPBDSN064', 'update'),
  (124, '9cc2759e', 'Prof. Dr. Imas Sukaesih Sitanggang, S.Si., M.Kom.', 'IPBDSN065', 'imas.sitanggang@gmail.com', '81296790105', true, 'IPBDSN065', 'update'),
  (125, '07292af5', 'Prof. Dr. Ir. Agus Buono, M.Si., M.Kom.', 'IPBDSN066', 'agusbuono@apps.ipb.ac.id', NULL, true, 'IPBDSN066', 'update'),
  (126, '6fd15079', 'Prof. Dr. Ir. Agus Purwito, MSc.Agr.', 'IPBDSN067', 'apurwito@apps.ipb.ac.id', '811116228', true, 'IPBDSN067', 'update'),
  (127, '94805367', 'Prof. Dr. Ir. Ahmad Sulaeman, M.S.', 'IPBDSN068', 'asulaeman@apps.ipb.ac.id', NULL, true, 'IPBDSN068', 'update'),
  (128, 'fb6d1111', 'Prof. Dr. Ir. Aida Vitayala Sjafri Hubeis, M.Sc.', 'IPBDSN069', NULL, '811111828', false, 'IPBDSN069', 'update'),
  (129, 'ad8ee249', 'Prof. Dr. Ir. Aman Wirakartakusumah Hrm, M.Sc.', 'IPBDSN070', NULL, NULL, true, 'IPBDSN070', 'update'),
  (130, '8824b88a', 'Prof. Dr. Ir. Anas Miftah Fauzi, M.Eng.', 'IPBDSN071', 'amfauzi@apps.ipb.ac.id', '811118508', true, 'IPBDSN071', 'update'),
  (131, '1cf3be62', 'Prof. Dr. Ir. Arief Darjanto, M.Ec.', 'IPBDSN072', 'adaryant@apps.ipb.ac.id', '8129997947', false, 'IPBDSN072', 'update'),
  (132, '67ee99a4', 'Prof. Dr. Ir. Ario Damar, M.Si.', 'IPBDSN073', 'adamar@apps.ipb.ac.id', NULL, true, 'IPBDSN073', 'update'),
  (133, 'e9878ec5', 'Prof. Dr. Ir. Arya Hadi Dharmawan, M.Sc.Agr.', 'IPBDSN074', 'adharma@apps.ipb.ac.id', '8121100088', true, 'IPBDSN074', 'update'),
  (134, '79e8351a', 'Prof. Dr. Ir. Asep Saefuddin, M.Sc.', 'IPBDSN075', NULL, '811119287', true, 'IPBDSN075', 'update'),
  (135, '6bcc75d3', 'Prof. Dr. Ir. Bambang Juanda, M.S.', 'IPBDSN076', 'bjuanda@apps.ipb.ac.id', '818942853', true, 'IPBDSN076', 'update'),
  (136, 'da1d258b', 'Prof. Dr. Ir. Bonar Marulitua Sinaga, M.A.', 'IPBDSN077', NULL, '8129401507', false, 'IPBDSN077', 'update'),
  (137, 'cfac3d24', 'Prof. Dr. Ir. Budi Setiawan, M.S.', 'IPBDSN078', 'bsetiawan@apps.ipb.ac.id', '8128095084', true, 'IPBDSN078', 'update'),
  (138, '779332b3', 'Prof. Dr. Ir. Bunasor, M.Sc.', 'IPBDSN079', 'bunasorsanim@yahoo.com', '811110415', true, 'IPBDSN079', 'update'),
  (139, '57042142', 'Prof. Dr. Ir. Dadang Sukandar, M.Sc.', 'IPBDSN080', NULL, '85216395342', false, 'IPBDSN080', 'update'),
  (140, 'ed372148', 'Prof. Dr. Ir. Dedi Budiman Hakim, M.A.Ec.', 'IPBDSN081', 'dbhakim@apps.ipb.ac.id', '8.95702E+11', true, 'IPBDSN081', 'update'),
  (142, '0ab9a406', 'Prof. Dr. Ir. Dodik Ridho Nurrochmat, M.Sc.F.Trop.', 'IPBDSN082', 'dnurrochmat@apps.ipb.ac.id', '81212145223', true, 'IPBDSN082', 'update'),
  (143, '701e0e37', 'Prof. Dr. Ir. Dominicus Savio Priyarsono, M.S.', 'IPBDSN083', 'priyarsono@apps.ipb.ac.id', '8129905627', true, 'IPBDSN083', 'update'),
  (144, '8b55a862', 'Prof. Dr. Ir. Dwi Rachmina, M.Si.', 'IPBDSN084', 'd_rachmina@apps.ipb.ac.id', '811137961', true, 'IPBDSN084', 'update'),
  (145, '0ea71b4c', 'Prof. Dr. Ir. EKS. Harini Muntasib', 'IPBDSN085', NULL, NULL, false, 'IPBDSN085', 'update'),
  (146, 'b6f57199', 'Prof. Dr. Ir. Endang Gumbira, MA.Dev.', 'IPBDSN086', NULL, NULL, false, 'IPBDSN086', 'update'),
  (147, '46982d6d', 'Prof. Dr. Ir. Eriyatno, MSAE.', 'IPBDSN087', NULL, '81312471708', true, 'IPBDSN087', 'update'),
  (148, 'ff8c09a0', 'Prof. Dr. Ir. Ernan Rustiadi, M.Agr.', 'IPBDSN088', 'ernanrustiadi@apps.ipb.ac.id', NULL, true, 'IPBDSN088', 'update'),
  (149, '2857402f', 'Prof. Dr. Ir. Etty Riani, M.S.', 'IPBDSN089', NULL, NULL, true, 'IPBDSN089', 'update'),
  (150, '0338d7c4', 'Prof. Dr. Ir. Euis Sunarti, M.S.', 'IPBDSN090', 'euisnm@apps.ipb.ac.id', '81316889858', true, 'IPBDSN090', 'update'),
  (151, 'aa67123f', 'Prof. Dr. Ir. Fredinan Yulianda, M.Sc.', 'IPBDSN091', 'fredinan@apps.ipb.ac.id', NULL, true, 'IPBDSN091', 'update'),
  (152, 'f53b06e9', 'Prof. Dr. Ir. Hadikarya Purwadaria, M.Sc.', 'IPBDSN092', NULL, '8129579098', true, 'IPBDSN092', 'update'),
  (153, 'd0f11197', 'Prof. Dr. Ir. H. Hardinsyah, M.S.', 'IPBDSN093', 'hardinsyah@apps.ipb.ac.id', NULL, true, 'IPBDSN093', 'update'),
  (154, '471b2f00', 'Prof. Dr. Ir. Hari Wijayanto, M.Si.', 'IPBDSN094', 'hari@apps.ipb.ac.id', '8128094483', true, 'IPBDSN094', 'update'),
  (155, '6c3a6043', 'Prof. Dr. Ir. Harianto, M.S.', 'IPBDSN095', 'harianto@apps.ipb.ac.id', '8121107598', true, 'IPBDSN095', 'update'),
  (156, 'da23f299', 'Prof. Dr. Ir. Hartrisari Hardjomidjojo, D.E.A.', 'IPBDSN096', 'hartrisari@apps.ipb.ac.id', NULL, true, 'IPBDSN096', 'update'),
  (157, '7a5fba31', 'Prof. Dr. Ir. Hermanto Siregar, M.Ec.', 'IPBDSN097', 'hsiregar@apps.ipb.ac.id', '8129586498', true, 'IPBDSN097', 'update'),
  (159, '45dab24e', 'Prof. Dr. Ir. Herry Suhardiyanto, M.Sc.', 'IPBDSN099', NULL, '8111123579', true, 'IPBDSN099', 'update'),
  (160, '393686cd', 'Prof. Dr. Ir. I Made Sumertajaya, M.Si.', 'IPBDSN100', 'imsjaya@apps.ipb.ac.id', '8129005455', true, 'IPBDSN100', 'update'),
  (161, '83bd1c2b', 'Prof. Dr. Ir. Illah Sailah, M.S.', 'IPBDSN101', 'illahsailah@apps.ipb.ac.id', '811167836', true, 'IPBDSN101', 'update'),
  (162, 'fe32cc5f', 'Prof. Dr. Ir. Iskandar Z. Siregar, M.For.Sc, IPU, ASEAN Eng', 'IPBDSN102', 'siregar@apps.ipb.ac.id', NULL, true, 'IPBDSN102', 'update'),
  (163, '212c54e1', 'Prof. Dr. Ir. Kudang Boro Seminar, M.Sc.', 'IPBDSN103', 'kseminar@apps.ipb.ac.id', '8164834625', true, 'IPBDSN103', 'update'),
  (164, 'cf82b458', 'Prof. Dr. Ir. Lilik Noor Yuliati, M.F.S.A.', 'IPBDSN104', 'lilikny@apps.ipb.ac.id', '8128520048', true, 'IPBDSN104', 'update'),
  (165, '6f934293', 'Prof. Dr. Ir. Lukman Mohammad Baga, M.A.E.', 'IPBDSN105', 'lukmanba@apps.ipb.ac.id', '82127677565', true, 'IPBDSN105', 'update'),
  (166, '04e72ca9', 'Prof. Dr. Ir. Luky Adrianto, M.Sc.', 'IPBDSN106', 'lukyadrianto@apps.ipb.ac.id', NULL, true, 'IPBDSN106', 'update'),
  (167, 'e396fb3e', 'Prof. Dr. Ir. M. Faiz Syuaib, M.Agr.', 'IPBDSN107', NULL, NULL, true, 'IPBDSN107', 'update'),
  (168, '55793f43', 'Prof. Dr. Ir. Machfud, M.S.', 'IPBDSN108', NULL, '8121102437', true, 'IPBDSN108', 'update'),
  (169, 'e5ce097a', 'Prof. Dr. Ir. Made Astawan, M.S.', 'IPBDSN109', NULL, NULL, true, 'IPBDSN109', 'update'),
  (170, '02e90661', 'Prof. Dr. Ir. Manuntun Parulian Hutagaol, M.S.', 'IPBDSN110', NULL, '81808379040', true, 'IPBDSN110', 'update'),
  (171, '7be126d9', 'Prof. Dr. Ir. Marimin, M.Sc.', 'IPBDSN111', 'marimin@apps.ipb.ac.id', '81384125390', true, 'IPBDSN111', 'update'),
  (172, 'f7255c19', 'Prof. Dr. Ir. Muhammad Achmad Chozin, M.Agr.', 'IPBDSN112', NULL, NULL, true, 'IPBDSN112', 'update'),
  (173, '7a768cab', 'Prof. Dr. Ir. Musa Hubeis, M.S., Dipl.Ing., D.E.A.', 'IPBDSN113', NULL, '811119424', false, 'IPBDSN113', 'update'),
  (174, '99a10b6a', 'Prof. Dr. Ir. Nahrowi, M.Sc.', 'IPBDSN114', 'nahrowi@apps.ipb.ac.id', NULL, true, 'IPBDSN114', 'update'),
  (175, '8b79593c', 'Prof. Dr. Ir. Nastiti Siswi Indrasti', 'IPBDSN115', 'nastitis@apps.ipb.ac.id', NULL, true, 'IPBDSN115', 'update'),
  (176, 'e3192762', 'Prof. Dr. Ir. Pudji Muljono, M.Si.', 'IPBDSN116', 'pudjim@apps.ipb.ac.id', NULL, true, 'IPBDSN116', 'update'),
  (177, '465142d7', 'Prof. Dr. Ir. R. Nunung Nuryartono, M.Si.', 'IPBDSN117', NULL, '81380892639', true, 'IPBDSN117', 'update'),
  (178, 'e3575203', 'Prof. Dr. Ir. Rachmat Pambudy, M.Sc.', 'IPBDSN118', NULL, '6.28788E+12', true, 'IPBDSN118', 'update'),
  (179, 'b26d3281', 'Prof. Dr. Ir. Rina Oktaviani, M.S.', 'IPBDSN119', NULL, NULL, false, 'IPBDSN119', 'update'),
  (180, '658eb987', 'Prof. Dr. Ir. Rita Nurmalina, M.S.', 'IPBDSN120', 'ritanurmalina@apps.ipb.ac.id', '811187265', true, 'IPBDSN120', 'update'),
  (181, 'b1361e23', 'Prof. Dr. Ir. Rokhani, M.Si.', 'IPBDSN121', 'rokhani@apps.ipb.ac.id', NULL, true, 'IPBDSN121', 'update'),
  (182, '72a8a7ee', 'Prof. Dr. Ir. Sukardi, M.M.', 'IPBDSN122', 'sukardi@apps.ipb.ac.id', '81316067491', true, 'IPBDSN122', 'update'),
  (183, 'f2b2d5cb', 'Prof. Dr. Ir. Sumardjo, M.S.', 'IPBDSN123', 'sumardjo@apps.ipb.ac.id', '8129054519', true, 'IPBDSN123', 'update'),
  (184, '5c790b05', 'Prof. Dr. Ir. Tajuddin Bantacut, M.Sc.', 'IPBDSN124', NULL, NULL, false, 'IPBDSN124', 'update'),
  (185, '6d971b34', 'Prof. Dr. Ir. Tb. Sjafri Mangkuprawira', 'IPBDSN125', NULL, NULL, false, 'IPBDSN125', 'update'),
  (186, '2294a35b', 'Prof. Dr. Ir. Tridoyo Kusumastanto, M.S.', 'IPBDSN126', 'prof.tridoyo@gmail.com', '8161133170', true, 'IPBDSN126', 'update'),
  (187, '600ee881', 'Prof. Dr. Ir. Yandra, M.Eng.', 'IPBDSN127', 'yandra@apps.ipb.ac.id', '87876962865', true, 'IPBDSN127', 'update'),
  (188, 'bf8b2fb2', 'Prof. Dr. Ir. Yonny Koesmaryono, M.S.', 'IPBDSN128', 'yonny@apps.ipb.ac.id', '811116669', true, 'IPBDSN128', 'update'),
  (189, '204c8a39', 'Prof. Dr. Ir. Yusman, M.Ec.', 'IPBDSN129', 'ysyaukat@apps.ipb.ac.id', '81310982477', true, 'IPBDSN129', 'update'),
  (190, '2dfa949d', 'Prof. Dr. Irfan Syauqi Beik, S.P., M.Sc.Ec.', 'IPBDSN130', 'irfan_beik@apps.ipb.ac.id', '81385556100', true, 'IPBDSN130', 'update'),
  (191, '1e88151c', 'Prof. Dr. Megawati Simanjuntak, S.P., M.Si.', 'IPBDSN131', 'mega_juntak@apps.ipb.ac.id', NULL, true, 'IPBDSN131', 'update'),
  (192, '6c85fd6a', 'Prof. Dr. Muhammad Firdaus, S.P., M.Si.', 'IPBDSN132', 'mfirdaus@apps.ipb.ac.id', '8129291996', true, 'IPBDSN132', 'update'),
  (193, '89617b8a', 'Prof. Dr. Mukhamad Najib, S.T.P., M.M.', 'IPBDSN133', 'najib@apps.ipb.ac.id', '81908897040', true, 'IPBDSN133', 'update'),
  (194, '533a12c7', 'Prof. Dr. Ono Suparno, S.T.P., M.T.', 'IPBDSN134', 'ono.suparno@apps.ipb.ac.id', NULL, true, 'IPBDSN134', 'update'),
  (195, '76efb00c', 'Prof. Dr. rer. nat. Jaenal Effendi, S.Ag., M.A.', 'IPBDSN135', 'jaenalef@apps.ipb.ac.id', NULL, true, 'IPBDSN135', 'update'),
  (196, '44c4804a', 'Prof. Dr. Rer. Nat. Kustiariyah, S.Pi, M.Si.', 'IPBDSN136', NULL, NULL, true, 'IPBDSN136', 'update'),
  (197, 'b1c853ca', 'Prof. Dr. Soegeng Soetedjo, Ak, C.A., C.Fr.A.', 'IPBDSN137', NULL, NULL, true, 'IPBDSN137', 'update'),
  (198, '9ec0be27', 'Prof. Dr. Taufik, S.T.P., M.Si.', 'IPBDSN138', 'taufikdjatna@apps.ipb.ac.id', '81319726435', true, 'IPBDSN138', 'update'),
  (199, 'a1a7845b', 'Prof. Dr. Toni Bakhtiar, S.Si., M.Sc.', 'IPBDSN139', 'tbakhtiar@apps.ipb.ac.id', '85925056951', true, 'IPBDSN139', 'update'),
  (200, '61d782de', 'Prof. Dr. Drs. Didin Hafidhuddin Maturidi, M.S.', 'NSBDSN001', 'hafidhuddin@yahoo.com', '811119833', true, 'NSBDSN001', 'update'),
  (201, 'cf7c8527', 'Agus Gunawan, Ph.D.', 'NSBDSN002', 'agus_gun@unpar.ac.id', '8122389023', false, 'NSBDSN002', 'update'),
  (202, '88cfcdc2', 'Ascarya, M.Sc., M.B.A., Ph.D.', 'NSBDSN003', NULL, NULL, true, 'NSBDSN003', 'update'),
  (203, '96330baa', 'Budi Waluyo, PhD.', 'NSBDSN004', 'budiwaluyo@pknstan.ac.id', '081315428494', true, 'NSBDSN004', 'update'),
  (204, 'c46bd1ef', 'Dr Etty Susilowati, S.E., M.M.', 'NSBDSN005', 'ettyrianiharsono@gmail.com', NULL, true, 'NSBDSN005', 'update'),
  (205, '2d4c6b32', 'Dr Ningky Sasanti Munir MBA', 'NSBDSN006', 'ningkymunir@gmail.com', '08129185822', true, 'NSBDSN006', 'update'),
  (206, '839e65cf', 'Dr. Aang Munawar, S.E., M.M.', 'NSBDSN007', NULL, NULL, true, 'NSBDSN007', 'update'),
  (207, '604d9fa3', 'Dr. Achmad Firdaus, M.Si.', 'NSBDSN008', 'achmad.firdaus@tazkia.ac.id', NULL, true, 'NSBDSN008', 'update'),
  (208, '3efd6ba3', 'Dr. Agung Firman Sampurna, S.E., M.Si., C.S.F.A., C.Fr.A., C.G.C.A.E., Q.G.I.A.', 'NSBDSN009', NULL, '81289053045', true, 'NSBDSN009', 'update'),
  (209, '2a438b1f', 'Dr. Agung Firman Sampurna, S.E.., M.Si., CSFA., CFrA., CGCAE., QGIA.', 'NSBDSN010', NULL, NULL, true, 'NSBDSN010', 'update'),
  (210, 'b43c25a5', 'Dr. Agus Masrianto, S. Si., M.M', 'NSBDSN011', NULL, NULL, true, 'NSBDSN011', 'update'),
  (211, 'f53d212a', 'Dr. Agus Riyanto, S.E., M.M.', 'NSBDSN012', 'agusriyanto.ipb@gmail.com', '8129216251', true, 'NSBDSN012', 'update'),
  (212, 'c32fe1f8', 'Dr. Agus Salim, S.Si, MM, CFA', 'NSBDSN013', 'agussalim09@gmail.com', '62811990573', true, 'NSBDSN013', 'update'),
  (213, '7491d743', 'Dr. Andi Tenrisau, S.H., M.Hum.', 'NSBDSN014', 'andi.tenrisau@atrbpn.go.id', '82118882288', true, 'NSBDSN014', 'update'),
  (214, 'aa1353bd', 'Dr. Annies Said Basalamah, M.B.A., C.A.', 'NSBDSN015', NULL, NULL, true, 'NSBDSN015', 'update'),
  (215, '24526c94', 'Dr. Antar M. T. Sianturi, Ak, M.B.A.', 'NSBDSN016', NULL, NULL, true, 'NSBDSN016', 'update'),
  (216, '9ec29194', 'Dr. Antonius Alijoyo, S.E., M.M., M.B.A.', 'NSBDSN017', NULL, NULL, true, 'NSBDSN017', 'update'),
  (217, '071fcb58', 'Dr. Arief Ramadhan, S.Kom, M.Si.', 'NSBDSN018', NULL, NULL, false, 'NSBDSN018', 'update'),
  (218, 'cdc3e6ab', 'Dr. Arief Tri Hardiyanto, Ak, C.M.A., M.B.A.', 'NSBDSN019', NULL, NULL, true, 'NSBDSN019', 'update'),
  (219, 'b07cc353', 'Dr. Arry Ekananta, S.T., M.Si.', 'NSBDSN020', 'aekananta@gmail.com', NULL, true, 'NSBDSN020', 'update'),
  (220, '795c3d2d', 'Dr. Aulijati Wachjudiningsih, M.M.', 'NSBDSN021', NULL, NULL, true, 'NSBDSN021', 'update'),
  (221, '7d406594', 'Dr. Aviliani, S.E., M.Si.', 'NSBDSN022', 'aviliani@yahoo.com', '818491728', true, 'NSBDSN022', 'update'),
  (222, '14a21f4e', 'Dr. Bagus Putu Y. K., M.P.', 'NSBDSN023', NULL, NULL, true, 'NSBDSN023', 'update'),
  (223, '8937337f', 'Dr. Bambang Indriyanto', 'NSBDSN024', NULL, NULL, true, 'NSBDSN024', 'update'),
  (224, 'eb776c09', 'Dr. Bayu Bandono, S.E., M.M.', 'NSBDSN025', NULL, NULL, true, 'NSBDSN025', 'update'),
  (225, 'e03a318c', 'Dr. Budi Yulianto, S,E., M,Si.', 'NSBDSN026', NULL, '87876766005', true, 'NSBDSN026', 'update'),
  (226, '47f5e01c', 'Dr. Catur Sarwanto, S.Pt., M.Si.', 'NSBDSN027', NULL, NULL, true, 'NSBDSN027', 'update'),
  (227, '49f2f4ae', 'Dr. Cindy Rianti Priadi, S.T., M.Sc.', 'NSBDSN028', 'cindy.priadi@eng.ui.ac.id', '82297703798', true, 'NSBDSN028', 'update'),
  (228, 'e4a36696', 'Dr. Darsono', 'NSBDSN029', NULL, NULL, true, 'NSBDSN029', 'update'),
  (229, 'cf27cb9f', 'Dr. Didit Herdiawan, M.B.A.', 'NSBDSN030', NULL, NULL, true, 'NSBDSN030', 'update'),
  (230, 'b6e9defd', 'Dr. Dra. Agusdini Banun Saptaningsih, Apt., M.A.R.S.', 'NSBDSN031', NULL, NULL, true, 'NSBDSN031', 'update'),
  (231, 'd2e767ac', 'Dr. drh. Bambang Ngaji Utomo, M.Sc.', 'NSBDSN032', NULL, NULL, true, 'NSBDSN032', 'update'),
  (232, 'b9a9e7c7', 'Dr. drh. Chaerul Basri, M.Epid.', 'NSBDSN033', 'chaerul@apps.ipb.ac.id', '81298329950', true, 'NSBDSN033', 'update'),
  (233, 'bd293123', 'Dr. Drs Komar Sutria, M.Si.', 'NSBDSN034', NULL, NULL, true, 'NSBDSN034', 'update'),
  (234, '4f84fa9b', 'Dr. Drs Moch. Hadi Santoso , MM', 'NSBDSN035', 'santosohadi57@gmail.com', NULL, true, 'NSBDSN035', 'update'),
  (235, '18a39529', 'Dr. Drs. Sukiswo Dirdjosuparto', 'NSBDSN036', NULL, NULL, true, 'NSBDSN036', 'update'),
  (236, '16f7dfed', 'Dr. Dwi Purnomo, S.T.P.,M.T.', 'NSBDSN037', 'dwi.purnomo@unpad.ac.id', '818229580', true, 'NSBDSN037', 'update'),
  (237, '5f7bc340', 'Dr. Dwi Retno Hapsari, S.P., M.Si.', 'NSBDSN038', 'retnokpm@apps.ipb.ac.id', '85216167667', true, 'NSBDSN038', 'update'),
  (238, '514f4c39', 'Dr. Edhy Aruman', 'NSBDSN039', NULL, NULL, true, 'NSBDSN039', 'update'),
  (239, 'a79d68fa', 'Dr. Eko Ruddy Cahyadi, S.Hut., M.M.', 'NSBDSN040', NULL, NULL, true, 'NSBDSN040', 'update'),
  (240, '0f086ada', 'Dr. Eliana Wulandari, SP., MM', 'NSBDSN041', 'eliana.wulandari@unpad.ac.id', '081226326777', true, 'NSBDSN041', 'update'),
  (241, '20a29d17', 'Dr. Enny Sri Hartati', 'NSBDSN042', 'ennysh@gmail.com', '+62 813-1843-8541', true, 'NSBDSN042', 'update'),
  (242, '28d2e9e7', 'Dr. Erwandi Tarmizi, M.A.', 'NSBDSN043', NULL, NULL, true, 'NSBDSN043', 'update'),
  (243, '679f9f0c', 'Dr. Evita H Legowo', 'NSBDSN044', NULL, NULL, true, 'NSBDSN044', 'update'),
  (244, '1aaa41e9', 'Dr. Ezni Balqiah, M.M.', 'NSBDSN045', NULL, NULL, true, 'NSBDSN045', 'update'),
  (245, 'db3ca0f9', 'Dr. Ferry Ardiansyah, STP., M.M.', 'NSBDSN046', NULL, NULL, true, 'NSBDSN046', 'update'),
  (246, '362f3757', 'Dr. Ferry Syarifuddin, S.E., M.A.', 'NSBDSN047', NULL, NULL, true, 'NSBDSN047', 'update'),
  (247, 'e547b289', 'Dr. Gatot Trihargo, Ak., M.A.F.I.S.', 'NSBDSN048', 'gatot.trihargo@gmail.com', '811812262', true, 'NSBDSN048', 'update'),
  (248, '3ac8435f', 'Dr. H. Lukmanul Hakim, M.Si.', 'NSBDSN049', NULL, NULL, true, 'NSBDSN049', 'update'),
  (249, 'a84fb59f', 'Dr. Habibullah Jimad, S.E.,M.Si.', 'NSBDSN050', 'habibullah.jimad@gmail.com', '81367369302', true, 'NSBDSN050', 'update'),
  (250, '2df48055', 'Dr. Halim Alamsyah, S.E., S.H., M.A.', 'NSBDSN051', NULL, NULL, true, 'NSBDSN051', 'update'),
  (251, 'd3cf8b1d', 'Dr. Hanes Riady, M.B.A., M.M.', 'NSBDSN052', NULL, NULL, true, 'NSBDSN052', 'update'),
  (252, '9148db4c', 'Dr. Hariadi Subagja', 'NSBDSN053', NULL, NULL, true, 'NSBDSN053', 'update'),
  (253, '22461c5b', 'Dr. Harri Kuswanda, S.Sos., M.S.M.', 'NSBDSN054', 'hkuswanda1@gmail.com', '81294769432', true, 'NSBDSN054', 'update'),
  (254, 'df89de41', 'Dr. Hendri Tanjung , M.M.', 'NSBDSN055', 'hendri.tanjung@gmail.com', '81387548192', true, 'NSBDSN055', 'update'),
  (255, '1e1c5628', 'Dr. Hendro Sasongko, Ak, M.M., C.A.', 'NSBDSN056', 'hendrosgk@gmail.com', '8567863304', true, 'NSBDSN056', 'update'),
  (257, '717e9b9b', 'Dr. Heru Sukoco, S.Si., M.T.', 'NSBDSN057', NULL, NULL, true, 'NSBDSN057', 'update'),
  (258, '40336b65', 'Dr. Husein Sawit', 'NSBDSN058', NULL, NULL, true, 'NSBDSN058', 'update'),
  (259, 'ce73949b', 'Dr. Ibdalsyah, M.A.', 'NSBDSN059', NULL, NULL, true, 'NSBDSN059', 'update'),
  (260, '7959563e', 'Dr. Iin Mayasari', 'NSBDSN060', NULL, NULL, true, 'NSBDSN060', 'update'),
  (261, '56aad541', 'Dr. Iman Yani Harahap', 'NSBDSN061', 'iyh_020464@yahoo.com', '0812-6218-801', true, 'NSBDSN061', 'update'),
  (262, '7810ac5c', 'Dr. Ir. Achmad Fachrodji, M.M.', 'NSBDSN062', NULL, NULL, true, 'NSBDSN062', 'update'),
  (263, 'db785e88', 'Dr. Ir. Agoes Gunawan', 'NSBDSN063', NULL, NULL, true, 'NSBDSN063', 'update'),
  (264, 'cd3ae1a0', 'Dr. Ir. Agung Primanto Murdanoto, M.Agr.', 'NSBDSN064', NULL, NULL, true, 'NSBDSN064', 'update'),
  (265, 'a75af780', 'Dr. Ir. Agus Justianto, M.Sc.', 'NSBDSN065', NULL, '8129199192', true, 'NSBDSN065', 'update'),
  (266, '17dc0c22', 'Dr. Ir. Agus Maulana, MSM.', 'NSBDSN066', NULL, NULL, true, 'NSBDSN066', 'update'),
  (267, '01e58007', 'Dr. Ir. Ahmad Junaedi, M.Si.', 'NSBDSN067', NULL, NULL, true, 'NSBDSN067', 'update'),
  (268, '6f03c315', 'Dr. Ir. Ahmad Muklis Yusuf, M.M.', 'NSBDSN068', NULL, NULL, true, 'NSBDSN068', 'update'),
  (269, 'fa81f3e1', 'Dr. Ir. Alex Denni, M.M.', 'NSBDSN069', NULL, NULL, true, 'NSBDSN069', 'update'),
  (270, 'f1cfedf9', 'Dr. Ir. Andi Buchari, M.M.', 'NSBDSN070', NULL, NULL, true, 'NSBDSN070', 'update'),
  (271, 'df39476a', 'Dr. Ir. Anita Firmanti, M.T.', 'NSBDSN071', NULL, '817375800', true, 'NSBDSN071', 'update'),
  (272, '8788312e', 'Dr. Ir. Anna Fariyanti, M.Si.', 'NSBDSN072', 'a_fariyanti@yahoo.com', '8128638115', true, 'NSBDSN072', 'update'),
  (273, 'd2fa2b59', 'Dr. Ir. Anna Fatchiya, M.Si.', 'NSBDSN073', NULL, NULL, true, 'NSBDSN073', 'update'),
  (274, '58f7c855', 'Dr. Ir. Anwarudin', 'NSBDSN074', NULL, NULL, true, 'NSBDSN074', 'update'),
  (275, 'c32e8945', 'Dr. Ir. Arief Safari , M.B.A.', 'NSBDSN075', NULL, NULL, true, 'NSBDSN075', 'update'),
  (276, 'e821aa4c', 'Dr. Ir. Aruddy , M.Si.', 'NSBDSN076', 'aruddy2006@gmail.com', NULL, true, 'NSBDSN076', 'update'),
  (277, 'b3e9685b', 'Dr. Ir. Aslam Mei Nur Widigdo, M.M.', 'NSBDSN077', NULL, NULL, true, 'NSBDSN077', 'update'),
  (278, '520e0729', 'Dr. Ir. Asto S Broto, M.Sc.', 'NSBDSN078', NULL, NULL, true, 'NSBDSN078', 'update'),
  (279, 'ea5188f7', 'Dr. Ir. Augustina Kurniasih, M.E.', 'NSBDSN079', NULL, NULL, true, 'NSBDSN079', 'update'),
  (280, '2492dcc1', 'Dr. Ir. Budi Harjono, M.P.', 'NSBDSN080', NULL, NULL, true, 'NSBDSN080', 'update'),
  (281, '98ddf987', 'Dr. Ir. Budi Kuncahyo, M.S.', 'NSBDSN081', NULL, NULL, true, 'NSBDSN081', 'update'),
  (282, '5b1d6fcf', 'Dr. Ir. Burhanuddin, M.M.', 'NSBDSN082', NULL, NULL, true, 'NSBDSN082', 'update'),
  (283, '0eb72d01', 'Dr. Ir. Denny Bernardus Kurnia Wahjudono, M.M.', 'NSBDSN083', 'denny@ciputra.ac.id', NULL, true, 'NSBDSN083', 'update'),
  (284, 'f112ccec', 'Dr. Ir. Djuara P. Lubis, M.S.', 'NSBDSN084', NULL, NULL, true, 'NSBDSN084', 'update'),
  (285, '94a493ab', 'Dr. Ir. Dudi S Hendrawan, M.M.', 'NSBDSN085', NULL, NULL, false, 'NSBDSN085', 'update'),
  (286, 'de723067', 'Dr. Ir. Dwi Asmono A.P.U.', 'NSBDSN086', NULL, NULL, true, 'NSBDSN086', 'update'),
  (287, 'f63f6b7b', 'Dr. Ir. Edi Ihut', 'NSBDSN087', NULL, NULL, true, 'NSBDSN087', 'update'),
  (288, '2e0f60a2', 'Dr. Ir. Endar H. Nugrahani, M.S.', 'NSBDSN088', NULL, NULL, true, 'NSBDSN088', 'update'),
  (289, '6c2b2a70', 'Dr. Ir. Eny Widajati, M.S.', 'NSBDSN089', NULL, NULL, true, 'NSBDSN089', 'update'),
  (290, '8037b473', 'Dr. Ir. Erfiani, M.Si.', 'NSBDSN090', NULL, NULL, true, 'NSBDSN090', 'update'),
  (291, 'ce935108', 'Dr. Ir. Etih Sudarnika, M.Si.', 'NSBDSN091', 'etih23@yahoo.com', NULL, true, 'NSBDSN091', 'update'),
  (292, 'f1218d79', 'Dr. Ir. Eva Z. Yusuf , M.M.', 'NSBDSN092', 'eva.yusuf@myriad-research.com', '81311239672', true, 'NSBDSN092', 'update'),
  (293, 'dcfc52b4', 'Dr. Ir. Fadhil Hasan', 'NSBDSN093', NULL, NULL, true, 'NSBDSN093', 'update'),
  (294, 'd277deee', 'Dr. Ir. Gendut Suprayitno, M.M.', 'NSBDSN094', NULL, NULL, true, 'NSBDSN094', 'update'),
  (295, 'c3c577a7', 'Dr. Ir. H. M. Nadratuzzaman Hosen', 'NSBDSN095', NULL, '8121108595', true, 'NSBDSN095', 'update'),
  (296, '61b4dff6', 'Dr. Ir. H. Radjab Tampubolon', 'NSBDSN096', NULL, NULL, true, 'NSBDSN096', 'update'),
  (297, 'e319c19b', 'Dr. Ir. Handaya, M.M.', 'NSBDSN097', NULL, NULL, true, 'NSBDSN097', 'update'),
  (298, '156bf99a', 'Dr. Ir. Handito Hadi Joewono, M.M.', 'NSBDSN098', 'handito.joewono@gmail.com', '81510410500', true, 'NSBDSN098', 'update'),
  (299, 'e410dca9', 'Dr. Ir. Handyanto Widjojo, M.M.', 'NSBDSN099', NULL, '+62 818-861-147', true, 'NSBDSN099', 'update'),
  (300, '907857c3', 'Dr. Ir. Hari Rujito, M.T.', 'NSBDSN100', NULL, NULL, true, 'NSBDSN100', 'update'),
  (301, 'b865e300', 'Dr. Ir. Henny Nuraini, M.Si.', 'NSBDSN101', NULL, NULL, true, 'NSBDSN101', 'update'),
  (302, '3e7cf82d', 'Dr. Ir. Herien Puspitawati, M.Sc.', 'NSBDSN102', 'herien@apps.ipb.ac.id', '811110920', true, 'NSBDSN102', 'update'),
  (303, '42613fdf', 'Dr. Ir. Imam Teguh Saptono, M.M.', 'NSBDSN103', 'iteguhsaptono@gmail.com', '8561040701', true, 'NSBDSN103', 'update'),
  (304, 'a37881c7', 'Dr. Ir. Indra Iskandar, M.Si.', 'NSBDSN104', NULL, NULL, true, 'NSBDSN104', 'update'),
  (305, 'a7a2b3ad', 'Dr. Ir. Iyung Pahan, M.M.', 'NSBDSN105', NULL, NULL, false, 'NSBDSN105', 'update'),
  (306, 'e5fe557e', 'Dr. Ir. Joko Affandi, S.U.', 'NSBDSN106', NULL, '81213805055', true, 'NSBDSN106', 'update'),
  (307, 'a01cfe91', 'Dr. Ir. Kasutjianingati, M.Si.', 'NSBDSN107', NULL, NULL, true, 'NSBDSN107', 'update'),
  (308, 'c32e46f7', 'Dr. Ir. Kirbrandoko, M.S.M.', 'NSBDSN108', 'denmas.kiko@gmail.com', '8121100287', false, 'NSBDSN108', 'update'),
  (309, '21ceca46', 'Dr. Ir. Krisnani Setyowati', 'NSBDSN109', NULL, NULL, true, 'NSBDSN109', 'update'),
  (310, '2104bddb', 'Dr. Ir. M. Said Didu', 'NSBDSN110', NULL, NULL, true, 'NSBDSN110', 'update'),
  (311, '8cc806c4', 'Dr. Ir. Mohammad Rudy Salahuddin, M.E.M.', 'NSBDSN111', NULL, NULL, true, 'NSBDSN111', 'update'),
  (312, '6d1625ca', 'Dr. Ir. Mualiman D. Hadaad', 'NSBDSN112', NULL, NULL, true, 'NSBDSN112', 'update'),
  (313, '3bb89a63', 'Dr. Ir. Naufal Mahfudz, M.M.', 'NSBDSN113', NULL, '0811-881-773', true, 'NSBDSN113', 'update'),
  (314, 'ef567e64', 'Dr. Ir. Nunung Kusnadi', 'NSBDSN114', NULL, NULL, true, 'NSBDSN114', 'update'),
  (315, '3b13a05c', 'Dr. Ir. Nurahma Tresani, M.M., M.P.M.', 'NSBDSN115', NULL, NULL, true, 'NSBDSN115', 'update'),
  (316, 'dfd4cd5b', 'Dr. Ir. Perdana Wahyu Santosa , M.M.', 'NSBDSN116', 'pwsantosa@gmail.com', '8128969319', true, 'NSBDSN116', 'update'),
  (317, '943dd5bc', 'Dr. Ir. Rr Merry M. D. U., M.P.', 'NSBDSN117', NULL, NULL, true, 'NSBDSN117', 'update'),
  (318, '5c26f0ad', 'Dr. Ir. Sam Herodian, M.S.', 'NSBDSN118', NULL, NULL, true, 'NSBDSN118', 'update'),
  (319, 'a1bdf92d', 'Dr. Ir. Soeryo Adiwibowo, M.S.', 'NSBDSN119', NULL, NULL, true, 'NSBDSN119', 'update'),
  (320, 'fa3cff74', 'Dr. Ir. Sri Gunani Partiwi, M.T.', 'NSBDSN120', NULL, NULL, true, 'NSBDSN120', 'update'),
  (321, '739fee14', 'Dr. Ir. Sri Hartono, M.M.', 'NSBDSN121', NULL, NULL, true, 'NSBDSN121', 'update'),
  (322, '0123f282', 'Dr. Ir. Sri Rahardjo, M.P.M., M.B.A., M.M.', 'NSBDSN122', 'srirahardjosuwito@gmail.com', '816994000', true, 'NSBDSN122', 'update'),
  (323, 'f21d88ef', 'Dr. Ir. Sufrin Hannan , M.M.', 'NSBDSN123', 'sufrin1963@gmail.com', NULL, true, 'NSBDSN123', 'update'),
  (324, '01b02077', 'Dr. Ir. Suharjono, M.P.', 'NSBDSN124', NULL, NULL, true, 'NSBDSN124', 'update'),
  (325, 'fb72584e', 'Dr. Ir. Teddy Rusolono, M.S.', 'NSBDSN125', NULL, NULL, true, 'NSBDSN125', 'update'),
  (326, 'ac69def0', 'Dr. Ir. Titik Sumarti M.C., M.S.', 'NSBDSN126', NULL, NULL, true, 'NSBDSN126', 'update'),
  (327, '73ebae5c', 'Dr. Ir. Tjahjono Herawan, M.Sc.', 'NSBDSN127', NULL, NULL, true, 'NSBDSN127', 'update'),
  (328, '68dafbfa', 'Dr. Ir. Tri Wiji Nurani, M.Si.', 'NSBDSN128', NULL, NULL, true, 'NSBDSN128', 'update'),
  (329, '2cf57765', 'Dr. Ir. Trias Andati, M.Sc., M.M.', 'NSBDSN129', 'trias.andati@gmail.com', '811970217', true, 'NSBDSN129', 'update'),
  (330, '6382aba9', 'Dr. Ir. Tungkot Sipayung, M.S.', 'NSBDSN130', NULL, '0812-1037-414', true, 'NSBDSN130', 'update'),
  (331, '8fd91a1e', 'Dr. Ir. Uhendi Haris, M.Si.', 'NSBDSN131', NULL, NULL, true, 'NSBDSN131', 'update'),
  (332, '004657b2', 'Dr. Ir. Utomo Sarjono Putro', 'NSBDSN132', NULL, NULL, true, 'NSBDSN132', 'update'),
  (333, 'c0421e28', 'Dr. Ir. Yayuk Farida Baliwati, M.S.', 'NSBDSN133', NULL, NULL, true, 'NSBDSN133', 'update'),
  (334, '16969ba9', 'Dr. Ir. Yerki Teguh Basuki, M.B.A.', 'NSBDSN134', NULL, NULL, true, 'NSBDSN134', 'update'),
  (335, 'b8a2495e', 'Dr. Ir. Yeti Lis Purnamadewi, M.Sc.Agr.', 'NSBDSN135', NULL, NULL, true, 'NSBDSN135', 'update'),
  (336, 'eae68262', 'Dr. Ir. Yunus Triyonggo, M.M.', 'NSBDSN136', 'yunus.triyonggo67@gmail.com', NULL, true, 'NSBDSN136', 'update'),
  (337, '34b4051b', 'Dr. Ir. Yurianto, M.A., M.Sc.', 'NSBDSN137', 'yuribpsdm@gmail.com', '8111091995', true, 'NSBDSN137', 'update'),
  (338, 'c6bc66a2', 'Dr. Ir. Zaim Uchrowi, M.D.M.', 'NSBDSN138', 'zaimkultura@gmail.com', NULL, true, 'NSBDSN138', 'update'),
  (339, '99b3d483', 'Dr. Ir. Zeffry Alamsyah, M.M.', 'NSBDSN139', NULL, NULL, true, 'NSBDSN139', 'update'),
  (340, 'c73974ee', 'Dr. Irawan Sumarto, M.Sc.', 'NSBDSN140', NULL, NULL, true, 'NSBDSN140', 'update'),
  (341, '32e3f4c6', 'Dr. Irni Rahmayani Johan, S.P., M.M.', 'NSBDSN141', NULL, NULL, true, 'NSBDSN141', 'update'),
  (342, '8dd19644', 'Dr. Irvandi Gustari, S.E., M.B.A.', 'NSBDSN142', 'Irvandigustari@yahoo.com', '8117043112', true, 'NSBDSN142', 'update'),
  (343, 'a6b97b1b', 'Dr. Irwan Adi Ekaputra', 'NSBDSN143', NULL, NULL, true, 'NSBDSN143', 'update'),
  (344, '7f718cb3', 'Dr. Istiana Maftuchah, SSi., MSi.', 'NSBDSN144', 'istiana.maftuchah@gmail.com', '082122050123', true, 'NSBDSN144', 'update'),
  (345, '7d8c3cb7', 'Dr. Iwan Setiawan, M.Si.', 'NSBDSN145', 'iwan2206.setiawan@gmail.com', '811110378', true, 'NSBDSN145', 'update'),
  (346, 'f638937a', 'Dr. Joko Ratono, S.Si., M.P.', 'NSBDSN146', NULL, NULL, true, 'NSBDSN146', 'update'),
  (347, '59ce5a18', 'Dr. Julie Ekasari, S.Pi., M.Sc.', 'NSBDSN147', NULL, NULL, true, 'NSBDSN147', 'update'),
  (348, '0dcb2f97', 'Dr. Kasutjaningati', 'NSBDSN148', NULL, NULL, true, 'NSBDSN148', 'update'),
  (349, 'af4458a1', 'Dr. Kevin Suryaatmaja, S.Kom, M.M.', 'NSBDSN149', 'kevin.suryaatmaja@binus.ac.id', '81310368682', true, 'NSBDSN149', 'update'),
  (350, '46ff4f62', 'Dr. Koes Pranowo, SE., MSM', 'NSBDSN150', NULL, '81807898383', true, 'NSBDSN150', 'update'),
  (351, 'e4df36e1', 'Dr. Kuntoro Mangkusubroto, M.S.I.E., O.R.', 'NSBDSN151', NULL, NULL, true, 'NSBDSN151', 'update'),
  (352, '0e6a2792', 'Dr. Kusumaningtuti Sandriharmy Soetiono, S.H., L.L.M.', 'NSBDSN152', NULL, NULL, true, 'NSBDSN152', 'update'),
  (353, 'cebbb083', 'Dr. Laksana Tri Handoko, M.Sc.', 'NSBDSN153', NULL, NULL, true, 'NSBDSN153', 'update'),
  (354, 'fd88c121', 'Dr. Lily Sudhartio, M.Sc.', 'NSBDSN154', NULL, NULL, true, 'NSBDSN154', 'update'),
  (355, '732edd4b', 'Dr. LT Handoko, B.Sc., M.Sc.', 'NSBDSN155', NULL, NULL, true, 'NSBDSN155', 'update'),
  (356, '0f5849de', 'Dr. M. Gunawan Alif', 'NSBDSN156', NULL, NULL, true, 'NSBDSN156', 'update'),
  (357, '25c13a39', 'Dr. M. Samsuri, S.Pd., M.T.', 'NSBDSN157', NULL, NULL, true, 'NSBDSN157', 'update'),
  (358, '59f490f0', 'Dr. Majariana Krisanti, S.Pi, M.Si.', 'NSBDSN158', NULL, NULL, true, 'NSBDSN158', 'update'),
  (359, 'c9dbd189', 'Dr. Martua Eliakim Tambunan, S.E., Ak., M.Si.', 'NSBDSN159', NULL, NULL, true, 'NSBDSN159', 'update'),
  (360, '6c2c6e7e', 'Dr. Maya Puspita, M.Si., M.Sc.', 'NSBDSN160', NULL, NULL, true, 'NSBDSN160', 'update'),
  (361, 'ea029550', 'Dr. Mego Pinandito, M.Eng.', 'NSBDSN161', NULL, NULL, true, 'NSBDSN161', 'update'),
  (362, '9d499ae9', 'Dr. Mira Maulida', 'NSBDSN162', 'mira.maulida@ispc-indonesia.org', '81382002233', true, 'NSBDSN162', 'update'),
  (363, 'c01177bf', 'Dr. Moch Doddy Ariefianto, S.E., M.Sc.', 'NSBDSN163', NULL, NULL, true, 'NSBDSN163', 'update'),
  (364, '49f7891e', 'Dr. Mochammad Mukti Ali, S.T., M.M.', 'NSBDSN164', NULL, NULL, true, 'NSBDSN164', 'update'),
  (365, '834adf16', 'Dr. Mujtahid Alfajri', 'NSBDSN165', NULL, NULL, true, 'NSBDSN165', 'update'),
  (366, '44da5e86', 'Dr. Muksin, S.P., M.Si.', 'NSBDSN166', NULL, NULL, true, 'NSBDSN166', 'update'),
  (367, '14188338', 'Dr. Mulya E. Siregar', 'NSBDSN167', 'mesir57@gmail.com', NULL, true, 'NSBDSN167', 'update'),
  (368, 'dd328b8c', 'Dr. Oce Madril, S.H., M.A.', 'NSBDSN168', 'oce.madril@gmail.com', '+62 811-2644-066', true, 'NSBDSN168', 'update'),
  (369, '5c66e48b', 'Dr. Pardomuan Sihombing, M.S.M.', 'NSBDSN169', 'pardomuan_sihombing@yahoo.com', '811886369', true, 'NSBDSN169', 'update'),
  (370, '45b1bf8d', 'Dr. Prita Prasetya, S.Si, M.M.', 'NSBDSN170', 'pritaprasetya@gmail.com', '8123229852', true, 'NSBDSN170', 'update'),
  (371, '701bc387', 'Dr. Purbaya Yudi Sadewa', 'NSBDSN171', NULL, NULL, true, 'NSBDSN171', 'update'),
  (372, '2c87efe6', 'Dr. Purboyo Guritno', 'NSBDSN172', NULL, NULL, true, 'NSBDSN172', 'update'),
  (373, '5b61f593', 'Dr. R. Mahelan Prabantarikso, S.E., M.M.', 'NSBDSN173', 'dr.mahelan@yahoo.com', '0811-967-377', true, 'NSBDSN173', 'update'),
  (374, '58255d1c', 'Dr. Rachma Fitriati, M.Si., M.Si. (Han)', 'NSBDSN174', 'rachma.fitriati@ui.ac.id', '8129699323', true, 'NSBDSN174', 'update'),
  (375, 'e1877f00', 'Dr. rer. pol. Eko Agus Prasetio, S.T., M.B.A.', 'NSBDSN175', 'eko.prasetio@sbm-itb.ac.id', '08112222130', true, 'NSBDSN175', 'update'),
  (376, '8f360418', 'Dr. Rhian Indradewa S.T., M.S.M., C.R.P.', 'NSBDSN176', 'rhian.indradewa@pertamina.com', '8121094095', true, 'NSBDSN176', 'update'),
  (377, '0fcaeccd', 'Dr. Rindra Yusianto, S.Kom., M.T.', 'NSBDSN177', 'rindra@staff.dinus.ac.id', '085740650190', true, 'NSBDSN177', 'update'),
  (378, 'b15e4e09', 'Dr. Rini Setiowati, S.E., M.B.A.', 'NSBDSN178', NULL, NULL, true, 'NSBDSN178', 'update'),
  (379, '1169f3a9', 'Dr. Ririn Wulandari, S.E., M.M.', 'NSBDSN179', 'ririnwulandari99@gmail.com', '8111892555', true, 'NSBDSN179', 'update'),
  (380, 'e52bdbbb', 'Dr. Risnarto, M.S.', 'NSBDSN180', NULL, NULL, true, 'NSBDSN180', 'update'),
  (381, '90a993d6', 'Dr. Rizal Ahmad Fauzi, S.T., M.M.', 'NSBDSN181', NULL, NULL, true, 'NSBDSN181', 'update'),
  (382, '9b35ca21', 'Dr. Rizal, S.P., M.P.', 'NSBDSN182', NULL, NULL, true, 'NSBDSN182', 'update'),
  (383, '90a27e49', 'dr. Rizki Edmi Edison, Ph.D.', 'NSBDSN183', 'rizkiedmiedison@uhamka.ac.id', '81286967487', true, 'NSBDSN183', 'update'),
  (384, '92019847', 'Dr. Roberto Akyuwen, S.T.P., S.E., M.Si.', 'NSBDSN184', NULL, NULL, true, 'NSBDSN184', 'update'),
  (385, '8e180e17', 'Dr. Romie Oktovianus Bura, B.Eng (Hons), M.R.Aes.', 'NSBDSN185', NULL, NULL, true, 'NSBDSN185', 'update'),
  (386, 'e6a07d5a', 'Dr. Rudi Alek Wahyudin, S.Pi., M.Si.', 'NSBDSN186', NULL, NULL, true, 'NSBDSN186', 'update'),
  (387, '640ed390', 'Dr. Sadikin Kuswanto, S.H., M.M., M.Min.', 'NSBDSN187', 'sadikin.kuswanto@yahoo.com', '811144333', true, 'NSBDSN187', 'update'),
  (388, 'e3bc438d', 'Dr. Satyawan Sunito', 'NSBDSN188', NULL, NULL, true, 'NSBDSN188', 'update'),
  (389, '90974ba3', 'Dr. Sekar Wulan Prasetyaningtyas S.Si., M.Pd.', 'NSBDSN189', 'sekarwprasetya@gmail.com', '+62 856-9533-5351', true, 'NSBDSN189', 'update'),
  (390, 'a773e9fb', 'Dr. Setia Diarta, S.T., M.T.', 'NSBDSN190', NULL, NULL, true, 'NSBDSN190', 'update'),
  (391, '8fb0208f', 'Dr. Silverius Y Soeharso, S.Psi., S.E., M.M., Psikolog', 'NSBDSN191', NULL, NULL, true, 'NSBDSN191', 'update'),
  (392, '240ff362', 'Dr. Solikin M. Juhro, S.E., M.A.E., M.A.', 'NSBDSN192', NULL, NULL, true, 'NSBDSN192', 'update'),
  (393, '85fe4f07', 'Dr. Subagio Dwijosumono, S.E., M.A.', 'NSBDSN193', NULL, NULL, true, 'NSBDSN193', 'update'),
  (394, 'cedc69a8', 'Dr. Suharto Honggokusumo, M.Sc.', 'NSBDSN194', NULL, NULL, true, 'NSBDSN194', 'update'),
  (395, 'e1348c1b', 'Dr. Suryani S.F. Motik, M.B.A.', 'NSBDSN195', NULL, NULL, true, 'NSBDSN195', 'update'),
  (396, '3834da58', 'Dr. Suryo Adiwibowo, M.S.', 'NSBDSN196', NULL, NULL, true, 'NSBDSN196', 'update'),
  (397, 'cd0c1431', 'Dr. Sutardjo, S.E., Grad.Dipl., M.Bus., Q.I.A., Q.R.G.P.', 'NSBDSN197', NULL, '81390486363', true, 'NSBDSN197', 'update'),
  (398, '84310d98', 'Dr. Sutaryono, M.Si.', 'NSBDSN198', 'sutaryono@stpn.ac.id', '85866888506', true, 'NSBDSN198', 'update'),
  (399, '76556977', 'Dr. Suwandi, Ak., M.M., C.A.', 'NSBDSN199', 'suwandi@lps.go.id', '8158094938', true, 'NSBDSN199', 'update'),
  (400, 'b91e5bb5', 'Dr. Suwinto Johan, S.E., M.M.', 'NSBDSN200', 'suwintojohan@gmail.com', NULL, true, 'NSBDSN200', 'update'),
  (401, '26adf39c', 'Dr. Syamsul Hidayat Pasaribu, S.E., M.Si.', 'NSBDSN201', NULL, NULL, true, 'NSBDSN201', 'update'),
  (402, '71455292', 'Dr. Sylvia Rozza, S.E., M.M.', 'NSBDSN202', NULL, NULL, true, 'NSBDSN202', 'update'),
  (403, '611e755d', 'Dr. T.S.N.B. Hutabarat, M.M.S.', 'NSBDSN203', 'hutabarat35@yahoo.com', '+62 811-149-784', true, 'NSBDSN203', 'update'),
  (404, '4b8a809a', 'Dr. Tantri Kustiari', 'NSBDSN204', NULL, NULL, true, 'NSBDSN204', 'update'),
  (405, 'f8951143', 'Dr. Taryono, S.Pi., M.Si.', 'NSBDSN205', NULL, NULL, true, 'NSBDSN205', 'update'),
  (406, '04d199cd', 'Dr. Teguh Raharjo', 'NSBDSN206', NULL, NULL, true, 'NSBDSN206', 'update'),
  (407, '0d92bbba', 'Dr. Teti Haryati, S.Pd., M.M.', 'NSBDSN207', 'teti.haryati@gmail.com', '+6287770600055', true, 'NSBDSN207', 'update'),
  (408, '3373a73e', 'Dr. Tubagus Haryono, S.Si., S.E., M.M., Ak.', 'NSBDSN208', NULL, '6287880606876', true, 'NSBDSN208', 'update'),
  (409, '2327cf29', 'Dr. Tubagus Nur Ahmad Maulana S.P., M.B.A., M.Sc.', 'NSBDSN209', NULL, NULL, true, 'NSBDSN209', 'update'),
  (410, 'c43ae185', 'Dr. Ujang Suryadi, M.P.', 'NSBDSN210', NULL, NULL, false, 'NSBDSN210', 'update'),
  (411, '6e38eb89', 'Dr. Wayan R. Susila', 'NSBDSN211', NULL, NULL, true, 'NSBDSN211', 'update'),
  (412, '430633f7', 'Dr. Weni Novandari, S.E., M.M.', 'NSBDSN212', 'weni.novandari@unsoed.ac.id', '6.28123E+11', true, 'NSBDSN212', 'update'),
  (413, 'cbbbd98d', 'Dr. Widigdo Sukarman, M.B.A.', 'NSBDSN213', NULL, NULL, true, 'NSBDSN213', 'update'),
  (414, '6a2f74ca', 'Dr. Widodo Ramadyanto, S.S.T., M.R.M., D.B.A., Ak., C.A.', 'NSBDSN214', 'Widodo.Ramadyanto@kemenkeu.go.id', '8121013783', true, 'NSBDSN214', 'update'),
  (415, '098addd7', 'Dr. Yani Nurhadryani, S.Si., M.T.', 'NSBDSN215', NULL, NULL, true, 'NSBDSN215', 'update'),
  (416, '280229cb', 'Dr. Yopi Nurvita, S.Pi., M.Si.', 'NSBDSN216', NULL, NULL, true, 'NSBDSN216', 'update'),
  (417, 'dbd83f61', 'Dr. Yossi W., S.P., M.P.', 'NSBDSN217', NULL, NULL, true, 'NSBDSN217', 'update'),
  (418, 'e7213f22', 'Dr. Yulizar Sanrego, M.Ec.', 'NSBDSN218', NULL, '81380190710', true, 'NSBDSN218', 'update'),
  (419, '884b39df', 'Dr. Yuswanda A. Temenggung, C.E.S., D.E.A.', 'NSBDSN219', NULL, NULL, true, 'NSBDSN219', 'update'),
  (420, 'f0fea494', 'Dr. Zulkifli Rangkuti, S.E., M.M.', 'NSBDSN220', NULL, NULL, true, 'NSBDSN220', 'update'),
  (421, '7ef694f8', 'Dr.Ir. Salundik, M.Si.', 'NSBDSN221', NULL, NULL, true, 'NSBDSN221', 'update'),
  (422, 'd496447c', 'drh. Desianto B. Utomo, M.S., Ph.D.', 'NSBDSN222', NULL, NULL, true, 'NSBDSN222', 'update'),
  (423, 'c6d7a2df', 'drh. Muhammad Fakhruddin, Ph.D.', 'NSBDSN223', NULL, NULL, true, 'NSBDSN223', 'update'),
  (424, '500eef53', 'Drs. Djoni Tanopruwito, Ak, M.Sc.', 'NSBDSN224', NULL, NULL, true, 'NSBDSN224', 'update'),
  (425, '3c244282', 'Drs. Hamdani M Syah, Ak., M.B.A.', 'NSBDSN225', NULL, NULL, true, 'NSBDSN225', 'update'),
  (426, 'b37580bc', 'Drs. Hendarin Ono Saleh, M.Si.', 'NSBDSN226', NULL, NULL, true, 'NSBDSN226', 'update'),
  (427, 'f032bda1', 'Drs. Nazir Harjanto, M.A., A.P.U.', 'NSBDSN227', NULL, NULL, true, 'NSBDSN227', 'update'),
  (428, '6cf03375', 'Drs. Robin Asad Suryo, M.A., Ph.D.', 'NSBDSN228', NULL, NULL, true, 'NSBDSN228', 'update'),
  (429, 'f90e721d', 'Dwityapoetra Soeyasa Besar, S.H., M.I.A., Ph.D.', 'NSBDSN229', NULL, NULL, true, 'NSBDSN229', 'update'),
  (430, 'e7d21d68', 'Fajar Abhirama Akhsanul Ikhsan S.T.P.', 'NSBDSN230', 'fajarabhirama@gmail.com', '081398609977', true, 'NSBDSN230', 'update'),
  (431, 'a18486e1', 'Frimayudha Ardyaputra, S.E., M.B.A., Ph.D.', 'NSBDSN231', NULL, NULL, true, 'NSBDSN231', 'update'),
  (432, '0d4af900', 'Gajendran Kandasamy, Ph.D', 'NSBDSN232', 'gajkandasamy@gmail.com', '6285814091740', true, 'NSBDSN232', 'update'),
  (433, 'a2eacfe5', 'Herry Nugraha, S.Si., M.M,', 'NSBDSN233', NULL, NULL, true, 'NSBDSN233', 'update'),
  (434, '083a8bd3', 'I Wayan Nuka Lantara, PhD', 'NSBDSN234', NULL, '081239894530', true, 'NSBDSN234', 'update'),
  (435, '1bccdfdc', 'Iding Achmad Haidir, D.Phil, PGDip.IWCP', 'NSBDSN235', NULL, NULL, true, 'NSBDSN235', 'update'),
  (436, '3de3e48a', 'Indra Astrayuda, S.T., M.A., Ph.D.', 'NSBDSN236', 'astrayuda@bi.go.id', '8111971161', true, 'NSBDSN236', 'update'),
  (437, 'f084b715', 'Ir. Andi Ilham Said, M.S.O.M., Ph.D.', 'NSBDSN237', NULL, NULL, true, 'NSBDSN237', 'update'),
  (438, 'f429a985', 'Ir. Ashwin Sasongko Sastrosubroto, M.Sc., Ph.D., I.P.U.', 'NSBDSN238', NULL, NULL, true, 'NSBDSN238', 'update'),
  (439, 'b4e30cfc', 'Ir. Budi Purwanto, M.E.', 'NSBDSN239', NULL, NULL, true, 'NSBDSN239', 'update'),
  (440, 'e748b6b6', 'Ir. Dani Cahya Rukmana, M.B.A.', 'NSBDSN240', NULL, NULL, true, 'NSBDSN240', 'update'),
  (441, 'f42d619b', 'Ir. Dwi Larso, M.S.I.E., Ph.D.', 'NSBDSN241', NULL, '81320271899', true, 'NSBDSN241', 'update'),
  (442, 'd2ec7e0c', 'Ir. Harmini, M.S.', 'NSBDSN242', NULL, NULL, true, 'NSBDSN242', 'update'),
  (443, '46dad906', 'Ir. Heru Bagus Pulunggono, M.Sc.', 'NSBDSN243', NULL, NULL, true, 'NSBDSN243', 'update'),
  (444, 'f3f8834a', 'Ir. I Nyoman Oka Tridjaja, B.Sc., M.App.Sc., Ph.D.', 'NSBDSN244', 'nyoman.tridjaja@gmail.com', '8161392698', true, 'NSBDSN244', 'update'),
  (445, '0a6a2e87', 'Ir. Iwan Taruna Isa, M.Sc.', 'NSBDSN245', NULL, NULL, true, 'NSBDSN245', 'update'),
  (446, '4d5169a8', 'Ir. MD Djamaludin, M.Sc.', 'NSBDSN246', NULL, NULL, true, 'NSBDSN246', 'update'),
  (447, 'f36debf2', 'Ir. Moelyadi, M.M.', 'NSBDSN247', NULL, NULL, true, 'NSBDSN247', 'update'),
  (448, 'eebc1142', 'Ir. Ruslan Prijadi, M.B.A., Ph.D.', 'NSBDSN248', 'ruslan.prijadi@gmail.com', '811909697', true, 'NSBDSN248', 'update'),
  (449, '77b2b4f3', 'Ir. Setiadi Djohar, M.S.M., D.B.A.', 'NSBDSN249', 'sdjohar@gmail.com', '8128869836', true, 'NSBDSN249', 'update'),
  (450, '9a4804d5', 'Ir. Sri Bawono, M.M.', 'NSBDSN250', NULL, NULL, true, 'NSBDSN250', 'update'),
  (451, 'f65180f9', 'Ir. Suyus Windayana, M.App.Sc.', 'NSBDSN251', NULL, NULL, true, 'NSBDSN251', 'update'),
  (452, '0c591634', 'Ir. Tb Nur Ahmad Maulana, M.Sc., M.B.A., Ph.D.', 'NSBDSN252', NULL, NULL, true, 'NSBDSN252', 'update'),
  (453, '57e8f722', 'Jati Waluyo, Ph.D.', 'NSBDSN253', 'jatiw4luyo@gmail.com', '81234565739', true, 'NSBDSN253', 'update'),
  (454, '2c478770', 'Laksamana TNI (Purn) Prof. Dr. Marsetio, S.I.P., M.M.', 'NSBDSN254', NULL, NULL, true, 'NSBDSN254', 'update'),
  (455, 'fcd40a19', 'Laksda TNI (Purn) Prof. Dr. Ir. Supartono, M.M., CIQaR.', 'NSBDSN255', NULL, NULL, true, 'NSBDSN255', 'update'),
  (456, 'a130e9a9', 'Louis Sudarmana, B.Eng, M.Eng.Sc', 'NSBDSN256', NULL, NULL, true, 'NSBDSN256', 'update'),
  (457, '3b118d54', 'MHA Ridhwan, Ph.D.', 'NSBDSN257', 'mha_ridhwan@bi.go.id', '82184834647', true, 'NSBDSN257', 'update'),
  (458, '1a1cf15c', 'Muhammad Hasbi Zaenal, Ph.D.', 'NSBDSN258', NULL, NULL, true, 'NSBDSN258', 'update'),
  (459, 'c71199d3', 'Prof Akhmaloka, Ph.D.', 'NSBDSN259', NULL, '811219637', true, 'NSBDSN259', 'update'),
  (460, 'be984884', 'Prof. (Riset) Dr. Ir. Nurul Taufiqu Rochman, M.Eng., A.P.U., Ph.D.', 'NSBDSN260', NULL, NULL, true, 'NSBDSN260', 'update'),
  (461, '170c6d7e', 'Prof. Ahmad Erani Yustika, S.E., M.Sc., Ph.D.', 'NSBDSN261', NULL, NULL, true, 'NSBDSN261', 'update'),
  (462, '4318f0f8', 'Prof. Ahmad Erani Yustika, S.E., M.Sc., Ph.D.', 'NSBDSN262', NULL, '+62 812-2220-0973', true, 'NSBDSN262', 'update'),
  (463, '20d14a9c', 'Prof. Amalia E. Maulana, Ph.D.', 'NSBDSN263', NULL, '+62 813-8346-0661', true, 'NSBDSN263', 'update'),
  (464, 'c415580c', 'Prof. Brian Yuliarto, S.T., M.Eng., Ph.D.', 'NSBDSN264', NULL, '81312090020', true, 'NSBDSN264', 'update'),
  (465, '2673709f', 'Prof. Dr. Adler Haymans Manurung, CIFM, CIGS, CMA, ERCMP, CIERM, CIMA, CIABV, CIIM', 'NSBDSN265', 'adler.manurung@gmail.com', '81586823367', true, 'NSBDSN265', 'update'),
  (466, '1a479ccd', 'Prof. Dr. Arissetyanto Nugroho, M.M., IPU., CMA., MSS', 'NSBDSN266', 'arissoehardjo01@gmail.com', '0816824269', true, 'NSBDSN266', 'update'),
  (467, '9bf9b656', 'Prof. Dr. Bomer Pasaribu, S.E., S.H., M.S.', 'NSBDSN267', 'bpasaribu@gmail.com', '816980859', true, 'NSBDSN267', 'update'),
  (468, '63231474', 'Prof. Dr. Budi Frensidy, S.E., M.Com.', 'NSBDSN268', NULL, NULL, true, 'NSBDSN268', 'update'),
  (469, '2ea03791', 'Prof. Dr. Chandra Wijaya, M.Si., M.M.', 'NSBDSN269', NULL, NULL, true, 'NSBDSN269', 'update'),
  (470, '9439967e', 'Prof. Dr. drh. Fadjar Satrija, M.Sc.', 'NSBDSN270', NULL, NULL, true, 'NSBDSN270', 'update'),
  (471, '78d56a86', 'Prof. Dr. Eng. Wisnu Ananta Kusuma, S.T., M.T.', 'NSBDSN271', NULL, NULL, true, 'NSBDSN271', 'update'),
  (472, '3d6d0e8e', 'Prof. Dr. H. Havidz Aima, M.S.', 'NSBDSN272', NULL, '811741118', true, 'NSBDSN272', 'update'),
  (473, '914aab52', 'Prof. Dr. H. M Havidz Aima, M.S.', 'NSBDSN273', NULL, NULL, true, 'NSBDSN273', 'update'),
  (474, 'f6f472ab', 'Prof. Dr. Herri Susanto, I.P.M.', 'NSBDSN274', 'herri@che.itb.ac.id', NULL, true, 'NSBDSN274', 'update'),
  (475, '0d8c3ed4', 'Prof. Dr. Ir. Agus W Suhadi, M.S.', 'NSBDSN275', 'aws@pmbs.ac.id', '8128168801', true, 'NSBDSN275', 'update'),
  (476, 'a3db91d8', 'Prof. Dr. Ir. Akhmad Fauzi', 'NSBDSN276', NULL, NULL, true, 'NSBDSN276', 'update'),
  (477, 'd6660369', 'Prof. Dr. Ir. Bambang Prastowo', 'NSBDSN277', NULL, NULL, true, 'NSBDSN277', 'update'),
  (478, '2aa47947', 'Prof. Dr. Ir. Bilson Simamora, M.M.', 'NSBDSN278', NULL, NULL, true, 'NSBDSN278', 'update'),
  (479, '5f1198ee', 'Prof. Dr. Ir. Budi Mulyanto, M.Sc.', 'NSBDSN279', NULL, NULL, true, 'NSBDSN279', 'update'),
  (480, '572ee286', 'Prof. Dr. Ir. Bungaran Saragih, M.Ec.', 'NSBDSN280', NULL, '8128891444', true, 'NSBDSN280', 'update'),
  (481, 'e2b88969', 'Prof. Dr. Ir. Bustanul Arifin, M.S.', 'NSBDSN281', 'barifin@uwalumni.com', '8129401150', true, 'NSBDSN281', 'update'),
  (482, '81b02940', 'Prof. Dr. Ir. Dadan Umar Daihani, D.E.A.', 'NSBDSN282', NULL, NULL, true, 'NSBDSN282', 'update'),
  (483, '853270d7', 'Prof. Dr. Ir. Eko K. Budiardjo, M.Sc.', 'NSBDSN283', 'eko@ui.ac.id', '8118776059', true, 'NSBDSN283', 'update'),
  (484, '07abc8f6', 'Prof. Dr. Ir. Endang Suhendang', 'NSBDSN284', NULL, NULL, true, 'NSBDSN284', 'update'),
  (485, 'f60ea48e', 'Prof. Dr. Ir. Evy Damayanti, M.S.', 'NSBDSN285', NULL, NULL, true, 'NSBDSN285', 'update'),
  (486, '81e16640', 'Prof. Dr. Ir. Heri Purnomo, M.Comp.', 'NSBDSN286', 'h.purnomo@cgiar.org', '8119500641', true, 'NSBDSN286', 'update'),
  (487, '267f71e1', 'Prof. Dr. Ir. Khairil Anwar Notodiputro, M.S.', 'NSBDSN287', NULL, NULL, true, 'NSBDSN287', 'update'),
  (488, 'b7b01876', 'Prof. Dr. Ir. Lala M. Kolopaking, M.S.', 'NSBDSN288', NULL, NULL, true, 'NSBDSN288', 'update'),
  (489, 'ccc287e8', 'Prof. Dr. Ir. Ma''mun Sarma, M.S., M.Ec.', 'NSBDSN289', NULL, NULL, true, 'NSBDSN289', 'update'),
  (490, '6b972730', 'Prof. Dr. Ir. Mangara Tambunan, M.Sc.', 'NSBDSN290', 'mangaratambunan@yahoo.com', '816925205', true, 'NSBDSN290', 'update'),
  (491, '10bdc4bb', 'Prof. Dr. Ir. Roy Sembel , MBA.', 'NSBDSN291', 'roy.sembel@ipmi.ac.id', '818773662', true, 'NSBDSN291', 'update'),
  (492, 'cab44bdd', 'Prof. Dr. Ir. Rudi Wibowo, M.S.', 'NSBDSN292', NULL, NULL, true, 'NSBDSN292', 'update'),
  (493, '133ff084', 'Prof. Dr. Ir. Slamet Budijanto, M.Agr.', 'NSBDSN293', NULL, NULL, true, 'NSBDSN293', 'update'),
  (494, '79fc51db', 'Prof. Dr. Ir. Sobir, M.Si.', 'NSBDSN294', NULL, NULL, true, 'NSBDSN294', 'update'),
  (495, '1340edca', 'Prof. Dr. Ir. Sri Hartojo, M.S.', 'NSBDSN295', 'shty@indo.net.id', '8161391460', true, 'NSBDSN295', 'update'),
  (496, '4b4e1835', 'Prof. Dr. Ir. Sri Nurdiati, M.Sc.', 'NSBDSN296', NULL, NULL, true, 'NSBDSN296', 'update'),
  (497, '4895f37f', 'Prof. Dr. Ir. Sudradjat, M.S.', 'NSBDSN297', NULL, NULL, true, 'NSBDSN297', 'update'),
  (498, 'f84288e2', 'Prof. Dr. Ir. Teuku Yuri M. Zagloel, M.Eng.Sc.', 'NSBDSN298', NULL, NULL, true, 'NSBDSN298', 'update'),
  (499, '1d3be053', 'Prof. Dr. Ir. Titi Candra Sunarti, M.Si.', 'NSBDSN299', NULL, NULL, true, 'NSBDSN299', 'update'),
  (500, 'a05eeb5a', 'Prof. Dr. Ir. Widodo Wahyu Handoko', 'NSBDSN300', NULL, NULL, true, 'NSBDSN300', 'update'),
  (501, '88484627', 'Prof. dr. Laksono Trisnantoro, M.Sc, Ph.D.', 'NSBDSN301', NULL, NULL, true, 'NSBDSN301', 'update'),
  (502, '4b64ba67', 'Prof. Dr. Maizar Rahman', 'NSBDSN302', 'maiza548@gmail.com', '8118110211', true, 'NSBDSN302', 'update'),
  (503, '82737202', 'Prof. Dr. Martani Huseini', 'NSBDSN303', 'martani@huseini.com', '816720924', true, 'NSBDSN303', 'update'),
  (504, '6add243e', 'Prof. Dr. Meutia S.E.,M.P.', 'NSBDSN304', NULL, NULL, true, 'NSBDSN304', 'update'),
  (505, '0a9c05cf', 'Prof. Dr. Rachmat Herman, M.V.Sc.', 'NSBDSN305', NULL, NULL, true, 'NSBDSN305', 'update'),
  (506, 'f927cbb2', 'Prof. Dr. Sudarsono Hardjosoekarto, S.H., M.A.', 'NSBDSN306', 'soekarto@ui.ac.id', '818634545', true, 'NSBDSN306', 'update'),
  (507, '65cf2500', 'Prof. Dr. Willy Arafah, M.M., D.B.A.', 'NSBDSN307', NULL, NULL, true, 'NSBDSN307', 'update'),
  (508, '17ba5fe8', 'Prof. Drs. Agus Subekti, M.Sc., Ph.D.', 'NSBDSN308', NULL, NULL, true, 'NSBDSN308', 'update'),
  (509, '30ea3d3f', 'Prof. Dwi Suhartanto M.C.M., Ph.D.', 'NSBDSN309', NULL, '82117882409', true, 'NSBDSN309', 'update'),
  (510, 'd791cfb2', 'Prof. Firmanzah, S.E.., M.M., M.Phil., Ph.D.', 'NSBDSN310', 'fizfirmanzah@gmail.com', '8111096305', true, 'NSBDSN310', 'update'),
  (511, '8d23e888', 'Prof. Gunadi', 'NSBDSN311', NULL, NULL, true, 'NSBDSN311', 'update'),
  (512, 'd0b8677d', 'Prof. Ir. Purnomo Yusgiantoro, M.Sc., Ph.D.', 'NSBDSN312', NULL, NULL, true, 'NSBDSN312', 'update'),
  (513, '8eb5c510', 'Prof. Ir. Sugiharso Safuan, M.E,, Ph.D', 'NSBDSN313', 'Sugiharso.safuan@gmal.com', '08179800041', true, 'NSBDSN313', 'update'),
  (514, '18ad55d1', 'Prof. Ir. Trias Aditya Kurniawan Muhammad , S.T., M.Sc., Ph.D., I.P.U.', 'NSBDSN314', NULL, '+62 878-3967-6089', true, 'NSBDSN314', 'update'),
  (515, '605ed1a1', 'Rahmadi Murwanto, Ak., M.Acc., M.B.A., Ph.D.', 'NSBDSN315', NULL, '81315725903', true, 'NSBDSN315', 'update'),
  (516, '86e013ac', 'Riani Rachmawati, S.E., M.A., Ph. D.', 'NSBDSN316', 'riani.rachmawati@gmail.com', '87775043157', true, 'NSBDSN316', 'update'),
  (517, '532231df', 'Rifki Ismal, PhD', 'NSBDSN317', 'rifki_ismal@yahoo.com', '82114320365', true, 'NSBDSN317', 'update'),
  (518, '3a1cebc5', 'Riskina Juwita, B.Sc., M.Sc., Ph.D.', 'NSBDSN318', 'riskinajuwita@gmail.com', NULL, true, 'NSBDSN318', 'update'),
  (519, 'f4a1bcb5', 'Riznaldi Akbar, S.T., S.E., Ak., M.Sc.,Ph.D.', 'NSBDSN319', NULL, NULL, true, 'NSBDSN319', 'update'),
  (520, 'fc5e9b32', 'Sahala Lumban Gaol, M.A., Ph.D.', 'NSBDSN320', 'febriantoarifwibowo@apps.ipb.ac.id', '8111117752', true, 'NSBDSN320', 'update'),
  (521, '93013db2', 'Salis S. Aprilian, Ph.D.', 'NSBDSN321', NULL, NULL, true, 'NSBDSN321', 'update'),
  (522, 'e0cb4ced', 'Sugeng Purwanto, F.R.M.,M.B.A., Ph.D.', 'NSBDSN322', NULL, NULL, true, 'NSBDSN322', 'update'),
  (523, '5eb617c9', 'Sutan Emir Hidayat, Ph.D.', 'NSBDSN323', NULL, NULL, true, 'NSBDSN323', 'update'),
  (524, 'bcae6436', 'Tatang Muttaqin, S.Sos., M.Ed., Ph.D.', 'NSBDSN324', 'tatang@bappenas.go.id', '81298152521', true, 'NSBDSN324', 'update'),
  (525, '8b46b209', 'Tony, S.E., S.H., L.L.M., Ph.D.', 'NSBDSN325', NULL, NULL, true, 'NSBDSN325', 'update'),
  (526, '38e63a8e', 'Wati Hermawati, S.E., M.B.A.', 'NSBDSN326', NULL, NULL, true, 'NSBDSN326', 'update'),
  (527, '9d7a8e32', 'Yon Arsal, S.E., Ak., M.Sc., M.Ec., Ph.D.', 'NSBDSN327', NULL, '+62 815-1810-410', true, 'NSBDSN327', 'update'),
  (528, '208d5f7d', 'Yudhistira Nugraha, S.T., M.ICT.Adv., D.Phil.', 'NSBDSN328', 'yudhistira.nugraha@jakarta.go.id', '0813-8585-8521', true, 'NSBDSN328', 'update'),
  (529, '59338fbc', 'Yuswandi A. Tumenggung, Ph.D.', 'NSBDSN329', NULL, NULL, true, 'NSBDSN329', 'update'),
  (576, '2d4c1bf0', 'Dr. Andina Oktariani, S.E., M.Si.', 'SBIDSN005', 'andina.oktariani@apps.ipb.ac.id', NULL, true, 'SBIDSN005', 'update');

DO $preflight$
DECLARE
  current_count integer;
  staged_count integer;
  update_target_count integer;
  insert_count integer;
BEGIN
  SELECT count(*) INTO current_count FROM public.dosen;
  IF current_count <> 527 THEN
    RAISE EXCEPTION
      'Preview basi: public.dosen berisi % baris; preview mengharapkan 527. Rollback.',
      current_count;
  END IF;

  SELECT count(*) INTO staged_count FROM _sync_dosen_source;
  IF staged_count <> 573 THEN
    RAISE EXCEPTION
      'Data staging tidak lengkap: % baris; seharusnya 573. Rollback.',
      staged_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sync_dosen_source
    GROUP BY source_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ID Google Drive duplikat di staging. Rollback.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sync_dosen_source
    WHERE source_id !~ '^[0-9A-Fa-f]{8}$'
  ) THEN
    RAISE EXCEPTION 'Format ID Google Drive tidak valid di staging. Rollback.';
  END IF;

  SELECT count(*)
  INTO update_target_count
  FROM _sync_dosen_source AS source
  JOIN public.dosen AS target
    ON target.id_dosen = source.target_code
  WHERE source.action = 'update';

  IF update_target_count <> 524 THEN
    RAISE EXCEPTION
      'Target update berubah/ambigu: ditemukan %, seharusnya 524. Rollback.',
      update_target_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sync_dosen_source AS source
    JOIN public.dosen AS target
      ON target.id_dosen = source.source_code
    WHERE source.action = 'insert'
  ) THEN
    RAISE EXCEPTION
      'Salah satu Kode Dosen baru sudah ada di database. Preview ulang diperlukan. Rollback.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _sync_dosen_source AS source
    JOIN public.dosen AS target
      ON target.id_external = source.source_id
    WHERE target.id_dosen IS DISTINCT FROM
      CASE
        WHEN source.action = 'update' THEN source.target_code
        ELSE source.source_code
      END
  ) THEN
    RAISE EXCEPTION
      'Salah satu ID Google Drive sudah dipakai record lain. Rollback.';
  END IF;

  SELECT count(*) INTO insert_count
  FROM _sync_dosen_source
  WHERE action = 'insert';

  IF insert_count <> 49 THEN
    RAISE EXCEPTION
      'Jumlah insert staging berubah: %, seharusnya 49. Rollback.',
      insert_count;
  END IF;
END
$preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS dosen_id_external_unique
  ON public.dosen (id_external)
  WHERE id_external IS NOT NULL;

-- Record lama: hanya id_external yang diisi. PK id dan id_dosen tetap.
UPDATE public.dosen AS target
SET id_external = source.source_id
FROM _sync_dosen_source AS source
WHERE source.action = 'update'
  AND target.id_dosen = source.target_code
  AND target.id_external IS DISTINCT FROM source.source_id;

-- Record baru: id tidak disebutkan agar identity/sequence database membuat PK baru.
INSERT INTO public.dosen (
  nama_dosen,
  id_dosen,
  id_external,
  email,
  telepon,
  aktif_nonaktif
)
SELECT
  source.source_name,
  source.source_code,
  source.source_id,
  NULLIF(source.source_email, ''),
  NULLIF(source.source_phone, ''),
  source.source_active
FROM _sync_dosen_source AS source
WHERE source.action = 'insert'
ORDER BY source.source_row;

DO $verify$
DECLARE
  final_count integer;
  mapped_count integer;
  external_count integer;
BEGIN
  SELECT count(*) INTO final_count FROM public.dosen;
  IF final_count <> 576 THEN
    RAISE EXCEPTION
      'Verifikasi gagal: total akhir %; seharusnya 576. Rollback.',
      final_count;
  END IF;

  SELECT count(*)
  INTO mapped_count
  FROM _sync_dosen_source AS source
  JOIN public.dosen AS target
    ON target.id_external = source.source_id
   AND target.id_dosen =
      CASE
        WHEN source.action = 'update' THEN source.target_code
        ELSE source.source_code
      END;

  IF mapped_count <> 573 THEN
    RAISE EXCEPTION
      'Verifikasi gagal: % dari 573 mapping ditemukan. Rollback.',
      mapped_count;
  END IF;

  SELECT count(*) INTO external_count
  FROM public.dosen
  WHERE id_external IS NOT NULL;

  IF external_count <> 573 THEN
    RAISE EXCEPTION
      'Verifikasi gagal: % id_external terisi; seharusnya 573. Rollback.',
      external_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.dosen
    WHERE id_external IS NOT NULL
    GROUP BY id_external
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Verifikasi gagal: id_external duplikat. Rollback.';
  END IF;
END
$verify$;

-- Ringkasan yang tampil sebelum COMMIT di SQL editor.
SELECT
  (SELECT count(*) FROM public.dosen) AS total_dosen,
  (SELECT count(*) FROM public.dosen WHERE id_external IS NOT NULL)
    AS dosen_dengan_id_external,
  (SELECT count(*) FROM _sync_dosen_source WHERE action = 'update')
    AS mapping_record_lama,
  (SELECT count(*) FROM _sync_dosen_source WHERE action = 'insert')
    AS record_baru;

COMMIT;

-- Verifikasi read-only setelah COMMIT.
SELECT
  id,
  nama_dosen,
  id_dosen,
  id_external,
  aktif_nonaktif
FROM public.dosen
WHERE id_external IS NOT NULL
ORDER BY id_dosen;
