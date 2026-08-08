// reminder-absen.js
// Dijalankan terjadwal oleh GitHub Actions (lihat .github/workflows/reminder-absen.yml).
// Tujuan: kirim notifikasi push ke guru yang BELUM absen masuk, beberapa menit
// menjelang batas waktu — supaya masih sempat absen sebelum dianggap Alpha.
//
// BEDA dengan auto-alpha.js: skrip ini butuh KREDENSIAL (Firebase service
// account), karena mengirim FCM push notification memang mensyaratkan
// autentikasi server (tidak bisa lewat REST publik seperti menulis data
// absensi biasa). Kredensial disimpan sebagai GitHub Secret bernama
// FIREBASE_SERVICE_ACCOUNT — TIDAK PERNAH ditulis langsung di kode ini.

const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');
const DB_URL = 'https://absensi-sdit-default-rtdb.asia-southeast1.firebasedatabase.app';
const TZ = 'Asia/Jakarta';
const MENIT_SEBELUM_BATAS = 30; // kirim reminder 30 menit sebelum jam.maxmasuk

// ... sisanya sama persis, tidak ada perubahan lain

function nowJakarta() {
  // PENTING: sebelumnya pakai toLocaleString() + re-parse, yang ternyata
  // bisa meleset (pernah terdeteksi selisih 1 jam) tergantung dukungan
  // data zona waktu (ICU) di lingkungan Node.js yang menjalankannya —
  // beda runner/versi Node bisa beda hasil, sangat tidak bisa diandalkan
  // untuk keperluan jadwal seperti ini.
  //
  // Solusi lebih aman: karena WIB SELALU UTC+7 sepanjang tahun (Indonesia
  // tidak menerapkan daylight saving time), cukup tambahkan 7 jam
  // langsung ke waktu UTC — perhitungan matematis murni, tidak bergantung
  // sama sekali pada database zona waktu apa pun.
  const utc = new Date();
  return new Date(utc.getTime() + 7 * 60 * 60 * 1000);
}
function nowMinutes() {
  const d = nowJakarta();
  return d.getHours() * 60 + d.getMinutes();
}
function isWeekend() {
  const day = nowJakarta().getDay();
  return day === 0 || day === 6;
}
function isJumat() {
  return nowJakarta().getDay() === 5;
}
function toMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}
function todayStr() {
  const d = nowJakarta();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function main() {
  console.log(`[reminder-absen] Jalan pada ${nowJakarta().toISOString()} (WIB)`);

  if (isWeekend()) {
    console.log('[reminder-absen] Hari libur (Sabtu/Minggu). Selesai.');
    return;
  }

  // Inisialisasi Firebase Admin SDK pakai service account dari GitHub Secret
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.error('[reminder-absen] FIREBASE_SERVICE_ACCOUNT belum diset di GitHub Secrets. Berhenti.');
    process.exit(1);
  }
  const app = initializeApp({
    credential: cert(JSON.parse(serviceAccountJson)),
    databaseURL: DB_URL,
  });
  const db = getDatabase(app);
  const messaging = getMessaging(app);

  // Cek hari libur khusus (hari besar/libur nasional) yang diisi Admin
  // lewat Setting → Hari Libur Khusus.
  const tglCek = todayStr();
  const liburSnap = await db.ref(`setting/liburKhusus/${tglCek}`).once('value');
  if (liburSnap.exists()) {
    console.log(`[reminder-absen] Hari libur khusus: "${liburSnap.val()}". Selesai.`);
    return;
  }

  const jamSnap = await db.ref('setting/jam/maxmasuk').once('value');
  const maxmasuk = jamSnap.val();
  if (!maxmasuk) {
    console.log('[reminder-absen] setting/jam/maxmasuk belum diisi Admin. Selesai.');
    return;
  }

  const targetMin = toMin(maxmasuk) - MENIT_SEBELUM_BATAS;
  const curMin = nowMinutes();

  // Jendela toleransi 15 menit — mirip pola auto-alpha, supaya tidak
  // ketinggalan kalau GitHub Actions sedikit telat jadwal.
  if (curMin < targetMin || curMin > targetMin + 15) {
    console.log(`[reminder-absen] Belum waktunya (target reminder menit ke-${targetMin}, sekarang ke-${curMin}). Selesai.`);
    return;
  }

  const tgl = todayStr();
  const [guruSnap, absensiSnap, tokenSnap] = await Promise.all([
    db.ref('guru').once('value'),
    db.ref(`absensi/${tgl}`).once('value'),
    db.ref('fcmTokens').once('value'), // node terpisah, lihat firebase_rules.json
  ]);
  const guruData = guruSnap.val() || {};
  const absensiData = absensiSnap.val() || {};
  const tokenData = tokenSnap.val() || {};

  const perluDiingatkan = Object.entries(guruData)
    .filter(([id, g]) => (g.status || 'aktif') === 'aktif')
    .filter(([id, g]) => !(isJumat() && g.wajibJumat === false)) // lihat auto-alpha.js untuk penjelasan
    .filter(([id]) => !absensiData[`${id}_masuk`]) // sudah absen, tidak perlu diingatkan
    .filter(([id]) => !!tokenData[id])              // belum aktifkan notifikasi
    .map(([id, g]) => [id, { ...g, fcmToken: tokenData[id] }]);

  if (!perluDiingatkan.length) {
    console.log('[reminder-absen] Tidak ada guru yang perlu diingatkan (semua sudah absen atau belum aktifkan notifikasi).');
    return;
  }

  console.log(`[reminder-absen] Mengirim reminder ke ${perluDiingatkan.length} guru...`);

  const hasil = await Promise.allSettled(perluDiingatkan.map(([id, g]) =>
    messaging.send({
      token: g.fcmToken,
      notification: {
        title: '⏰ Pengingat Absen',
        body: `Hai ${g.nama}, Anda belum absen masuk hari ini. Batas waktu ${maxmasuk} WIB.`,
      },
      webpush: {
        fcmOptions: { link: 'https://absensi-sdit.my.id/' },
      },
    }).then(() => console.log(`[reminder-absen]   ✅ ${g.nama}`))
  ));

  const gagal = hasil.filter(h => h.status === 'rejected');
  if (gagal.length) {
    gagal.forEach((g, i) => {
      const nama = perluDiingatkan[i]?.[1]?.nama || '?';
      console.log(`[reminder-absen]   ❌ Gagal kirim ke ${nama}:`, g.reason?.message || g.reason);
      // Token FCM kadaluarsa/tidak valid adalah penyebab paling umum di sini —
      // wajar terjadi kalau guru uninstall app/ganti HP tanpa aktifkan ulang.
      // Tidak menghapus token otomatis di sini supaya tetap sederhana; kalau
      // mau lebih rapi, bisa ditambahkan penghapusan token yang invalid.
    });
  }
  console.log('[reminder-absen] Selesai.');
}

main()
  .then(() => {
    // PENTING: Firebase Admin SDK membuka koneksi realtime ke Database
    // (mirip WebSocket) yang TIDAK otomatis tertutup sendiri walau kode
    // kita sudah selesai. Tanpa process.exit(0) di sini, Node.js akan
    // menunggu selamanya sampai koneksi itu "mati sendiri" — yang
    // ternyata tidak pernah terjadi, sehingga proses macet sampai
    // GitHub Actions terpaksa menghentikan paksa di batas 6 jam.
    console.log('[reminder-absen] Proses ditutup dengan sukses.');
    process.exit(0);
  })
  .catch(err => {
    console.error('[reminder-absen] ERROR:', err);
    process.exit(1);
  });
