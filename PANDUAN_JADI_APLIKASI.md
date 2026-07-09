# Panduan: Jadi Aplikasi (PWA) + Generate File .apk

## Bagian A — Upload file PWA ke GitHub

Kali ini ada **4 file baru** (bukan cuma index.html), jadi strukturnya beda dari sebelumnya:

```
absensi-sdit/               (repo GitHub Anda)
├── index.html               ← timpa yang lama
├── manifest.json            ← file BARU
├── sw.js                    ← file BARU
└── icons/
    ├── icon-192.png         ← file BARU
    └── icon-512.png         ← file BARU
```

Cara upload di GitHub web:
1. Buka repo → **Add file → Upload files**
2. Timpa `index.html` yang lama dengan yang baru
3. Upload juga `manifest.json` dan `sw.js` langsung ke folder root (sejajar dengan `index.html`)
4. Untuk folder `icons/`: saat upload, GitHub otomatis bikin foldernya kalau Anda drag file dengan path `icons/icon-192.png` dan `icons/icon-512.png` — atau lebih gampang, buat dulu foldernya (Add file → Create new file → ketik `icons/.gitkeep` → commit), baru upload kedua PNG ke dalam folder itu.
5. Commit ke `main`, tunggu 1-2 menit

**Cek berhasil:** buka `https://absensi-sdit.my.id/manifest.json` langsung di browser — harus muncul isi JSON-nya, bukan error 404.

---

## Bagian B — Coba install sebagai PWA dulu (sebelum bikin APK)

1. Buka **absensi-sdit.my.id** di Chrome Android
2. Akan muncul banner "Tambahkan Absensi SDIT ke layar utama" (atau lewat menu titik tiga → **Install app** / **Add to Home Screen**)
3. Install, lalu buka dari ikon di homescreen — harus terbuka fullscreen tanpa address bar, seperti aplikasi asli

Kalau langkah ini sudah berhasil, PWA-nya valid dan siap dibungkus jadi APK.

---

## Bagian C — Generate file .apk lewat PWABuilder (gratis, tanpa coding)

1. Buka **pwabuilder.com** (tool resmi dari Microsoft, gratis)
2. Masukkan URL: `https://absensi-sdit.my.id`
3. Klik **Start**, tunggu PWABuilder menganalisis situs — pastikan skor "Manifest" dan "Service Worker" hijau/lulus
4. Klik tab **Android** atau **Package for stores** → pilih **Android**
5. Isi beberapa detail (nama paket, misalnya `id.my.absensisdit.app` — format kebalikan domain, bebas ditentukan sendiri)
6. Klik **Generate** → PWABuilder akan membuatkan file `.apk` (untuk install manual/dibagikan) sekaligus `.aab` (kalau nanti mau upload ke Google Play Store)
7. Download filenya

**Penting soal update:** karena APK ini cuma "bungkus" yang menampilkan situs `absensi-sdit.my.id`, setiap kali Anda update `index.html` di GitHub, isi aplikasi di HP yang sudah install APK **otomatis ikut ter-update** juga (karena tetap memuat dari internet) — tidak perlu generate ulang APK setiap ada perbaikan kecil. APK cuma perlu di-generate ulang kalau ganti ikon/nama aplikasi, atau mau upload versi baru ke Play Store dengan version code baru.

---

## Bagian D — Kalau mau upload ke Google Play Store (opsional)

Ini di luar yang bisa saya bantu langsung karena perlu:
- Akun **Google Play Console** (bayar sekali $25 USD)
- Proses review dari Google (beberapa hari)
- Kebijakan privasi (privacy policy) yang bisa diakses publik — karena aplikasi ini menyimpan data pribadi guru (nama, foto, nomor HP), Play Store **mewajibkan** halaman kebijakan privasi

Kalau nanti sampai ke tahap ini dan butuh bantuan menulis draf kebijakan privasinya, bilang saja — itu bisa saya bantu.

---

## Ganti ikon dengan logo sekolah asli (opsional, kapan saja)

Ikon yang saya buatkan sekarang desain generik (papan absen + centang, warna oranye-teal sesuai tema aplikasi). Kalau mau pakai logo sekolah asli:
1. Siapkan logo dalam PNG persegi, minimal 512×512px, background solid (bukan transparan, supaya tidak terpotong aneh di Android)
2. Ganti isi file `icons/icon-192.png` dan `icons/icon-512.png` di GitHub dengan logo itu (upload dengan nama file yang sama, timpa yang lama)
3. Kalau sudah generate APK sebelumnya, generate ulang lewat PWABuilder supaya ikon di file APK-nya ikut ter-update (ikon di dalam file APK itu sendiri tidak otomatis berubah walau situsnya diupdate — beda dengan isi/konten aplikasinya).
