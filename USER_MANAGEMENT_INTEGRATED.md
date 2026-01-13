# Flowchart Manajemen User - Terintegrasi dengan Master Data

## 🎯 Konsep Utama: Single Source of Truth

**Master Data Dosen** = sumber utama data dosen (nama, NIP, email, telepon, status)
**Users Page** = tempat untuk **assign ROLE** ke user

### Keuntungan:

- ✅ Tidak perlu input data 2 kali
- ✅ Data konsisten dan terpusat
- ✅ Perubahan data dosen cukup di 1 tempat (Master Data)
- ✅ Role management terpisah dan jelas

---

## Flowchart: Alur Kerja Sistem

```mermaid
flowchart TD
    subgraph MasterData["📋 MASTER DATA (Input Data Lengkap)"]
        MD1[Admin input data dosen baru]
        MD2[Nama, NIP, Email, Telepon, Status]
        MD3[Data tersimpan di tabel 'dosen']
    end

    subgraph UsersPage["👥 USERS PAGE (Assign Role)"]
        UP1[Admin pilih dosen dari dropdown]
        UP2[Pilih role untuk dosen]
        UP3[Update roles_id di tabel 'dosen']
    end

    subgraph Login["🔐 LOGIN (OTP)"]
        L1[Dosen login dengan email]
        L2[Sistem cek email di tabel 'dosen']
        L3[auth_id terisi otomatis]
    end

    MD1 --> MD2 --> MD3
    MD3 -->|Dosen terdaftar| UP1
    UP1 --> UP2 --> UP3
    UP3 -->|Dosen punya role| L1
    L1 --> L2 --> L3

    style MasterData fill:#e3f2fd
    style UsersPage fill:#fff3e0
    style Login fill:#e8f5e9
```

---

## Flowchart: Tab User Teknisi vs Tab User Dosen

```mermaid
flowchart LR
    subgraph Teknisi["TAB TEKNISI"]
        T1[Input langsung di form]
        T2[Nama + Email + Role]
        T3[Insert ke tabel 'Teknisi']
    end

    subgraph Dosen["TAB DOSEN (Terintegrasi)"]
        D1[Pilih dari dropdown Master Data]
        D2[Assign role saja]
        D3[Update roles_id di tabel 'dosen']
    end

    T1 --> T2 --> T3
    D1 --> D2 --> D3

    style Teknisi fill:#ffebee
    style Dosen fill:#e8f5e9
```

---

## Detail: Alur Assign Role Dosen

```mermaid
flowchart TD
    A([Klik 'Assign Role Dosen']) --> B[Fetch dosen dari Master Data<br/>yang belum punya role]
    B --> C{Ada dosen<br/>yang tersedia?}

    C -->|Tidak| D[Tampilkan pesan:<br/>'Semua dosen sudah punya role']
    C -->|Ya| E[Tampilkan dropdown<br/>pilih dosen]

    E --> F[Admin pilih dosen]
    F --> G[Preview info dosen:<br/>Nama, Email, NIP]
    G --> H[Admin pilih Role]
    H --> I[Klik 'Assign Role']

    I --> J[UPDATE tabel dosen<br/>SET roles_id = selected_role]
    J --> K[✅ Success!<br/>Dosen bisa login dengan OTP]

    K --> L[Refresh list:<br/>- Dosen dengan role<br/>- Dosen tanpa role]

    style A fill:#4caf50,color:#fff
    style K fill:#4caf50,color:#fff
    style D fill:#ff9800,color:#fff
```

---

## Detail: Alur Hapus Role Dosen

```mermaid
flowchart TD
    A([Klik 'Hapus Role']) --> B{Konfirmasi?}
    B -->|Cancel| C([Batal])
    B -->|OK| D[UPDATE tabel dosen<br/>SET roles_id = NULL<br/>SET auth_id = NULL]

    D --> E[✅ Role dihapus]
    E --> F[Data dosen TETAP ada<br/>di Master Data]
    F --> G[Dosen muncul lagi<br/>di dropdown 'Assign Role']

    style A fill:#f44336,color:#fff
    style E fill:#4caf50,color:#fff
    style F fill:#2196f3,color:#fff
```

---

## Struktur Database Terintegrasi

```mermaid
erDiagram
    DOSEN ||--o| ROLES : has
    TEKNISI ||--o| ROLES : has

    DOSEN {
        int id PK
        string nama_dosen
        string nip
        string email
        string telepon
        boolean aktif_nonaktif
        int roles_id FK "Dari Users Page"
        uuid auth_id "Terisi saat login"
    }

    TEKNISI {
        int id PK
        string nama_teknisi
        string email
        int roles_id FK
        uuid auth_id
    }

    ROLES {
        int id PK
        string role
    }
```

---

## Perbedaan Tab Teknisi vs Dosen

| Aspek              | Tab Teknisi                 | Tab Dosen                         |
| ------------------ | --------------------------- | --------------------------------- |
| **Input Data**     | Langsung di form            | Pilih dari Master Data            |
| **Tabel Database** | `Teknisi` (terpisah)        | `dosen` (sama dengan Master Data) |
| **Tambah User**    | Input: Nama, Email, Role    | Pilih: Dosen, Role                |
| **Edit**           | Bisa ubah nama, email, role | Hanya bisa ubah role              |
| **Hapus**          | Delete permanen dari tabel  | Hanya hapus role (data tetap)     |
| **Data Lengkap**   | Di halaman Users            | Di Master Data                    |

---

## Kolom Tabel di UI

### Tab Teknisi:

| ID | Nama | Email | Role | Status Login | Aksi |

### Tab Dosen:

| ID | Nama | NIP | Email | Telepon | Role | Status Login | Aksi |

---

## Migration SQL

Untuk mengintegrasikan, jalankan SQL migration:

```sql
-- Tambah kolom roles_id ke tabel dosen
ALTER TABLE dosen
ADD COLUMN IF NOT EXISTS roles_id bigint REFERENCES roles(id);

-- Tambah kolom auth_id ke tabel dosen
ALTER TABLE dosen
ADD COLUMN IF NOT EXISTS auth_id uuid;
```

File: `MIGRATION_DOSEN_ROLES.sql`

---

## Catatan Penting

1. **Data dosen HANYA diinput di Master Data**
   - Nama, NIP, Email, Telepon, Status
2. **Role diassign di Users Page**
   - Pilih dosen → Pilih role → Assign
3. **Hapus role ≠ Hapus data**
   - Data dosen tetap tersimpan di Master Data
   - Dosen akan muncul lagi di dropdown untuk di-assign ulang

4. **Login dengan OTP**
   - Dosen login menggunakan email yang terdaftar di Master Data
   - auth_id terisi otomatis saat first login

5. **Filtering di dropdown**
   - Hanya dosen yang AKTIF dan BELUM punya role yang muncul
   - Dosen yang sudah punya role tidak muncul di dropdown
