// firebase-messaging-sw.js
// Service worker KHUSUS untuk Firebase Cloud Messaging — menangani notifikasi
// push yang masuk saat aplikasi TERTUTUP/di background. Ini file terpisah
// dari sw.js utama (yang menangani caching PWA), sesuai pola resmi yang
// disyaratkan Firebase — harus persis bernama "firebase-messaging-sw.js" dan
// ada di root domain.
//
// ⚠️ WAJIB DIISI: ganti messagingSenderId dan appId di bawah dengan nilai ASLI
// dari Firebase Console → Project Settings → General → Your apps → SDK
// setup and configuration. Nilai placeholder "000000000000" TIDAK akan
// berfungsi untuk notifikasi (walau Database/Auth tetap jalan normal tanpa
// nilai ini, FCM secara khusus membutuhkannya).

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD9dljqCBwnntZCGooUd5gVrC7miiY2bd0",
  authDomain: "absensi-sdit.firebaseapp.com",
  databaseURL: "https://absensi-sdit-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi-sdit",
  storageBucket: "absensi-sdit.appspot.com",
  messagingSenderId: "179050530066", // <-- Sender ID asli
  appId: "1:179050530066:web:b35c07d59c435365bb5fcb" // <-- App ID asli
});

const messaging = firebase.messaging();

// Notifikasi saat aplikasi TERTUTUP/di background
messaging.onBackgroundMessage((payload) => {
  const judul = payload?.notification?.title || 'Pengingat Absen';
  const opsi = {
    body: payload?.notification?.body || 'Jangan lupa absen hari ini!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'absen-reminder', // supaya notifikasi berulang tidak menumpuk, saling menimpa
    // Pola getar khas "alarm" — 3x getar-jeda diulang, beda dari notifikasi
    // biasa yang cuma getar sekali sebentar. Angka dalam milidetik:
    // getar 300ms, jeda 150ms, getar 300ms, jeda 150ms, getar 500ms (lebih
    // panjang di akhir supaya kerasa "menutup" pola).
    vibrate: [300, 150, 300, 150, 500],
    // requireInteraction: true — notifikasi TETAP tampil di layar sampai
    // pengguna sendiri yang menyentuh/menutupnya, tidak otomatis hilang
    // dalam beberapa detik seperti notifikasi biasa. (Android; di iOS
    // Safari perilaku ini tidak selalu didukung penuh — keterbatasan OS,
    // bukan bug kita.)
    requireInteraction: true,
  };
  self.registration.showNotification(judul, opsi);
});

// Klik notifikasi → buka/fokus ke aplikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
