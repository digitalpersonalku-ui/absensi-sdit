// Service Worker — Absensi Digital SDIT Qudwatun Hasanah
//
// PENTING: strategi di sini sengaja NETWORK-FIRST, bukan cache-first.
// Alasannya: aplikasi ini masih aktif dikembangkan (perbaikan bug/keamanan
// bisa terjadi kapan saja). Cache-first akan membuat pengguna yang sudah
// install PWA-nya terjebak memakai versi LAMA yang mungkin sudah mengandung
// bug/celah yang sudah diperbaiki di kode terbaru, tanpa tahu ada versi baru.
//
// Dengan network-first: browser SELALU coba ambil versi terbaru dari server
// dulu. Cache cuma dipakai sebagai fallback kalau benar-benar tidak ada
// koneksi internet sama sekali (mis. sinyal hilang saat mau absen).

const CACHE_NAME = 'absensi-sdit-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

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
  // Firebase/CDN lewat apa adanya (jangan di-cache, butuh selalu realtime).
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Simpan salinan terbaru ke cache untuk fallback offline nanti
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        // Offline total → pakai versi terakhir yang sempat tersimpan
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
