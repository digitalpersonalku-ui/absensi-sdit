# 📱 Absensi Digital SDIT Qudwatun Hasanah

Sistem absensi digital berbasis QR Code & Firebase Realtime Database.

## 🗂️ Struktur File

```
absensi-sdit/
├── index.html          ← Halaman utama (HTML saja)
├── css/
│   └── style.css       ← Semua tampilan & warna
└── js/
    └── bundle.js       ← Semua logika aplikasi (digabung)
```

## 🚀 Deploy ke GitHub Pages

1. Upload ketiga file/folder ke root repo
2. Pastikan GitHub Pages aktif (Settings → Pages → Deploy from main)
3. URL: `https://digitalpersonalku-ui.github.io/absensi-sdit/`

## 👥 Role & Login

| Role | Username | Password |
|------|----------|----------|
| Guru | - | (langsung masuk) |
| Admin | `admin` | `sdit2025` |
| Kepala Sekolah | `kepsek` | `kepsek2025` |
| Ketua Yayasan | `yayasan` | `yayasan2025` |

> ⚠️ Ganti password default via menu Setting → Keamanan setelah deploy pertama

## 🔥 Firebase

- Project: `absensi-sdit`
- Region: Asia Southeast 1 (Singapura)
- Database URL: `https://absensi-sdit-default-rtdb.asia-southeast1.firebasedatabase.app`

## ✏️ Cara Edit Kode

| Ingin ubah... | Buka file... |
|---|---|
| Tampilan/warna | `css/style.css` |
| Logika absensi | Edit `js/` folder source, lalu rebuild bundle |
| Firebase config | `js/config.js` (source) |

## 📋 Fitur

- ✅ Scan QR Code absensi (masuk & pulang)
- ✅ Input manual (Izin, Sakit, Alpha, koreksi)
- ✅ ID Card dengan QR Code (cetak ukuran CR80)
- ✅ Rekap harian, bulanan, semester, tahunan
- ✅ Export CSV & Excel berwarna
- ✅ Cetak PDF dengan tanda tangan
- ✅ 4 Role akses (Guru, Admin, Kepsek, Yayasan)
- ✅ Alpha otomatis pada jam yang dikonfigurasi
- ✅ Identitas sekolah realtime ke semua device
- ✅ Tema warna kustom
- ✅ Mode gelap
- ✅ Session timeout + brute-force protection
