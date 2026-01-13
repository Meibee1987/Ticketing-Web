# Flowchart Visual - Sistem Manajemen User

## 1. Alur Utama Aplikasi

```mermaid
graph TB
    Start([Buka Halaman Users]) --> Init[Inisialisasi:<br/>activeTab = teknisi]
    Init --> Fetch[Fetch Data Paralel]
    Fetch --> FetchT[Fetch Teknisi<br/>dari tabel Teknisi]
    Fetch --> FetchD[Fetch Dosen<br/>dari tabel nama_user]
    Fetch --> FetchR[Fetch Roles<br/>dari tabel roles]

    FetchT --> Display[Tampilkan UI]
    FetchD --> Display
    FetchR --> Display

    Display --> Tabs[Tab Navigation]
    Tabs --> TabT[Tab Teknisi Aktif?]
    Tabs --> TabD[Tab Dosen Aktif?]

    TabT --> ShowT[Tampilkan<br/>List Teknisi]
    TabD --> ShowD[Tampilkan<br/>List Dosen]

    ShowT --> Actions[User Actions]
    ShowD --> Actions

    Actions --> Add[Tambah User]
    Actions --> Edit[Edit User]
    Actions --> Del[Delete User]
    Actions --> Switch[Switch Tab]

    Switch --> Tabs

    style Start fill:#e1f5ff
    style Display fill:#fff4e6
    style Actions fill:#f3e5f5
    style Add fill:#c8e6c9
    style Edit fill:#fff9c4
    style Del fill:#ffcdd2
```

## 2. Alur Tambah User (Create)

```mermaid
graph TD
    A([Klik + Tambah User]) --> B[Buka Modal]
    B --> C[Form Kosong:<br/>nama: ''<br/>email: ''<br/>roles_id: '']
    C --> D{User Input}

    D -->|Submit| E{Validasi Email}
    D -->|Cancel| Z([Tutup Modal])

    E -->|❌ Invalid| F[Error: Email tidak valid]
    E -->|✅ Valid| G{Cek Duplikat Email}

    F --> C

    G -->|❌ Ada| H[Error: Email sudah terdaftar]
    G -->|✅ Tidak Ada| I{Tab Aktif?}

    H --> C

    I -->|Teknisi| J[INSERT ke<br/>tabel Teknisi]
    I -->|Dosen| K[INSERT ke<br/>tabel nama_user]

    J --> L[✅ Success Alert]
    K --> L

    L --> M{Refresh Data}
    M -->|Teknisi| N[fetchTeknisi]
    M -->|Dosen| O[fetchDosen]

    N --> Z
    O --> Z

    style A fill:#4caf50,color:#fff
    style L fill:#4caf50,color:#fff
    style F fill:#f44336,color:#fff
    style H fill:#f44336,color:#fff
    style Z fill:#9e9e9e,color:#fff
```

## 3. Alur Edit User (Update)

```mermaid
graph TD
    A([Klik Edit]) --> B[Buka Modal Edit]
    B --> C[Load Data User:<br/>nama, email,<br/>roles_id, auth_id]
    C --> D{Cek auth_id}

    D -->|Ada| E[🔒 Disable Email<br/>Warning ditampilkan]
    D -->|Null| F[✏️ Enable Email<br/>Bisa diedit]

    E --> G{User Input}
    F --> G

    G -->|Cancel| Z([Tutup Modal])
    G -->|Submit| H{Validasi}

    H -->|❌ Invalid| I[Error Message]
    H -->|✅ Valid| J{Email Berubah<br/>& auth_id=null?}

    I --> G

    J -->|Ya| K{Cek Duplikat<br/>Email Baru}
    J -->|Tidak| L[Prepare Update]

    K -->|❌ Duplikat| M[Error: Email digunakan<br/>user lain]
    K -->|✅ OK| L

    M --> G

    L --> N{Tab Aktif?}
    N -->|Teknisi| O[UPDATE<br/>tabel Teknisi]
    N -->|Dosen| P[UPDATE<br/>tabel nama_user]

    O --> Q[✅ Success]
    P --> Q

    Q --> R{Refresh}
    R -->|Teknisi| S[fetchTeknisi]
    R -->|Dosen| T[fetchDosen]

    S --> Z
    T --> Z

    style A fill:#ff9800,color:#fff
    style E fill:#ff5722,color:#fff
    style F fill:#4caf50,color:#fff
    style Q fill:#4caf50,color:#fff
    style M fill:#f44336,color:#fff
    style Z fill:#9e9e9e,color:#fff
```

## 4. Alur Delete User

```mermaid
graph TD
    A([Klik Delete]) --> B{Konfirmasi?<br/>Yakin hapus?}
    B -->|❌ Cancel| Z([Batal])
    B -->|✅ OK| C[Get user.auth_id]

    C --> D{Tab Aktif?}
    D -->|Teknisi| E[DELETE FROM<br/>Teknisi WHERE id]
    D -->|Dosen| F[DELETE FROM<br/>nama_user WHERE id]

    E --> G{auth_id<br/>exists?}
    F --> G

    G -->|Tidak| H[✅ Success Alert]
    G -->|Ada| I[DELETE FROM<br/>Supabase Auth]

    I --> J{Auth Delete<br/>Berhasil?}
    J -->|Ya| H
    J -->|Tidak| K[⚠️ Console Warning]

    K --> H
    H --> L{Refresh Data}

    L -->|Teknisi| M[fetchTeknisi]
    L -->|Dosen| N[fetchDosen]

    M --> O([Selesai])
    N --> O

    style A fill:#f44336,color:#fff
    style B fill:#ff9800,color:#fff
    style H fill:#4caf50,color:#fff
    style K fill:#ff9800,color:#fff
    style Z fill:#9e9e9e,color:#fff
```

