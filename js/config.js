// ─────────────────────────────────────────
// config.js — Firebase & Konstanta Global
// ─────────────────────────────────────────

// Firebase
export const FB_CONFIG = {
  apiKey: "AIzaSyD9dljqCBwnntZCGooUd5gVrC7miiY2bd0",
  authDomain: "absensi-sdit.firebaseapp.com",
  databaseURL: "https://absensi-sdit-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi-sdit",
  storageBucket: "absensi-sdit.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000"
};

// Role labels & icons
export const ROLES = {
  guru:    { label: 'Guru',           icon: '👩‍🏫' },
  admin:   { label: 'Admin',          icon: '👨‍💼' },
  kepsek:  { label: 'Kepala Sekolah', icon: '🏫'  },
  yayasan: { label: 'Ketua Yayasan',  icon: '🏛️' },
};

// Username untuk login
export const UNAME = {
  admin:   'admin',
  kepsek:  'kepsek',
  yayasan: 'yayasan',
};

// Preset warna tema
export const COLOR_PRESETS = [
  { n: 'Oranye', h: '#FF6B35' }, { n: 'Hijau',  h: '#06C270' },
  { n: 'Biru',   h: '#2563EB' }, { n: 'Ungu',   h: '#6C47FF' },
  { n: 'Tosca',  h: '#0ABAB5' }, { n: 'Merah',  h: '#FF4D6D' },
  { n: 'Kuning', h: '#F59E0B' }, { n: 'Pink',   h: '#EC4899' },
];

// Keamanan login
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 menit

// ─────────────────────────────────────────
// STATE BERSAMA — satu sumber kebenaran
// Diimport oleh semua modul yang butuh
// ─────────────────────────────────────────
export const state = {
  role:         'guru',
  guruData:     {},
  absensiData:  {},
  identitasData:{},
  darkMode:     false,
  period:       'harian',
  rekapCache:   {},

  JAM: {
    mulai:       '06:30',
    batas:       '08:00',
    maxmasuk:    '11:00',
    jam_alpha:   '10:30',
    pulang:      '14:00',
    maxpulang:   '15:30',
    quran_mulai: '07:00',
    quran_batas: '08:10',
  },

  PASS: {
    admin:   'sdit2025',
    kepsek:  'kepsek2025',
    yayasan: 'yayasan2025',
  },
};
