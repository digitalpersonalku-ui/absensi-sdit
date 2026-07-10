// auto-alpha.js
// Dijalankan terjadwal oleh GitHub Actions (lihat .github/workflows/auto-alpha.yml).
// Tujuan: menandai status "Alpha" untuk guru yang belum absen masuk, TANPA
// bergantung pada ada/tidaknya perangkat yang membuka aplikasi — berjalan
// di server GitHub, bukan di browser siapa pun.
//
// Tidak butuh kredensial Firebase apa pun. Ini sengaja aman karena rules
// Firebase (lihat firebase_rules.json) mengizinkan penulisan entri BARU ke
// /absensi/{tanggal}/{key} tanpa login (asal key itu belum pernah ada),
// persis skema yang sama dipakai saat guru absen sendiri via Scan/Manual.

const DB_URL = 'https://absensi-sdit-default-rtdb.asia-southeast1.firebasedatabase.app';
const TZ = 'Asia/Jakarta';

function nowJakarta() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

function todayStr() {
  const d = nowJakarta();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowMinutes() {
  const d = nowJakarta();
  return d.getHours() * 60 + d.getMinutes();
}

function isWeekend() {
  const day = nowJakarta().getDay();
  return day === 0 || day === 6;
}

function toMin(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

async function getJSON(path) {
  const res = await fetch(`${DB_URL}${path}.json`);
  if (!res.ok) throw new Error(`GET ${path} gagal: ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`[auto-alpha] Jalan pada ${nowJakarta().toISOString()} (WIB)`);

  if (isWeekend()) {
    console.log('[auto-alpha] Hari libur (Sabtu/Minggu). Selesai, tidak ada tindakan.');
    return;
  }

  const jamAlpha = await getJSON('/setting/jam/jam_alpha');
  if (!jamAlpha) {
    console.log('[auto-alpha] setting/jam/jam_alpha belum diisi Admin. Selesai.');
    return;
  }

  const targetMin = toMin(jamAlpha);
  const curMin = nowMinutes();

  // Jendela toleransi 20 menit sejak jam_alpha — cukup untuk menampung
  // keterlambatan jadwal GitHub Actions (bisa meleset beberapa menit saat
  // beban server tinggi), tapi tidak akan menandai Alpha di luar konteks
  // "baru saja lewat jam_alpha".
  if (curMin < targetMin || curMin > targetMin + 20) {
    console.log(`[auto-alpha] Belum waktunya (target ${jamAlpha}, sekarang menit ke-${curMin} dari tengah malam WIB). Selesai.`);
    return;
  }

  const tgl = todayStr();
  const [guruData, absensiData] = await Promise.all([
    getJSON('/guru').then(v => v || {}),
    getJSON(`/absensi/${tgl}`).then(v => v || {}),
  ]);

  const perluDitandai = Object.entries(guruData).filter(([id, g]) => {
    if ((g.status || 'aktif') !== 'aktif') return false;
    return !absensiData[`${id}_masuk`];
  });

  if (!perluDitandai.length) {
    console.log('[auto-alpha] Semua guru aktif sudah tercatat masuk. Tidak ada yang ditandai Alpha.');
    return;
  }

  console.log(`[auto-alpha] ${perluDitandai.length} guru belum absen masuk, menandai Alpha...`);

  const hasil = await Promise.allSettled(perluDitandai.map(([id, g]) => {
    const payload = {
      guruId: id, nama: g.nama, mapel: g.mapel || '',
      waktu: jamAlpha, status: 'alpha', tipe: 'masuk', metode: 'otomatis',
      tanggal: tgl,
      createdAt: { '.sv': 'timestamp' }, // waktu server Firebase, konsisten dengan kode utama
      createdBy: 'system-github-actions',
    };
    return fetch(`${DB_URL}/absensi/${tgl}/${id}_masuk.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[auto-alpha]   ✅ ${g.nama}`);
    });
  }));

  const gagal = hasil.filter(h => h.status === 'rejected');
  if (gagal.length) {
    // Wajar terjadi kalau ternyata guru itu absen tepat di detik yang sama
    // — rules Firebase otomatis menolak overwrite data yang sudah ada,
    // jadi ini justru tanda proteksinya bekerja, bukan error sungguhan.
    console.log(`[auto-alpha] ${gagal.length} penandaan gagal/ditolak (kemungkinan guru sempat absen di saat bersamaan — ini aman, bukan bug).`);
  }
  console.log('[auto-alpha] Selesai.');
}

main().catch(err => {
  console.error('[auto-alpha] ERROR:', err);
  process.exit(1);
});