## 5. Struktur Data dan Relasi

```mermaid
erDiagram
    TEKNISI ||--o{ ROLES : has
    NAMA_USER ||--o{ ROLES : has
    SUPABASE_AUTH ||--o| TEKNISI : links
    SUPABASE_AUTH ||--o| NAMA_USER : links

    TEKNISI {
        int id PK
        string nama_teknisi
        string email UK
        int roles_id FK
        uuid auth_id FK
    }

    NAMA_USER {
        int id PK
        string nama
        string email UK
        int roles_id FK
        uuid auth_id FK
    }

    ROLES {
        int id PK
        string role
    }

    SUPABASE_AUTH {
        uuid id PK
        string email
        timestamp created_at
    }
```

## 6. State Management Flow

```mermaid
stateDiagram-v2
    [*] --> PageLoad
    PageLoad --> DataFetching
    DataFetching --> TeknisiTab
    DataFetching --> DosenTab

    TeknisiTab --> ShowTeknisiList
    DosenTab --> ShowDosenList

    ShowTeknisiList --> IdleState
    ShowDosenList --> IdleState

    IdleState --> AddModal: Click Add
    IdleState --> EditModal: Click Edit
    IdleState --> DeleteConfirm: Click Delete
    IdleState --> TeknisiTab: Switch Tab
    IdleState --> DosenTab: Switch Tab

    AddModal --> Saving: Submit
    EditModal --> Saving: Submit
    DeleteConfirm --> Deleting: Confirm

    Saving --> Success: Valid
    Saving --> Error: Invalid
    Deleting --> Success: OK
    Deleting --> Error: Failed

    Success --> DataRefresh
    Error --> AddModal: Retry
    Error --> EditModal: Retry

    DataRefresh --> IdleState

    AddModal --> IdleState: Cancel
    EditModal --> IdleState: Cancel
    DeleteConfirm --> IdleState: Cancel
```

## 7. Component Structure

```mermaid
graph TD
    A[UsersPage.jsx] --> B[Header Section]
    A --> C[Tab Navigation]
    A --> D[Table Section]
    A --> E[Modal Component]

    B --> B1[Title: Manajemen User]
    B --> B2[Button: + Tambah User]

    C --> C1[Tab: User Teknisi]
    C --> C2[Tab: User Dosen]

    D --> D1[Table Header]
    D --> D2[Table Body]

    D2 --> D3[Teknisi List<br/>activeTab=teknisi]
    D2 --> D4[Dosen List<br/>activeTab=dosen]

    E --> E1[Modal Header]
    E --> E2[Form Section]
    E --> E3[Modal Footer]

    E2 --> E4[Input: Nama]
    E2 --> E5[Input: Email]
    E2 --> E6[Select: Role]

    E3 --> E7[Button: Batal]
    E3 --> E8[Button: Simpan/Update]

    style A fill:#1976d2,color:#fff
    style B fill:#4caf50
    style C fill:#ff9800
    style D fill:#9c27b0,color:#fff
    style E fill:#f44336,color:#fff
```

## 8. Decision Tree - Email Edit Logic

```mermaid
graph TD
    A[User Click Edit] --> B{Mode Edit<br/>Terbuka}
    B --> C{auth_id<br/>= null?}

    C -->|Ya<br/>Belum Login| D[✅ Email Field<br/>ENABLED]
    C -->|Tidak<br/>Sudah Login| E[🔒 Email Field<br/>DISABLED]

    D --> F[User bisa ubah<br/>email]
    E --> G[Email tetap]

    F --> H{Email<br/>Diubah?}
    H -->|Ya| I[Validasi:<br/>1. Format email<br/>2. Cek duplikat]
    H -->|Tidak| J[Update nama<br/>dan role saja]

    I --> K{Valid?}
    K -->|Ya| L[Update semua:<br/>nama, email, role]
    K -->|Tidak| M[Error:<br/>Email invalid<br/>atau duplikat]

    G --> J
    J --> N[✅ Success]
    L --> N
    M --> O[User harus<br/>perbaiki]

    style D fill:#4caf50,color:#fff
    style E fill:#f44336,color:#fff
    style N fill:#2196f3,color:#fff
    style M fill:#ff5722,color:#fff
```

## Catatan Implementasi

### State Variables

```javascript
// Tab Management
activeTab: 'teknisi' | 'dosen'

// Data Lists
teknisiList: Array<User>
dosenList: Array<User>
roles: Array<Role>

// Modal State
modalOpen: boolean
modalMode: 'add' | 'edit'
editId: number | null

// Form State
form: {
  nama: string,
  email: string,
  roles_id: string,
  auth_id: string | null
}

// UI State
loading: boolean
saving: boolean
error: string | null
```

### Database Tables

- **Teknisi**: `nama_teknisi`, `email`, `roles_id`, `auth_id`
- **nama_user**: `nama`, `email`, `roles_id`, `auth_id`
- **roles**: `id`, `role`

### Key Features

1. ✅ Tab switching (Teknisi ↔ Dosen)
2. ✅ CRUD operations per tab
3. ✅ Email validation
4. ✅ Duplicate check
5. ✅ Auth protection (email lock after login)
6. ✅ OTP login support
7. ✅ Cascade delete (DB + Auth)
