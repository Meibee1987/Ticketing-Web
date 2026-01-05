# Role-Based Access Control (RBAC) - Dokumentasi

## Struktur Role yang Sudah Ada

Aplikasi ini memiliki 3 role utama:

1. **super admin** - Akses penuh ke semua fitur
2. **admin** - Akses ke fitur management kecuali Master Data
3. **user** - Akses terbatas ke fitur public

## Cara Kerja Role Access

### 1. AuthContext (`src/contexts/AuthContext.jsx`)

Context ini menyimpan informasi user dan role setelah login:

- Mengambil data user dari tabel Teknisi berdasarkan `auth_id`
- Menyimpan role user ke state dan localStorage
- Menyediakan helper function: `isAdmin`, `isSuperAdmin`, `isUser`

### 2. RoleProtectedRoute (`src/components/RoleProtectedRoute.jsx`)

Component untuk melindungi route berdasarkan role:

```jsx
<RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
  <UsersPage />
</RoleProtectedRoute>
```

### 3. Implementasi di App.jsx

Route yang dilindungi:

- `/dashboard/users` → Hanya super admin & admin
- `/dashboard/jadwal-admin` → Hanya super admin & admin
- `/dashboard/ruangan` → Hanya super admin & admin
- `/dashboard/database` → Hanya super admin

### 4. Menu Sidebar (DashboardLayout.jsx)

Menu sidebar ditampilkan conditional berdasarkan role:

```jsx
{
  (userRole?.roleName === 'admin' || userRole?.roleName === 'super admin') && (
    <NavLink to="/dashboard/users">Users</NavLink>
  );
}
```

## Cara Menggunakan

### A. Proteksi Route

Di `App.jsx`, wrap halaman dengan `RoleProtectedRoute`:

```jsx
{
  path: 'nama-halaman',
  element: (
    <RoleProtectedRoute allowedRoles={['super admin', 'admin']}>
      <NamaHalamanPage />
    </RoleProtectedRoute>
  )
}
```

### B. Proteksi Component dalam Halaman

Di dalam component, gunakan `useAuth()`:

```jsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { userRole, isAdmin, isSuperAdmin } = useAuth();

  return (
    <div>
      {isSuperAdmin && <button>Delete Everything</button>}

      {isAdmin && <button>Edit Users</button>}

      <p>Role: {userRole?.roleName}</p>
    </div>
  );
}
```

### C. Proteksi Menu Sidebar

Di `DashboardLayout.jsx`:

```jsx
{
  userRole?.roleName === 'super admin' && (
    <NavLink to="/dashboard/admin-only">
      <span>🔒</span>
      <span>Admin Only</span>
    </NavLink>
  );
}
```

## Testing

### Test dengan 3 Role Berbeda:

1. **Login sebagai Super Admin**
   - Email: wanda@gmail.com (atau yang role_id = 1)
   - Harus bisa akses semua menu:
     ✅ Jadwal, Jadwal Admin, Ruangan, Users, Master Data, Settings

2. **Login sebagai Admin**
   - Email: anby@gmail.com (atau yang role_id = 2)
   - Harus bisa akses:
     ✅ Jadwal, Jadwal Admin, Ruangan, Users, Settings
     ❌ Master Data (akan redirect dengan pesan error)

3. **Login sebagai User**
   - Email: user biasa (role_id = 3)
   - Hanya bisa akses:
     ✅ Jadwal, Settings
     ❌ Jadwal Admin, Ruangan, Users, Master Data

## Troubleshooting

### Role tidak terdeteksi setelah login

1. Pastikan user memiliki `auth_id` yang valid di tabel Teknisi
2. Pastikan `roles_id` di tabel Teknisi terisi
3. Cek console browser untuk error
4. Clear localStorage dan coba login ulang

### Menu tidak muncul

1. Cek `userRole?.roleName` di console: `console.log(userRole)`
2. Pastikan role name di database match persis (case-sensitive)
3. Pastikan AuthProvider sudah wrap App di `App.jsx`

### Redirect loop

1. Pastikan `ProtectedRoute` tidak nested dengan `RoleProtectedRoute` tanpa perlu
2. Cek route configuration di `App.jsx`

## Tips

1. **Tambah Role Baru**
   - Insert role baru di tabel `roles` via Supabase
   - Update kondisi di `DashboardLayout.jsx` dan `App.jsx`
   - Update `allowedRoles` di route yang perlu

2. **Custom Permission**
   Bisa tambah field `permissions` di tabel roles untuk permission lebih granular

3. **Cache Role**
   Role disimpan di localStorage untuk performa. Clear saat logout.
