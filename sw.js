// Service Worker — Absensi Digital SDIT Qudwatun Hasanah
//
// STRATEGI: "network with timeout, fallback ke cache" — bukan network-first
// murni, dan bukan cache-first murni.
//
// Kenapa bukan cache-first: aplikasi ini masih aktif dikembangkan (perbaikan
// bug/keamanan bisa terjadi kapan saja). Cache-first murni akan membuat
// pengguna terjebak memakai versi LAMA yang mungkin mengandung bug/celah
// yang sudah diperbaiki, tanpa tahu ada versi baru.
//
// Kenapa bukan network-first murni: di jaringan lambat/HP lawas, menunggu
// respons jaringan penuh sebelum menampilkan apa pun terasa sangat lambat
// (pernah dilaporkan sampai ~20 detik), padahal ada versi tersimpan yang
// bisa langsung ditampilkan dalam hitungan milidetik.
//
// Solusinya: coba jaringan dulu, TAPI beri batas waktu (2.5 detik). Kalau
// jaringan belum merespons dalam waktu itu, langsung pakai versi cache yang
// ada (kalau ada) — sementara permintaan ke jaringan tetap berjalan di latar
// belakang dan cache tetap diperbarui begitu responsnya datang, untuk
// kunjungan berikutnya.

const CACHE_NAME = 'absensi-sdit-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];
const NETWORK_TIMEOUT_MS = 2500;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET ke domain sendiri — biarkan request ke
  // Firebase/CDN lewat apa adanya (jangan di-cache, butuh selalu realtime/
  // lazy-loaded sesuai kebutuhan fitur).
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(networkWithTimeoutFallback(event.request));
});

async function networkWithTimeoutFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    // Selalu perbarui cache begitu jaringan merespons, walau responsnya
    // datang belakangan setelah timeout — supaya kunjungan berikutnya
    // dapat versi terbaru dari cache.
    cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  if (!cached) {
    // Tidak ada cache sama sekali (mis. pertama kali buka) → wajib tunggu
    // jaringan, tidak ada pilihan lain.
    const res = await networkFetch;
    if (res) return res;
    return cache.match('./index.html');
  }

  // Ada cache tersedia → balapan antara jaringan vs batas waktu.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
  const fast = await Promise.race([networkFetch, timeout]);
  return fast || cached;
}
