# 2FA (Two-Factor Authentication) Implementation

## Overview

Implementasi Two-Factor Authentication (2FA) dengan OTP (One-Time Password) menggunakan Supabase. User dapat mengaktifkan 2FA untuk menambah lapisan keamanan pada akun mereka.

## Fitur

- ✅ Enroll TOTP 2FA via QR Code
- ✅ Verify OTP saat login jika user punya 2FA
- ✅ Disable/unenroll 2FA
- ✅ Secret key backup manual
- ✅ Responsive UI dengan loading states

## File Structure

```
src/
├── components/
│   ├── TwoFAVerification.jsx      # Component untuk verify OTP saat login
│   └── TwoFASetup.jsx             # Component untuk setup 2FA di Settings
├── utils/
│   └── twoFactorAuth.js           # Utility functions untuk 2FA operations
├── Pages/
│   ├── LoginPage.jsx              # Updated dengan 2FA flow
│   └── dashboard/
│       └── SettingsPage.jsx       # Added Security tab dengan TwoFASetup
```

## Cara Kerja

### 1. **Setup 2FA** (di Settings)

```
User → Settings → Keamanan → Aktifkan 2FA
↓
Scan QR Code dengan Google Authenticator/Authy
↓
Masukkan 6-digit OTP untuk verifikasi
↓
2FA Berhasil Diaktifkan
```

### 2. **Login dengan 2FA**

```
User → Login Page → Masukkan Email & Password
↓
Jika user punya 2FA enrolled:
  - Tampilkan TwoFAVerification screen
  - User masukkan 6-digit OTP
  - Verify dan redirect ke dashboard
Jika tidak:
  - Langsung redirect ke dashboard
```

## Installation & Setup

### Prerequisites

- React 18+
- Supabase account dengan project
- Node.js & npm

### Steps

1. **Pastikan Supabase sudah setup**

   ```bash
   npm install @supabase/supabase-js
   ```

2. **Files sudah dibuat:**
   - ✅ `src/utils/twoFactorAuth.js`
   - ✅ `src/components/TwoFAVerification.jsx`
   - ✅ `src/components/TwoFASetup.jsx`
   - ✅ `src/Pages/LoginPage.jsx` (updated)
   - ✅ `src/Pages/dashboard/SettingsPage.jsx` (updated)

3. **Import di component yang diperlukan**
   ```javascript
   import TwoFASetup from '../components/TwoFASetup';
   import TwoFAVerification from '../components/TwoFAVerification';
   ```

## API Functions (twoFactorAuth.js)

### `enrollTOTP()`

Enroll user ke 2FA dengan TOTP

```javascript
const data = await enrollTOTP();
// Returns: { id, totp: { qr_code, secret } }
```

### `verifyOTPCode(factorId, code)`

Verify OTP code yang di-input user

```javascript
const result = await verifyOTPCode(factorId, '123456');
// Returns: verified session data
```

### `challengeTOTP(factorId)`

Minta challenge untuk 2FA verification

```javascript
const data = await challengeTOTP(factorId);
```

### `getEnrolledFactors()`

Ambil list MFA factors yang enrolled

```javascript
const { totp } = await getEnrolledFactors();
```

### `unenrollTOTP(factorId)`

Disable/hapus 2FA enrollment

```javascript
await unenrollTOTP(factorId);
```

## Component Usage

### TwoFASetup (untuk Settings page)

```jsx
import TwoFASetup from '../components/TwoFASetup';

<TwoFASetup />;
```

### TwoFAVerification (untuk Login page)

```jsx
import TwoFAVerification from '../components/TwoFAVerification';

<TwoFAVerification
  email={email}
  onSuccess={handle2FASuccess}
  onCancel={handle2FACancel}
/>;
```

## User Flow

### First Time Setup (User ingin enable 2FA)

1. Login ke dashboard
2. Buka Settings → Keamanan
3. Klik "Aktifkan 2FA"
4. Scan QR Code dengan Google Authenticator/Authy
5. Masukkan 6-digit OTP
6. 2FA berhasil diaktifkan

### Login dengan 2FA (User sudah punya 2FA)

1. Masukkan email & password
2. System detect user punya 2FA enrolled
3. Tampilkan screen verifikasi OTP
4. User masukkan 6-digit OTP
5. Berhasil login, redirect ke dashboard

### Disable 2FA

1. Settings → Keamanan
2. Klik "Nonaktifkan 2FA"
3. Confirm dialog
4. 2FA dinonaktifkan

## Testing

### Test dengan Google Authenticator

1. Download Google Authenticator
2. Scan QR Code saat setup 2FA
3. Copy 6-digit code yang tampil di app
4. Paste ke OTP input field

### Test dengan Authenticator Apps

- Google Authenticator
- Microsoft Authenticator
- Authy
- LastPass Authenticator
- FreeOTP

## Error Handling

| Error                       | Penyebab                | Solusi                           |
| --------------------------- | ----------------------- | -------------------------------- |
| "OTP tidak valid"           | Code salah atau expired | Input code baru dari app         |
| "Factor ID tidak ditemukan" | User belum enroll 2FA   | Enroll 2FA terlebih dahulu       |
| "Gagal enroll 2FA"          | Issue dengan Supabase   | Check internet & Supabase status |

## Security Notes

- OTP code berubah setiap 30 detik
- Code hanya valid untuk 1 kali penggunaan
- Secret key disimpan di user's authenticator app, bukan di server
- Gunakan backup codes jika ada masalah dengan authenticator

## Backup Codes

Saat ini belum implement backup codes. Untuk production, tambahkan:

- Generate 10 backup codes saat enroll
- Simpan encrypted di database
- User bisa regenerate backup codes

## Future Improvements

1. ✅ Backup codes untuk recovery
2. ✅ SMS OTP sebagai alternatif
3. ✅ Recovery codes management
4. ✅ 2FA audit logs
5. ✅ Trusted devices (remember this device for 30 days)

## Troubleshooting

### QR Code tidak bisa di-scan

- Copy secret key secara manual
- Paste ke authenticator app
- Input code dari app

### OTP expired saat di-input

- Time sync antara server & phone harus tepat
- Pastikan waktu di phone akurat
- Coba code baru

### Lupa authenticator app

- Butuh akses ke email recovery
- Atau gunakan backup codes
- Contact admin untuk reset

## Testing Checklist

- [ ] Enroll 2FA dengan QR Code
- [ ] Enroll 2FA dengan manual secret
- [ ] Verify OTP saat login
- [ ] OTP invalid handling
- [ ] OTP expired handling
- [ ] Disable 2FA
- [ ] Login tanpa 2FA
- [ ] Login dengan 2FA
- [ ] Mobile responsiveness
