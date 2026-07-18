/* Absensi SDIT Qudwatun Hasanah - bundle.js */
"use strict";


/* === config.js === */
// ─────────────────────────────────────────
// config.js — Firebase & Konstanta Global
// ─────────────────────────────────────────

// Firebase
const FB_CONFIG = {
  apiKey: "AIzaSyD9dljqCBwnntZCGooUd5gVrC7miiY2bd0",
  authDomain: "absensi-sdit.firebaseapp.com",
  databaseURL: "https://absensi-sdit-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi-sdit",
  storageBucket: "absensi-sdit.firebasestorage.app",
  messagingSenderId: "179050530066",
  appId: "1:179050530066:web:b35c07d59c435365bb5fcb"
};

// Role labels & icons
const ROLES = {
  guru:    { label: 'Guru',           icon: '👩‍🏫' },
  admin:   { label: 'Admin',          icon: '👨‍💼' },
  kepsek:  { label: 'Kepala Sekolah', icon: '🏫'  },
  yayasan: { label: 'Ketua Yayasan',  icon: '🏛️' },
};

// Username untuk login
const UNAME = {
  admin:   'admin',
  kepsek:  'kepsek',
  yayasan: 'yayasan',
};

// Preset warna tema
const COLOR_PRESETS = [
  { n: 'Oranye', h: '#FF6B35' }, { n: 'Hijau',  h: '#06C270' },
  { n: 'Biru',   h: '#2563EB' }, { n: 'Ungu',   h: '#6C47FF' },
  { n: 'Tosca',  h: '#0ABAB5' }, { n: 'Merah',  h: '#FF4D6D' },
  { n: 'Kuning', h: '#F59E0B' }, { n: 'Pink',   h: '#EC4899' },
];

// Keamanan login
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 menit

// ─────────────────────────────────────────
// STATE BERSAMA — satu sumber kebenaran
// Diimport oleh semua modul yang butuh
// ─────────────────────────────────────────
const state = {
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

  LOK: {
    lat:    null,
    lng:    null,
    radius: 200,   // meter — default 200m
    aktif:  false, // false = fitur belum dikonfigurasi, skip cek
  },

  PASS: {
    admin:   'sdit2025',
    kepsek:  'kepsek2025',
    yayasan: 'yayasan2025',
  },
};


/* === utils.js === */
// ─────────────────────────────────────────
// utils.js — Fungsi-fungsi pembantu
// ─────────────────────────────────────────

// Ambil elemen by ID
const $ = id => document.getElementById(id);

// Pad angka jadi 2 digit: 5 → "05"
const pad = n => String(n).padStart(2, '0');

// Tanggal hari ini: "2026-05-30"
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

// Jam & menit sekarang: "07:30"
const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Konversi "08:30" → menit (510)
const toMin = t => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Cek apakah hari ini Sabtu/Minggu
const isWeekend = () => [0, 6].includes(new Date().getDay());

// Sanitasi input — buang karakter berbahaya
const san = s => s ? String(s).replace(/[<>"'`]/g, '').trim().slice(0, 300) : '';

// Escape HTML — untuk ditampilkan di DOM
const esc = s => s
  ? String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  : '';

// Warna avatar berdasarkan nama
const avColor = nm => {
  const colors = ['#FF6B35','#06C270','#6C47FF','#0ABAB5','#FF4D6D','#F59E0B','#2563EB','#EC4899'];
  let h = 0;
  for (const ch of (nm || '?')) h = (h * 31 + ch.charCodeAt(0)) & 0xFFFF;
  return colors[h % colors.length];
};

// Inisial nama: "Budi Santoso" → "BS"
const avInitial = nm => {
  if (!nm) return '?';
  const parts = nm.trim().split(' ');
  return parts.length >= 2
    ? parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
    : nm[0].toUpperCase();
};

// Format tanggal: "2026-05-30" → "Sab, 30 Mei 2026"
const fmtTgl = s => {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  const H = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${H[d.getDay()]}, ${d.getDate()} ${B[d.getMonth()]} ${d.getFullYear()}`;
};

// Icon status absensi
const statusIcon = s =>
  ({ hadir:'✅', terlambat:'⚠️', izin:'📝', sakit:'🏥', alpha:'❌', libur:'🏖️' }[s] || '📋');

// CSS class badge status
const statusBadge = s =>
  ({ hadir:'ok', terlambat:'tl', izin:'iz', sakit:'sk', alpha:'al' }[s] || 'lb');

// Nama bulan
const NAMA_BULAN = ['','Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'];


/* === ui.js === */
// ─────────────────────────────────────────
// ui.js — Komponen UI: Toast, Modal, Dropdown, Jam
// ─────────────────────────────────────────

// ── TOAST ─────────────────────────────────
let _toastTimer;
function toast(msg, type = '', dur = 2800) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' t-' + type : '');
  clearTimeout(_toastTimer);
  requestAnimationFrame(() => t.classList.add('show'));
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

// ── DROPDOWN USER ─────────────────────────
let _udOpen = false;

function toggleUD(e) {
  if (e) e.stopPropagation(); // cegah click event bubble ke document
  const menu = $('ud-menu');
  if (!menu) return;
  _udOpen = !_udOpen;
  menu.style.display = _udOpen ? 'block' : 'none';
  const arr = $('ud-arr');
  if (arr) arr.style.transform = _udOpen ? 'rotate(180deg)' : '';
}

function closeUD() {
  if (!_udOpen) return;
  _udOpen = false;
  const menu = $('ud-menu');
  if (menu) menu.style.display = 'none';
  const arr = $('ud-arr');
  if (arr) arr.style.transform = '';
}



// ── MODAL ─────────────────────────────────
let _konfirmCb = null;

function showKonfirm(title, msg, cb) {
  $('kf-ttl').textContent = title;
  $('kf-msg').textContent = msg;
  _konfirmCb = cb;
  $('mov-konfirm').classList.add('open');
  $('kf-ok').onclick = () => { closeKonfirm(); if (_konfirmCb) _konfirmCb(); };
}
function closeKonfirm() { $('mov-konfirm').classList.remove('open'); }
function closeModal(id) { $(id)?.classList.remove('open'); }





// ── JAM & JAM BAR ─────────────────────────
function startClock() {
  const tick = () => {
    const d = new Date();
    const jamEl = $('tb-jam');
    if (jamEl) jamEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const tglEl = $('tb-tgl');
    if (tglEl) {
      const H = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
      tglEl.textContent = `${H[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}`;
    }
    updateJamBar();
  };
  tick();
  setInterval(tick, 1000);
}

function updateJamBar() {
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  const { JAM } = state;
  const start = toMin(JAM.mulai), end = toMin(JAM.maxpulang);
  const pos = Math.max(0, Math.min(1, (now - start) / (end - start)));
  const pct = Math.round(pos * 100);

  const fill = $('jb-fill'), ptr = $('jb-ptr');
  if (fill) fill.style.width = pct + '%';
  if (ptr)  ptr.style.left  = pct + '%';

  let status = '';
  if      (now < toMin(JAM.mulai))    status = '⏳ Belum waktunya';
  else if (now <= toMin(JAM.batas))   status = '🟢 Tepat waktu';
  else if (now <= toMin(JAM.maxmasuk))status = '⚠️ Masa terlambat';
  else if (now < toMin(JAM.pulang))   status = '☕ Jam mengajar';
  else if (now <= toMin(JAM.maxpulang))status = '🟣 Waktu pulang';
  else                                 status = '🏁 Selesai';

  const txt = $('jb-txt');
  if (txt) txt.textContent = status;

  updateAbsenBtns();
}

function updateAbsenBtns() {
  if (state.role === 'yayasan') return;
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  const lib = isWeekend();
  const { JAM } = state;

  const canM = !lib && now >= toMin(JAM.mulai)  && now <= toMin(JAM.maxmasuk);
  const canP = !lib && now >= toMin(JAM.pulang)  && now <= toMin(JAM.maxpulang);

  const bM = $('btn-masuk'), bP = $('btn-pulang');
  const iM = $('info-masuk'), iP = $('info-pulang');

  if (bM) bM.className = 'ab-btn ' + (canM ? 'ab-masuk' : 'ab-off');
  if (bP) bP.className = 'ab-btn ' + (canP ? 'ab-pulang' : 'ab-off');
  if (iM) iM.textContent = lib ? 'Hari Libur' : canM ? 'Aktif sekarang' : `${JAM.mulai}–${JAM.maxmasuk}`;
  if (iP) iP.textContent = lib ? 'Hari Libur' : canP ? 'Aktif sekarang' : `${JAM.pulang}–${JAM.maxpulang}`;
}

// ── DARK MODE ─────────────────────────────
function toggleDark() {
  state.darkMode = !state.darkMode;
  const root = document.documentElement;
  if (state.darkMode) {
    root.style.setProperty('--bg',   '#0F172A');
    root.style.setProperty('--card', '#1E293B');
    root.style.setProperty('--tx',   '#F1F5F9');
    root.style.setProperty('--tx2',  '#94A3B8');
    root.style.setProperty('--tx3',  '#64748B');
    root.style.setProperty('--bdr',  '#334155');
  } else {
    root.style.setProperty('--bg',   '#F4F5F7');
    root.style.setProperty('--card', '#ffffff');
    root.style.setProperty('--tx',   '#0F172A');
    root.style.setProperty('--tx2',  '#475569');
    root.style.setProperty('--tx3',  '#94A3B8');
    root.style.setProperty('--bdr',  '#E2E8F0');
  }
  const lbl = $('dm-lbl');
  if (lbl) lbl.textContent = state.darkMode ? 'Mode Terang' : 'Mode Gelap';
  localStorage.setItem('dm', state.darkMode ? '1' : '0');
  closeUD();
  toast(state.darkMode ? '🌙 Mode gelap aktif' : '☀️ Mode terang aktif', 'info');
}

// ── TEMA WARNA ─────────────────────────────
function applyColor(hex) {
  const root = document.documentElement;
  root.style.setProperty('--or', hex);
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  root.style.setProperty('--or2', `rgba(${r},${g},${b},.12)`);
  const tm = document.querySelector('meta[name="theme-color"]');
  if (tm) tm.content = hex;
  const cc = $('clr-custom');
  if (cc && cc.value !== hex) cc.value = hex;
}

function initColorGrid() {
  const grid = $('clr-grid');
  if (!grid) return;
  grid.innerHTML = COLOR_PRESETS.map(c =>
    `<div class="clr-sw" style="background:${c.h}"
      onclick="window._app.applyColorSave('${c.h}')">
      <span style="font-size:14px">●</span>
      <span>${c.n}</span>
    </div>`
  ).join('');
}

// ── PASSWORD TOGGLE ────────────────────────
function togglePw(id) {
  const el = $(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// ── INFO BAR ───────────────────────────────
function updateInfoBar() {
  const bar = $('info-bar');
  if (!bar) return;
  const { role } = state;
  if (role === 'yayasan') {
    Object.assign(bar.style, {
      display: 'block',
      background: 'linear-gradient(135deg,#065F46,#059669)',
      color: '#fff', fontSize: '11px', fontWeight: '600',
      padding: '7px 16px', textAlign: 'center'
    });
    bar.textContent = '🏛️ Mode Ketua Yayasan — Hanya bisa melihat rekap & data guru';
  } else if (role === 'kepsek') {
    Object.assign(bar.style, {
      display: 'block',
      background: 'linear-gradient(135deg,#4C1D95,#5B21B6)',
      color: '#fff', fontSize: '11px', fontWeight: '600',
      padding: '7px 16px', textAlign: 'center'
    });
    bar.textContent = '🏫 Mode Kepala Sekolah';
    setTimeout(() => bar.style.display = 'none', 4000);
  } else {
    bar.style.display = 'none';
  }
}

// ── SESSION WARNING ────────────────────────
function showSessWarn(minsLeft) {
  const sw = $('sess-warn');
  if (sw) { sw.style.display = 'block'; }
  const cd = $('sess-cd');
  if (cd) cd.textContent = minsLeft;
}
function hideSessWarn() {
  const sw = $('sess-warn');
  if (sw) sw.style.display = 'none';
}


/* === firebase.js === */
// ─────────────────────────────────────────
// firebase.js — Inisialisasi & Listeners
// ─────────────────────────────────────────

let DB = null;

function initFirebase() {
  firebase.initializeApp(FB_CONFIG);
  DB = firebase.database();

  // ── Listener: Data Guru (realtime) ──────
  DB.ref('guru').on('value', snap => {
    state.guruData = {};
    snap.forEach(ch => { state.guruData[ch.key] = ch.val(); });
    document.dispatchEvent(new CustomEvent('guruUpdated'));
  });

  // ── Listener: Identitas Sekolah (realtime)
  DB.ref('identitas').on('value', snap => {
    if (snap.exists()) {
      state.identitasData = snap.val();
      document.dispatchEvent(new CustomEvent('identitasUpdated'));
    }
  });

  // ── Baca Setting Jam (sekali) ────────────
  DB.ref('setting/jam').once('value').then(snap => {
    if (snap.exists()) Object.assign(state.JAM, snap.val());
    document.dispatchEvent(new CustomEvent('jamLoaded'));
  });

  // ── Baca Setting Password (sekali) ───────
  DB.ref('setting/passwords').once('value').then(snap => {
    if (snap.exists()) Object.assign(state.PASS, snap.val());
  });

  // ── Baca Setting Lokasi (sekali) ──────────
  DB.ref('setting/lokasi').once('value').then(snap => {
    if (snap.exists()) {
      Object.assign(state.LOK, snap.val());
      applyLokasi();
    }
  });

  // ── Listener: Absensi Hari Ini (realtime)
  DB.ref('absensi/' + today()).on('value', snap => {
    state.absensiData = {};
    snap.forEach(ch => { state.absensiData[ch.key] = ch.val(); });
    document.dispatchEvent(new CustomEvent('absensiUpdated'));
  });

  // ── Monitor Koneksi Firebase ─────────────
  DB.ref('.info/connected').on('value', snap => {
    const ok = snap.val();
    const dot  = $('fb-dot');
    const st   = $('fb-st');
    const sync = $('sync-dot');
    if (dot)  dot.style.background  = ok ? 'var(--gn)' : 'var(--rd)';
    if (st)   st.textContent        = ok ? 'Firebase: Terhubung ✓' : 'Firebase: Terputus ✗';
    if (sync) sync.style.color      = ok ? 'var(--gn)' : 'var(--rd)';
  });
}

// ── Sinkronisasi manual ──────────────────
function syncNow() {
  if (!DB) return;
  closeUD();
  toast('🔄 Sinkronisasi...', 'info', 1500);
  DB.ref('guru').once('value').then(snap => {
    state.guruData = {};
    snap.forEach(ch => { state.guruData[ch.key] = ch.val(); });
    document.dispatchEvent(new CustomEvent('guruUpdated'));
    toast('✅ Tersinkronisasi', 'ok');
  }).catch(() => toast('❌ Gagal sinkronisasi', 'err'));
}


/* === auth.js === */
// ─────────────────────────────────────────
// auth.js — Login, Session, Role
// ─────────────────────────────────────────

let _pendingRole = null;
let _sessTimer = null;
let _sessExp = null;

// ── BRUTE-FORCE PROTECTION ────────────────
function isLocked(role) {
  const d = JSON.parse(localStorage.getItem('lk_' + role) || '{}');
  if (d.until && Date.now() < d.until) return Math.ceil((d.until - Date.now()) / 60000);
  return false;
}
function recordFail(role) {
  const d = JSON.parse(localStorage.getItem('lk_' + role) || '{"c":0}');
  d.c = (d.c || 0) + 1;
  if (d.c >= MAX_LOGIN_ATTEMPTS) { d.until = Date.now() + LOCKOUT_DURATION_MS; d.c = 0; }
  localStorage.setItem('lk_' + role, JSON.stringify(d));
  return MAX_LOGIN_ATTEMPTS - (d.c || 0);
}
function clearFail(role) { localStorage.removeItem('lk_' + role); }

// ── LOGIN ─────────────────────────────────
function switchRole(role) {
  closeUD();
  if (role === 'guru') { state.role = 'guru'; applyRole(); startSession(); return; }

  const lk = isLocked(role);
  if (lk) { toast(`🔒 Terkunci ${lk} menit lagi`, 'err'); return; }

  _pendingRole = role;
  const R = ROLES[role];
  $('l-emoji').textContent = R.icon;
  $('l-desc').textContent  = 'Login sebagai ' + R.label;
  $('l-user').value = '';
  $('l-pw').value   = '';
  $('l-err').style.display  = 'none';
  $('l-warn').style.display = 'none';
  $('login-ov').classList.add('open');
  setTimeout(() => $('l-user').focus(), 200);
}

function doLogin() {
  const role = _pendingRole;
  if (!role) return;

  const lk = isLocked(role);
  if (lk) { _showErr('🔒 Terkunci ' + lk + ' menit lagi'); return; }

  const user = san($('l-user').value);
  const pw   = san($('l-pw').value);
  if (!user || !pw) { toast('Username & password wajib diisi', 'warn'); return; }

  if (user !== UNAME[role] || pw !== state.PASS[role]) {
    const left = recordFail(role);
    _showErr('Password salah!');
    if (left <= 2 && left > 0) {
      $('l-warn').style.display = 'flex';
      $('l-warn-txt').textContent = `Tersisa ${left} percobaan sebelum terkunci`;
    }
    $('l-pw').value = '';
    $('l-pw').focus();
    return;
  }

  clearFail(role);
  state.role = role;
  $('login-ov').classList.remove('open');
  applyRole();
  startSession();
  toast('✅ Login sebagai ' + ROLES[role].label, 'ok');
}

function _showErr(msg) {
  const e = $('l-err');
  e.textContent = msg;
  e.style.display = 'block';
}

function cancelLogin() {
  $('login-ov').classList.remove('open');
  _pendingRole = null;
}

function doLogout() {
  closeUD();
  // Import showKonfirm dinamis untuk hindari circular import
  showKonfirm('Keluar?', 'Kembali ke mode Guru?', () => {
    state.role = 'guru';
    clearSession();
    applyRole();
    toast('👋 Keluar', 'info');
  });
}

// ── SESSION ───────────────────────────────
function startSession() {
  clearSession();
  const dur = parseInt($('s-sess')?.value || '60');
  if (!dur) return;

  _sessExp = Date.now() + dur * 60000;
  _sessTimer = setInterval(() => {
    if (!_sessExp) return;
    const left = _sessExp - Date.now();
    if (left <= 0) {
      clearSession();
      state.role = 'guru';
      applyRole();
      toast('⏱ Sesi habis. Silakan login ulang.', 'warn', 4000);
      return;
    }
    if (left <= 5 * 60000) showSessWarn(Math.ceil(left / 60000));
  }, 30000);
}

function clearSession() {
  if (_sessTimer) { clearInterval(_sessTimer); _sessTimer = null; }
  _sessExp = null;
  hideSessWarn();
}

function renewSession() {
  startSession();
  hideSessWarn();
  toast('✅ Sesi diperpanjang', 'ok');
}

// ── APPLY ROLE — update seluruh UI ────────
function applyRole() {
  const { role } = state;
  const isAdmin = role === 'admin';
  const isPriv  = isAdmin || role === 'kepsek';
  const isYay   = role === 'yayasan';
  const isGuru  = role === 'guru';

  // Helper null-safe
  function sd(id, val) { const e = $(id); if (e) e.style.display = val; }
  function sc(id, val) { const e = $(id); if (e) e.textContent   = val; }
  function tc(id, cls, v){ const e=$(id); if(e) e.classList.toggle(cls,v); }

  // Topbar
  sc('ud-av',   ROLES[role].icon);
  sc('ud-nm',   ROLES[role].label);
  sc('ud-role', ROLES[role].label);

  // Dropdown active state
  ['guru','admin','kepsek','yayasan'].forEach(r => {
    const el = $('udi-' + r);
    if (el) el.classList.toggle('act', r === role);
  });
  sd('udi-out', isGuru ? 'none' : 'flex');

  // Bottom nav - pakai inline style untuk override CSS default
  function sdf(id, val) {
    const e = $(id);
    if (e) e.setAttribute('style', 'display:' + val + ' !important');
  }
  // Nav sesuai role
  // Guru    : Dashboard, Scan, Manual
  // Admin   : Dashboard, Scan, Manual, ID Card, Guru, Rekap, Setting
  // Kepsek  : Dashboard, Scan, Manual, Guru, Rekap
  // Yayasan : Dashboard, Guru, Rekap
  sdf('bn-dash',    'flex');
  sdf('bn-scan',    isYay   ? 'none' : 'flex');
  sdf('bn-manual',  isYay   ? 'none' : 'flex');
  sdf('bn-qr',      isAdmin ? 'flex' : 'none');
  sdf('bn-guru',    isGuru  ? 'none' : 'flex');
  sdf('bn-rekap',   isGuru  ? 'none' : 'flex');
  sdf('bn-setting', isAdmin ? 'flex' : 'none');

  // Tahunan tab
  sd('pt-tahunan', isPriv ? 'block' : 'none');

  // Guru tab
  sd('btn-tambah', isAdmin ? 'flex' : 'none');
  sd('import-sec', isAdmin ? 'block' : 'none');

  // Setting keamanan
  sd('sec-security', isAdmin ? 'block' : 'none');

  // Dashboard absen & FAB
  sd('absen-grid', isYay ? 'none' : 'grid');
  const fab = $('fab');
  if (fab) fab.classList.toggle('on', !isYay);

  // Manual form - null-safe
  if (isYay) {
    sd('info-admin', 'none'); sd('info-guru', 'none');
    sd('info-yay', 'flex'); sd('frm-manual', 'none');
  } else {
    sd('info-yay', 'none'); sd('frm-manual', 'block');
    sd('info-admin', isGuru ? 'none' : 'flex');
    sd('info-guru',  isGuru ? 'flex' : 'none');
    // Opsi Alpha: hanya admin & kepsek
    const tipeOpts = Array.from($('mg-tipe')?.options || []);
    tipeOpts.forEach(o => {
      if (o.value === 'alpha') o.style.display = isGuru ? 'none' : '';
    });
  }

  updateInfoBar();
  updateAbsenBtns();
  document.dispatchEvent(new CustomEvent('roleChanged', { detail: { role } }));
}

// ── CHECK ROLE ────────────────────────────
function checkRole(roles) {
  if (!roles.includes(state.role)) {
    toast('⛔ Akses tidak diizinkan untuk role ' + ROLES[state.role].label, 'err');
    return false;
  }
  return true;
}


/* === guru.js === */
// ─────────────────────────────────────────
// guru.js — Kelola Data Guru
// ─────────────────────────────────────────

// ── Isi semua <select> yang butuh daftar guru
function fillSelects() {
  const list = Object.entries(state.guruData)
    .filter(([, g]) => (g.status || 'aktif') === 'aktif')
    .sort((a, b) => a[1].nama.localeCompare(b[1].nama));

  ['mg-guru', 'qr-sel'].forEach(selId => {
    const sel = $(selId);
    if (!sel) return;
    const prev = sel.value;
    // Hapus semua kecuali option pertama (placeholder)
    while (sel.options.length > 1) sel.remove(1);
    list.forEach(([id, g]) => {
      const opt = document.createElement('option');
      opt.value       = id;
      opt.textContent = g.nama + (g.mapel ? ' — ' + g.mapel : '');
      sel.appendChild(opt);
    });
    // Kembalikan pilihan sebelumnya kalau masih valid
    if (prev && state.guruData[prev]) sel.value = prev;
  });
}

// ── Render grid kartu guru
function renderGuru() {
  const grid = $('guru-grid');
  if (!grid) return;

  const q = ($('cari-guru')?.value || '').toLowerCase();
  const isAdmin = state.role === 'admin';

  const list = Object.entries(state.guruData)
    .filter(([, g]) => (g.nama || '').toLowerCase().includes(q) && (g.status || 'aktif') === 'aktif')
    .sort((a, b) => a[1].nama.localeCompare(b[1].nama));

  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="ei">👥</div><p>Belum ada data guru</p></div>`;
    return;
  }

  grid.innerHTML = list.map(([id, g]) => `
    <div class="gc">
      <div class="gcav" style="background:${avColor(g.nama)}22;color:${avColor(g.nama)}">
        ${g.foto
          ? `<img src="${esc(g.foto)}" alt="${esc(g.nama)}">`
          : `<span>${avInitial(g.nama)}</span>`}
      </div>
      <div class="gcnm" title="${esc(g.nama)}">${esc(g.nama)}</div>
      <div class="gcsb">${esc(g.mapel || '-')}</div>
      ${g.jenis === 'quran'
        ? `<div style="margin-bottom:5px">
            <span class="chip" style="background:var(--tl2);color:var(--tl);border-color:var(--tl)">📖 Al Quran</span>
           </div>`
        : ''}
      ${isAdmin ? `
        <div class="gc-acts">
          <button class="gbtn" style="background:var(--bl2);color:var(--bl)"
            onclick="window._app.showFormGuru('${esc(id)}')">✏️</button>
          <button class="gbtn" style="background:var(--rd2);color:var(--rd)"
            onclick="window._app.hapusGuru('${esc(id)}','${esc(g.nama)}')">🗑</button>
        </div>` : ''}
    </div>`).join('');
}

// ── Form tambah/edit guru
function showFormGuru(id) {
  $('form-guru').style.display = 'block';
  $('fg-ttl').textContent = id ? '✏️ Edit Guru' : '➕ Tambah Guru';
  $('g-id').value = id || '';

  if (id && state.guruData[id]) {
    const g = state.guruData[id];
    $('g-nama').value   = g.nama   || '';
    $('g-mapel').value  = g.mapel  || '';
    $('g-nip').value    = g.nip    || '';
    $('g-jenis').value  = g.jenis  || 'umum';
    $('g-status').value = g.status || 'aktif';
    $('foto-prev').innerHTML = g.foto
      ? `<img src="${esc(g.foto)}" alt="foto">`
      : '👤';
  } else {
    $('g-nama').value   = '';
    $('g-mapel').value  = '';
    $('g-nip').value    = '';
    $('g-jenis').value  = 'umum';
    $('g-status').value = 'aktif';
    $('foto-prev').innerHTML = '👤';
  }
  $('form-guru').scrollIntoView({ behavior: 'smooth' });
}

function hideFormGuru() {
  $('form-guru').style.display = 'none';
}

function simpanGuru() {
  if (!checkRole(['admin'])) return;
  const nama = san($('g-nama').value);
  if (!nama) { toast('Nama guru wajib diisi', 'warn'); return; }

  const data = {
    nama,
    mapel:     san($('g-mapel').value),
    nip:       san($('g-nip').value),
    jenis:     $('g-jenis').value,
    status:    $('g-status').value,
    updatedAt: Date.now(),
  };
  const fotoImg = document.querySelector('#foto-prev img');
  if (fotoImg) data.foto = fotoImg.src;

  const id  = $('g-id').value;
  const ref = id ? DB.ref('guru/' + id) : DB.ref('guru').push();
  ref.set(data)
    .then(() => { toast('✅ Guru disimpan', 'ok'); hideFormGuru(); })
    .catch(() => toast('❌ Gagal menyimpan', 'err'));
}

function hapusGuru(id, nama) {
  if (!checkRole(['admin'])) return;
  showKonfirm('Hapus Guru', `Yakin hapus ${esc(nama)}?`, () => {
    DB.ref('guru/' + id).remove()
      .then(() => toast('✅ Guru dihapus', 'ok'))
      .catch(() => toast('❌ Gagal', 'err'));
  });
}

function handleFoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Foto maksimal 2MB', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    $('foto-prev').innerHTML = `<img src="${e.target.result}" alt="foto">`;
  };
  reader.readAsDataURL(file);
}

// ── Import dari Google Sheets ─────────────
function importSheets() {
  if (!checkRole(['admin'])) return;
  const url = $('sheets-url')?.value.trim();
  if (!url) { toast('Masukkan URL Google Sheets', 'warn'); return; }

  let csvUrl = url.includes('/edit')
    ? url.replace('/edit', '/export?format=csv&gid=0')
    : url + (url.includes('?') ? '&' : '?') + 'format=csv';

  const spin = $('imp-spin');
  if (spin) spin.innerHTML = '<span class="spin"></span> ';

  fetch(csvUrl)
    .then(r => r.text())
    .then(txt => {
      const lines = txt.split('\n').filter(l => l.trim());
      lines.shift(); // hapus header
      const updates = {};
      let count = 0;
      lines.forEach(line => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (!cols[0]) return;
        const key = DB.ref('guru').push().key;
        updates[key] = {
          nama:      san(cols[0]),
          mapel:     san(cols[1] || ''),
          nip:       san(cols[2] || ''),
          jenis:     (cols[3] || '').toLowerCase().includes('quran') ? 'quran' : 'umum',
          status:    'aktif',
          createdAt: Date.now(),
        };
        count++;
      });
      return DB.ref('guru').update(updates).then(() => count);
    })
    .then(count => {
      toast(`✅ ${count} guru berhasil diimport`, 'ok');
      if (spin) spin.innerHTML = '';
    })
    .catch(() => {
      toast('❌ Gagal mengambil data. Cek URL & izin Sheets.', 'err', 4000);
      if (spin) spin.innerHTML = '';
    });
}


/* === absensi.js === */
// ─────────────────────────────────────────
// absensi.js — Logika Absensi
// ─────────────────────────────────────────

let _scanner = null;

// ── Buka scan (dari tombol dashboard) ─────
function bukaAbsen(tipe) {
  if (state.role === 'yayasan') { toast('🚫 Yayasan tidak bisa absen', 'err'); return; }
  if (isWeekend()) { toast('📅 Hari Libur — absen tidak tersedia', 'warn'); return; }

  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const { JAM } = state;
  if (tipe === 'masuk' && (now < toMin(JAM.mulai) || now > toMin(JAM.maxmasuk))) {
    toast(`⏰ Absen masuk hanya ${JAM.mulai}–${JAM.maxmasuk}`, 'warn'); return;
  }
  if (tipe === 'pulang' && (now < toMin(JAM.pulang) || now > toMin(JAM.maxpulang))) {
    toast(`⏰ Absen pulang hanya ${JAM.pulang}–${JAM.maxpulang}`, 'warn'); return;
  }

  if(window._app) window._app.goTab('scan');
  startScanner(tipe);
}

// ── Proses absensi (dari scan QR) ─────────

// ─── GEOLOKASI ─────────────────────────────────────────────
// Haversine formula — hitung jarak 2 titik GPS dalam meter
function hitungJarak(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180)
    * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ambil posisi GPS perangkat saat ini
function getPosisi() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS tidak tersedia di perangkat ini'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true }
    );
  });
}

// Cek apakah guru berada dalam radius sekolah
// Admin/Kepsek/Yayasan selalu diizinkan (bypass)
async function cekLokasi() {
  // Hanya guru yang dicek lokasinya
  if (state.role !== 'guru') return true;

  // Kalau lokasi sekolah belum dikonfigurasi admin → skip cek
  if (!state.LOK.aktif || !state.LOK.lat || !state.LOK.lng) return true;

  try {
    const toastId = toast('📍 Mengecek lokasi...', 'info', 15000);
    const pos = await getPosisi();
    const jarak = hitungJarak(pos.lat, pos.lng, state.LOK.lat, state.LOK.lng);
    const jarakM = Math.round(jarak);

    if (jarak <= state.LOK.radius) {
      return true;
    } else {
      toast(
        `❌ Anda berada ${jarakM}m dari sekolah.
Absensi hanya bisa dilakukan dalam radius ${state.LOK.radius}m dari sekolah.`,
        'err', 6000
      );
      return false;
    }
  } catch(e) {
    // GPS gagal — izinkan tetapi beri peringatan
    console.warn('GPS gagal:', e.message);
    toast('⚠️ Lokasi tidak terdeteksi, absensi dicatat tanpa verifikasi GPS', 'warn', 4000);
    return true;
  }
}

// Simpan koordinat GPS sekolah saat ini (hanya Admin)
async function simpanLokasi() {
  if (!checkRole(['admin'])) return;
  try {
    toast('📍 Mengambil koordinat GPS...', 'info', 8000);
    const pos = await getPosisi();
    const radius = parseInt($('s-radius')?.value || 200);
    await DB.ref('setting/lokasi').set({
      lat:   pos.lat,
      lng:   pos.lng,
      radius,
      aktif: true,
    });
    Object.assign(state.LOK, { lat: pos.lat, lng: pos.lng, radius, aktif: true });
    applyLokasi();
    toast(`✅ Lokasi sekolah disimpan!
${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}
Radius: ${radius}m`, 'ok', 5000);
  } catch(e) {
    if (e.code === 1) toast('❌ Izin lokasi ditolak. Aktifkan GPS di pengaturan HP.', 'err');
    else if (e.code === 3) toast('❌ GPS timeout. Pastikan sinyal GPS aktif.', 'err');
    else toast('❌ Gagal ambil lokasi: ' + e.message, 'err');
  }
}

// Simpan hanya radius
async function simpanRadius() {
  if (!checkRole(['admin'])) return;
  const radius = parseInt($('s-radius')?.value || 200);
  if (radius < 50 || radius > 2000) { toast('Radius harus 50–2000 meter', 'warn'); return; }
  await DB.ref('setting/lokasi/radius').set(radius);
  state.LOK.radius = radius;
  toast(`✅ Radius diperbarui: ${radius}m`, 'ok');
}

// Nonaktifkan cek lokasi (admin bisa matikan sementara)
async function toggleLokasi() {
  if (!checkRole(['admin'])) return;
  state.LOK.aktif = !state.LOK.aktif;
  await DB.ref('setting/lokasi/aktif').set(state.LOK.aktif);
  applyLokasi();
  toast(state.LOK.aktif ? '🔒 Verifikasi lokasi AKTIF' : '🔓 Verifikasi lokasi NONAKTIF', 'info');
}

// Apply state.LOK ke UI Setting
function applyLokasi() {
  const info = $('lok-info');
  const coords = $('lok-coords');
  const toggle = $('lok-toggle');
  const radiusEl = $('s-radius');

  if (radiusEl) radiusEl.value = state.LOK.radius;
  if (toggle) {
    toggle.textContent = state.LOK.aktif ? '🔒 Nonaktifkan' : '🔓 Aktifkan';
    toggle.style.background = state.LOK.aktif ? 'var(--gn)' : 'var(--rd)';
  }
  if (coords) {
    if (state.LOK.lat && state.LOK.lng) {
      coords.innerHTML = `<span style="color:var(--gn)">✅ Lokasi tersimpan:</span>
        ${state.LOK.lat.toFixed(6)}, ${state.LOK.lng.toFixed(6)} · Radius ${state.LOK.radius}m
        · Status: <strong>${state.LOK.aktif ? 'AKTIF' : 'NONAKTIF'}</strong>`;
    } else {
      coords.innerHTML = '<span style="color:var(--yl)">⚠️ Lokasi sekolah belum diset. Klik "Simpan Lokasi Sekarang" saat berada di sekolah.</span>';
    }
  }
}

async function doAbsen(guruId, tipe, metode = 'scan') {
  if (state.role === 'yayasan') { toast('🚫 Tidak bisa absen', 'err'); return; }
  if (isWeekend()) { toast('📅 Hari Libur', 'warn'); return; }

  // CEK LOKASI — Guru harus berada di sekitar sekolah
  const lokasiOk = await cekLokasi();
  if (!lokasiOk) return;

  const g = state.guruData[guruId];
  if (!g) { toast('❌ Guru tidak ditemukan', 'err'); return; }

  const key = `${guruId}_${tipe}`;
  if (state.absensiData[key]) { toast(`⚠️ ${g.nama} sudah absen ${tipe}!`, 'warn'); return; }

  const now    = new Date().getHours() * 60 + new Date().getMinutes();

  // Validasi jam absen — sudah dihandle updateAbsenBtns tapi double-check di sini
  if (tipe === 'masuk' && now > toMin(state.JAM.maxmasuk)) {
    toast('⏰ Sudah melewati batas jam masuk', 'warn'); return;
  }
  if (tipe === 'pulang' && now > toMin(state.JAM.maxpulang)) {
    toast('⏰ Sudah melewati batas jam pulang', 'warn'); return;
  }

  const batas  = g.jenis === 'quran' ? state.JAM.quran_batas : state.JAM.batas;
  const status = tipe === 'masuk' ? (now > toMin(batas) ? 'terlambat' : 'hadir') : 'hadir';

  DB.ref(`absensi/${today()}/${key}`).set({
    guruId, nama: g.nama, mapel: g.mapel || '',
    waktu: nowHM(), status, tipe, metode,
    tanggal: today(), createdAt: Date.now(), createdBy: state.role,
  }).then(() => {
    toast(`${status === 'hadir' ? '✅ Hadir' : '⚠️ Terlambat'} — ${g.nama}`, 'ok', 3000);
    if (navigator.vibrate) navigator.vibrate(tipe === 'masuk' ? [80, 40, 80] : [160]);
  }).catch(e => { console.error(e); toast('❌ Gagal menyimpan absensi', 'err'); });
}

// ── Form manual ───────────────────────────
function onTipeChange() {
  const tipe = $('mg-tipe')?.value;
  $('wrap-ket').style.display    = ['izin','sakit','alpha'].includes(tipe) ? 'block' : 'none';
  $('wrap-status').style.display = tipe === 'masuk' ? 'block' : 'none';
  $('ket-lbl').textContent       = tipe === 'alpha' ? 'Keterangan (opsional)' : 'Keterangan *';
}

function onGuruPilih() {
  const id   = $('mg-guru').value;
  const info = $('guru-status-info');
  if (!info) return;
  if (!id) { info.style.display = 'none'; return; }

  const mk = state.absensiData[`${id}_masuk`];
  const pk = state.absensiData[`${id}_pulang`];
  const iz = state.absensiData[`${id}_izin`];
  const sk = state.absensiData[`${id}_sakit`];
  const al = state.absensiData[`${id}_alpha`];

  let txt = '⭕ Belum ada absensi hari ini';
  if      (al)      txt = '❌ Sudah Alpha';
  else if (iz)      txt = `📝 Sudah Izin: ${iz.keterangan || '-'}`;
  else if (sk)      txt = `🏥 Sudah Sakit: ${sk.keterangan || '-'}`;
  else if (mk && pk)txt = `✅ Masuk ${mk.waktu} | Pulang ${pk.waktu}`;
  else if (mk)      txt = `⏱ Sudah masuk ${mk.waktu} — belum pulang`;

  info.style.display = 'block';
  info.textContent   = txt;
}

async function simpanManual() {
  if (state.role === 'yayasan') { toast('🚫 Yayasan tidak dapat mengisi absensi', 'err'); return; }

  // CEK LOKASI — Guru harus berada di sekitar sekolah
  const lokasiOk = await cekLokasi();
  if (!lokasiOk) return;

  const guruId = $('mg-guru').value;
  const tipe   = $('mg-tipe').value;
  const ket    = san($('mg-ket').value || '');
  const tgl    = $('mg-tgl').value || today();

  if (!guruId) { toast('Pilih guru terlebih dahulu', 'warn'); return; }
  if (['izin','sakit'].includes(tipe) && !ket) {
    toast(`Keterangan ${tipe} wajib diisi`, 'warn');
    $('mg-ket').focus();
    return;
  }
  if (state.role === 'guru' && tgl !== today()) {
    toast('Guru hanya bisa absen hari ini', 'warn'); return;
  }

  const g = state.guruData[guruId];
  if (!g) { toast('Data guru tidak ditemukan', 'err'); return; }

  const key = `${guruId}_${tipe}`;
  // Cek duplikat - admin/kepsek bisa overwrite, guru tidak
  if (state.absensiData[key]) {
    if (state.role === 'guru') {
      toast(`Sudah ada absensi ${tipe} untuk ${g.nama}`, 'warn'); return;
    }
    // Admin/kepsek: konfirmasi overwrite
    if (!confirm(`${g.nama} sudah punya absensi ${tipe}. Timpa data lama?`)) return;
  }

  let status = $('mg-status')?.value || 'hadir';
  if (tipe === 'izin')  status = 'izin';
  if (tipe === 'sakit') status = 'sakit';
  if (tipe === 'alpha') status = 'alpha';

  DB.ref(`absensi/${tgl}/${key}`).set({
    guruId, nama: g.nama, mapel: g.mapel || '',
    waktu: nowHM(), status, tipe,
    metode: 'manual', keterangan: ket,
    tanggal: tgl, createdAt: Date.now(), createdBy: state.role,
  }).then(() => {
    toast(`✅ Absensi ${tipe} ${g.nama} disimpan`, 'ok');
    resetManual();
  }).catch(() => toast('❌ Gagal menyimpan', 'err'));
}

function resetManual() {
  $('mg-guru').value  = '';
  $('mg-tipe').value  = 'masuk';
  $('mg-ket').value   = '';
  $('mg-tgl').value   = today();
  onTipeChange();
  const info = $('guru-status-info');
  if (info) info.style.display = 'none';
}

// ── Statistik & render list ───────────────
function loadStats() {
  const total = Object.keys(state.guruData)
    .filter(id => (state.guruData[id].status || 'aktif') === 'aktif').length;

  let hadir = 0, tlmbt = 0, izn = 0, alpha = 0;
  const ids = new Set();

  Object.values(state.absensiData).forEach(d => {
    if (['masuk','izin','sakit','alpha'].includes(d.tipe)) ids.add(d.guruId);
    if (d.tipe === 'masuk') {
      if (d.status === 'hadir')     hadir++;
      else if (d.status === 'terlambat') tlmbt++;
    }
    if (d.status === 'izin' || d.status === 'sakit') izn++;
    if (d.status === 'alpha') alpha++;
  });

  const belum = Math.max(0, total - ids.size);
  const pct   = total > 0 ? Math.round(((hadir + tlmbt) / total) * 100) : 0;

  [['s-tot',total],['s-hdr',hadir],['s-tlt',tlmbt],
   ['s-izn',izn],['s-alph',alpha],['s-alp',belum]].forEach(([id,v]) => {
    const el = $(id); if (el) el.textContent = v;
  });

  const pctEl = $('pct'), pbarEl = $('pbar');
  if (pctEl) pctEl.textContent = pct + '%';
  if (pbarEl) {
    pbarEl.style.width      = pct + '%';
    pbarEl.style.background = pct >= 95 ? 'var(--gn)' : pct >= 80 ? 'var(--yl)' : 'var(--rd)';
  }
}

function renderRecent() {
  const c = $('list-recent');
  if (!c) return;
  const items = Object.values(state.absensiData)
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  if (!items.length) {
    c.innerHTML = '<div class="empty"><div class="ei">📋</div><p>Belum ada absensi hari ini</p></div>';
    return;
  }
  c.innerHTML = items.map(d => `
    <div class="litem">
      <div class="lav" style="background:${avColor(d.nama)}22;color:${avColor(d.nama)}">
        ${statusIcon(d.status)}
      </div>
      <div class="linf">
        <div class="lnm">${esc(d.nama)}</div>
        <div class="lsb">${esc(d.mapel || '')} · ${esc(d.tipe)}</div>
      </div>
      <div class="lrt">
        <div class="ltm">${d.waktu || '-'}</div>
        <span class="bdg ${statusBadge(d.status)}">${esc(d.status)}</span>
      </div>
    </div>`).join('');
}

function renderManualLog() {
  const c = $('list-manual');
  if (!c) return;
  const canEdit = state.role === 'admin' || state.role === 'kepsek';
  const items = Object.entries(state.absensiData)
    .sort((a, b) => b[1].createdAt - a[1].createdAt);
  if (!items.length) {
    c.innerHTML = '<div class="empty"><div class="ei">📋</div><p>Belum ada absensi</p></div>';
    return;
  }
  c.innerHTML = items.map(([key, d]) => `
    <div class="litem" ${canEdit ? `onclick="window._app.openEdit('${esc(key)}')" style="cursor:pointer"` : ''}>
      <div class="lav" style="background:${avColor(d.nama)}22;color:${avColor(d.nama)}">
        ${statusIcon(d.status)}
      </div>
      <div class="linf">
        <div class="lnm">${esc(d.nama)}</div>
        <div class="lsb">${esc(d.tipe)} · ${d.metode === 'manual' ? 'Manual' : 'Scan'} · ${d.waktu || '-'}</div>
      </div>
      <div class="lrt">
        <span class="bdg ${statusBadge(d.status)}">${esc(d.status)}</span>
      </div>
    </div>`).join('');
}

// ── Edit absensi (Admin/Kepsek) ───────────
function openEdit(key) {
  if (!checkRole(['admin','kepsek'])) return;
  const d = state.absensiData[key];
  if (!d) { toast('Data tidak ditemukan', 'err'); return; }
  $('e-nama').value   = d.nama || '';
  $('e-status').value = d.status || 'hadir';
  $('e-waktu').value  = d.waktu || '';
  $('e-ket').value    = d.keterangan || '';
  $('e-key').value    = key;
  $('e-tgl').value    = d.tanggal || today();
  $('mov-edit').classList.add('open');
}

function simpanEditAbsensi() {
  if (!checkRole(['admin','kepsek'])) return;
  const key = $('e-key').value;
  const tgl = $('e-tgl').value || today();
  DB.ref(`absensi/${tgl}/${key}`).update({
    status:     $('e-status').value,
    waktu:      $('e-waktu').value,
    keterangan: san($('e-ket').value),
    editedBy:   state.role,
    editedAt:   Date.now(),
  }).then(() => {
    closeModal('mov-edit');
    toast('✅ Absensi diperbarui', 'ok');
  }).catch(() => toast('❌ Gagal', 'err'));
}

function hapusAbsensi() {
  if (!checkRole(['admin'])) return;
  const key = $('e-key').value;
  const tgl = $('e-tgl').value || today();
  showKonfirm('Hapus Absensi', 'Yakin hapus data ini?', () => {
    DB.ref(`absensi/${tgl}/${key}`).remove()
      .then(() => { closeModal('mov-edit'); toast('🗑 Dihapus', 'ok'); })
      .catch(() => toast('❌ Gagal', 'err'));
  });
}

// ── Alpha Otomatis ────────────────────────
function scheduleAlpha() {
  setInterval(() => {
    if (isWeekend()) return;
    const d   = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    if (now !== toMin(state.JAM.jam_alpha)) return;
    Object.entries(state.guruData).forEach(([id, g]) => {
      if ((g.status || 'aktif') !== 'aktif') return;
      const key = `${id}_masuk`;
      if (!state.absensiData[key]) {
        DB.ref(`absensi/${today()}/${key}`).set({
          guruId: id, nama: g.nama, mapel: g.mapel || '',
          waktu: state.JAM.jam_alpha, status: 'alpha',
          tipe: 'masuk', metode: 'otomatis',
          tanggal: today(), createdAt: Date.now(), createdBy: 'system',
        });
      }
    });
  }, 60000);
}

// ── Scanner QR ────────────────────────────
function startScanner(tipe) {
  $('scan-ttl').textContent = `📷 Scan — Absen ${tipe === 'masuk' ? 'Masuk' : 'Pulang'}`;
  $('scan-sub').textContent = 'Arahkan kamera ke QR Code ID Card guru';
  $('scan-res').style.display = 'none';

  if (_scanner) { try { _scanner.stop(); } catch (e) {} }
  _scanner = new Html5Qrcode('qr-reader');
  _scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
    text => {
      try {
        const data = JSON.parse(text);
        if (!data.guruId || !state.guruData[data.guruId]) {
          toast('QR tidak valid', 'err'); return;
        }
        _scanner.stop();
        const g = state.guruData[data.guruId];
        $('scan-res').style.display = 'block';
        $('scan-res').innerHTML = `<div class="alert a-info">
          <span>🔍</span><span>Memproses: <b>${esc(g.nama)}</b>...</span></div>`;
        setTimeout(() => {
          doAbsen(data.guruId, tipe, 'scan');
          if(window._app) window._app.goTab('dash');
        }, 800);
      } catch (e) { toast('Format QR tidak dikenali', 'err'); }
    },
    () => {}
  ).catch(e => { toast('Kamera tidak bisa dibuka', 'err'); console.error(e); });
}

function stopScanner() {
  if (_scanner) { try { _scanner.stop(); } catch (e) {} }
}


/* === rekap.js === */
// ─────────────────────────────────────────
// rekap.js — Rekap Absensi & Export
// ─────────────────────────────────────────

// ── Helpers ───────────────────────────────
function guruAktif() {
  return Object.entries(state.guruData)
    .filter(([, g]) => (g.status || 'aktif') === 'aktif')
    .sort((a, b) => a[1].nama.localeCompare(b[1].nama));
}

function fetchDates(dates) {
  return Promise.all(dates.map(tgl =>
    DB.ref('absensi/' + tgl).once('value').then(snap => {
      const o = {};
      snap.forEach(ch => { o[ch.key] = ch.val(); });
      return { tgl, o };
    })
  ));
}

function calcStat(allData, id) {
  let h = 0, t = 0, iz = 0, sk = 0, al = 0, tot = 0;
  allData.forEach(({ tgl, o }) => {
    const dow = new Date(tgl + 'T00:00:00').getDay();
    if (dow === 0 || dow === 6) return; // skip akhir pekan
    tot++;
    const mk  = o[`${id}_masuk`];
    const izv = o[`${id}_izin`];
    const skv = o[`${id}_sakit`];
    const alv = o[`${id}_alpha`];
    if      (alv)                      al++;
    else if (izv)                      iz++;
    else if (skv)                      sk++;
    else if (mk?.status === 'hadir')   h++;
    else if (mk?.status === 'terlambat') t++;
    else                               al++; // tidak hadir = alpha
  });
  return { h, t, iz, sk, al, tot };
}

function rekapRow(i, g, s) {
  const pct = s.tot > 0 ? Math.round(((s.h + s.t) / s.tot) * 100) : 0;
  const cl  = pct >= 95 ? 'ok' : pct >= 80 ? 'tl' : 'al';
  return `<tr>
    <td style="color:var(--tx3)">${i + 1}</td>
    <td><b>${esc(g.nama)}</b></td>
    <td style="font-size:11px">${esc(g.mapel || '-')}</td>
    <td style="color:var(--gn);font-weight:700">${s.h}</td>
    <td style="color:var(--yl);font-weight:700">${s.t}</td>
    <td style="color:var(--bl);font-weight:700">${s.iz}</td>
    <td style="color:var(--pi);font-weight:700">${s.sk}</td>
    <td style="color:var(--rd);font-weight:700">${s.al}</td>
    <td><span class="bdg ${cl}">${pct}%</span></td>
  </tr>`;
}

function emptyRow(cols) {
  return `<tr><td colspan="${cols}">
    <div class="empty"><div class="ei">📭</div><p>Tidak ada data</p></div>
  </td></tr>`;
}

function loadingRow(cols) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:var(--tx3)">
    ⏳ Memuat data...
  </td></tr>`;
}

// ── Period Tab ────────────────────────────
function setPeriod(p, btn) {
  state.period = p;
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  ['harian','bulanan','semester','tahunan'].forEach(id => {
    const el = $('r-' + id);
    if (el) el.style.display = id === p ? 'block' : 'none';
  });
  if      (p === 'harian')   loadHarian();
  else if (p === 'bulanan')  loadBulanan();
  else if (p === 'semester') loadSemester();
  else if (p === 'tahunan')  loadTahunan();
}

// ── HARIAN ───────────────────────────────
function loadHarian() {
  const tgl = $('r-tgl')?.value || today();
  const tbody = $('tbl-h');
  if (!tbody) return;
  tbody.innerHTML = loadingRow(6);

  DB.ref('absensi/' + tgl).once('value').then(snap => {
    const data = {};
    snap.forEach(ch => { data[ch.key] = ch.val(); });
    const gl = guruAktif();
    state.rekapCache = { tgl, data, gl };
    renderHarian(gl, data);
  });
}

function renderHarian(gl, data) {
  const tbody = $('tbl-h');
  if (!tbody) return;
  const q = ($('cari-rekap')?.value || '').toLowerCase();
  const filtered = gl.filter(([, g]) => g.nama.toLowerCase().includes(q));

  tbody.innerHTML = filtered.map(([id, g], i) => {
    const mk = data[`${id}_masuk`];
    const pk = data[`${id}_pulang`];
    const iz = data[`${id}_izin`];
    const sk = data[`${id}_sakit`];
    const al = data[`${id}_alpha`];

    let st = 'Belum', sc = 'lb', masuk = '-', pulang = '-', ket = '';
    if      (al) { st = 'Alpha';    sc = 'al'; }
    else if (iz) { st = 'Izin';     sc = 'iz'; ket = iz.keterangan || ''; }
    else if (sk) { st = 'Sakit';    sc = 'sk'; ket = sk.keterangan || ''; }
    else if (mk) {
      masuk  = mk.waktu || '-';
      st     = mk.status === 'hadir' ? 'Hadir' : 'Terlambat';
      sc     = mk.status === 'hadir' ? 'ok' : 'tl';
      if (pk) pulang = pk.waktu || '-';
    }

    const canEdit = (state.role === 'admin' || state.role === 'kepsek') && mk;
    const eKey    = mk ? `${id}_masuk` : '';

    return `<tr ${canEdit ? `onclick="window._app.openEdit('${esc(eKey)}')" style="cursor:pointer"` : ''}>
      <td style="color:var(--tx3)">${i + 1}</td>
      <td><b>${esc(g.nama)}</b><br>
          <span style="font-size:10px;color:var(--tx3)">${esc(g.mapel || '')}</span></td>
      <td>${masuk}</td>
      <td>${pulang}</td>
      <td><span class="bdg ${sc}">${st}</span></td>
      <td style="font-size:11px;color:var(--tx2)">${esc(ket)}</td>
    </tr>`;
  }).join('');

  if (!filtered.length) tbody.innerHTML = emptyRow(6);
}

function filterRekap() {
  if (state.rekapCache?.data) renderHarian(state.rekapCache.gl, state.rekapCache.data);
}

// ── BULANAN ───────────────────────────────
function loadBulanan() {
  const bln  = parseInt($('r-bln')?.value  || new Date().getMonth() + 1);
  const thn  = parseInt($('r-thn-b')?.value || new Date().getFullYear());
  const tbody = $('tbl-b');
  if (!tbody) return;
  tbody.innerHTML = loadingRow(9);

  const days  = new Date(thn, bln, 0).getDate();
  const dates = Array.from({ length: days }, (_, i) => `${thn}-${pad(bln)}-${pad(i + 1)}`);

  fetchDates(dates).then(allData => {
    const gl = guruAktif();
    tbody.innerHTML = gl.map(([id, g], i) => rekapRow(i, g, calcStat(allData, id))).join('') || emptyRow(9);
  }).catch(e => {
    console.error('loadBulanan error:', e);
    tbody.innerHTML = emptyRow(9);
    toast('❌ Gagal memuat rekap bulanan', 'err');
  });
}

// ── SEMESTER ──────────────────────────────
function loadSemester() {
  const sem   = parseInt($('r-sem')?.value  || 1);
  const thn   = parseInt($('r-thn-s')?.value || new Date().getFullYear());
  const bulan = sem === 1 ? [7,8,9,10,11,12] : [1,2,3,4,5,6];
  const tbody = $('tbl-s');
  if (!tbody) return;
  tbody.innerHTML = loadingRow(9);

  const dates = bulan.flatMap(m => {
    const days = new Date(thn, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => `${thn}-${pad(m)}-${pad(i + 1)}`);
  });

  fetchDates(dates).then(allData => {
    const gl = guruAktif();
    $('tbl-s').innerHTML = gl.map(([id, g], i) => rekapRow(i, g, calcStat(allData, id))).join('') || emptyRow(9);
  });
}

// ── TAHUNAN ───────────────────────────────
function loadTahunan() {
  if (!checkRole(['admin','kepsek'])) return;
  const thn   = parseInt($('r-thn-t')?.value || new Date().getFullYear());
  const tbody = $('tbl-t');
  if (!tbody) return;
  tbody.innerHTML = loadingRow(9);

  const dates = Array.from({ length: 12 }, (_, m) => {
    const days = new Date(thn, m + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => `${thn}-${pad(m + 1)}-${pad(i + 1)}`);
  }).flat();

  fetchDates(dates).then(allData => {
    const gl = guruAktif();
    $('tbl-t').innerHTML = gl.map(([id, g], i) => rekapRow(i, g, calcStat(allData, id))).join('') || emptyRow(9);
  });
}

// ── EXPORT CSV ────────────────────────────
function eksporCSV() {
  const tgl = $('r-tgl')?.value || today();
  const gl  = guruAktif();
  const rows = [['No','Nama','Mapel','Jam Masuk','Jam Pulang','Status','Keterangan']];

  // Gunakan rekapCache jika tanggal cocok, bukan state.absensiData (hari ini saja)
  const src = (state.rekapCache?.tgl === tgl && state.rekapCache?.data)
    ? state.rekapCache.data
    : state.absensiData;

  gl.forEach(([id, g], i) => {
    const mk = src[`${id}_masuk`];
    const pk = src[`${id}_pulang`];
    const iz = src[`${id}_izin`];
    const sk = src[`${id}_sakit`];
    const al = src[`${id}_alpha`];
    let st = 'Belum Absen', masuk = '-', pulang = '-', ket = '';
    if      (al) st = 'Alpha';
    else if (iz) { st = 'Izin';  ket = iz.keterangan || ''; }
    else if (sk) { st = 'Sakit'; ket = sk.keterangan || ''; }
    else if (mk) {
      masuk  = mk.waktu || '-';
      st     = mk.status === 'hadir' ? 'Hadir' : 'Terlambat';
      if (pk) pulang = pk.waktu || '-';
    }
    rows.push([i + 1, g.nama, g.mapel || '-', masuk, pulang, st, ket]);
  });

  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a   = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `absensi_${state.period}_${tgl}.csv`;
  a.click();
  toast('📥 CSV berhasil diunduh', 'ok');
}

// ── EXPORT EXCEL ──────────────────────────
function eksporExcel() {
  const tgl = $('r-tgl')?.value || today();
  const gl  = guruAktif();
  if (!gl.length) { toast('Belum ada data guru', 'warn'); return; }

  const wb   = XLSX.utils.book_new();
  const hdrs = ['No','Nama Guru','Mata Pelajaran','Jam Masuk','Jam Pulang','Status','Keterangan'];

  // Gunakan rekapCache jika tanggal cocok
  const src = (state.rekapCache?.tgl === tgl && state.rekapCache?.data)
    ? state.rekapCache.data
    : state.absensiData;

  const rows = [hdrs, ...gl.map(([id, g], i) => {
    const mk = src[`${id}_masuk`];
    const pk = src[`${id}_pulang`];
    const iz = src[`${id}_izin`];
    const sk = src[`${id}_sakit`];
    const al = src[`${id}_alpha`];
    let st = 'Belum Absen', masuk = '-', pulang = '-', ket = '';
    if      (al) st = 'Alpha';
    else if (iz) { st = 'Izin';  ket = iz.keterangan || ''; }
    else if (sk) { st = 'Sakit'; ket = sk.keterangan || ''; }
    else if (mk) {
      masuk  = mk.waktu || '-';
      st     = mk.status === 'hadir' ? 'Hadir' : 'Terlambat';
      if (pk) pulang = pk.waktu || '-';
    }
    return [i + 1, g.nama, g.mapel || '-', masuk, pulang, st, ket];
  })];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Style header
  const hSt = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'FF6B35' } }, alignment: { horizontal: 'center' } };
  hdrs.forEach((_, ci) => {
    const c = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (ws[c]) ws[c].s = hSt;
  });

  // Warna per status
  const stClr = { Hadir:'06C270', Terlambat:'F59E0B', Izin:'2563EB', Sakit:'EC4899', Alpha:'FF4D6D' };
  rows.slice(1).forEach((row, ri) => {
    const cl = stClr[row[5]];
    if (cl) {
      const c = XLSX.utils.encode_cell({ r: ri + 1, c: 5 });
      if (ws[c]) ws[c].s = { font: { bold: true, color: { rgb: cl } } };
    }
    // Zebra stripes
    if (ri % 2 === 0) {
      [0,1,2,3,4,6].forEach(ci => {
        const c = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (ws[c] && !ws[c].s?.font?.color) ws[c].s = { fill: { fgColor: { rgb: 'F8FAFC' } } };
      });
    }
  });

  ws['!cols'] = [{ wch:5 },{ wch:25 },{ wch:18 },{ wch:12 },{ wch:12 },{ wch:14 },{ wch:25 }];
  XLSX.utils.book_append_sheet(wb, ws, `Absensi ${tgl}`);
  XLSX.writeFile(wb, `absensi_harian_${tgl}.xlsx`);
  toast('✅ Excel berhasil diunduh', 'ok');
}
// ─── EXPORT EXCEL BULANAN (format laporan seperti gambar) ───
function eksporExcelBulanan() {
  const bln = parseInt($('r-bln')?.value || new Date().getMonth() + 1);
  const thn = parseInt($('r-thn-b')?.value || new Date().getFullYear());
  const gl  = guruAktif();
  if (!gl.length) { toast('Belum ada data guru', 'warn'); return; }

  const namaBln = ['','Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'];
  const hariSingkat = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  // Hitung hari dalam bulan
  const jumlahHari = new Date(thn, bln, 0).getDate();

  toast('📊 Membuat Excel bulanan...', 'info', 3000);

  // Kumpulkan data semua tanggal dalam bulan
  const promises = [];
  for (let d = 1; d <= jumlahHari; d++) {
    const tgl = `${thn}-${String(bln).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    promises.push(
      firebase.database().ref('absensi/' + tgl).once('value').then(snap => {
        const data = {};
        snap.forEach(ch => { data[ch.key] = ch.val(); });
        return { tgl, d, data };
      })
    );
  }

  Promise.all(promises).then(allData => {
    const wb = XLSX.utils.book_new();
    const ws = {};
    const merges = [];

    // Helper encode cell
    function ec(r, c) { return XLSX.utils.encode_cell({ r, c }); }
    function setCell(r, c, v, s) {
      const ref = ec(r, c);
      ws[ref] = { v, t: typeof v === 'number' ? 'n' : 's', s: s || {} };
    }

    // Warna
    const CLR = {
      hd:  { patternType:'solid', fgColor:{ rgb:'1565C0' } },
      hm:  { patternType:'solid', fgColor:{ rgb:'1976D2' } },
      hl:  { patternType:'solid', fgColor:{ rgb:'E3F2FD' } },
      hml: { patternType:'solid', fgColor:{ rgb:'0897A7' } },
      gb:  { patternType:'solid', fgColor:{ rgb:'FFF8E1' } },
      lb:  { patternType:'solid', fgColor:{ rgb:'F5F5F5' } },
      tb:  { patternType:'solid', fgColor:{ rgb:'F3E5F5' } },
      we:  { patternType:'solid', fgColor:{ rgb:'EF9A9A' } },  // weekend
      h:   { patternType:'solid', fgColor:{ rgb:'C8E6C9' } },
      tl:  { patternType:'solid', fgColor:{ rgb:'FFF9C4' } },
      iz:  { patternType:'solid', fgColor:{ rgb:'BBDEFB' } },
      sk:  { patternType:'solid', fgColor:{ rgb:'F8BBD0' } },
      al:  { patternType:'solid', fgColor:{ rgb:'FFCDD2' } },
      lbr: { patternType:'solid', fgColor:{ rgb:'EEEEEE' } },
      ko:  { patternType:'solid', fgColor:{ rgb:'FAFAFA' } },
    };

    const STATUS_CLR = {
      hadir:     { bg: CLR.h,   txt: { rgb:'1B5E20' }, lbl:'H'   },
      terlambat: { bg: CLR.tl,  txt: { rgb:'F57F17' }, lbl:'TL'  },
      izin:      { bg: CLR.iz,  txt: { rgb:'0D47A1' }, lbl:'I'   },
      sakit:     { bg: CLR.sk,  txt: { rgb:'880E4F' }, lbl:'S'   },
      alpha:     { bg: CLR.al,  txt: { rgb:'B71C1C' }, lbl:'A'   },
      libur:     { bg: CLR.lbr, txt: { rgb:'616161' }, lbl:'LBR' },
    };

    // Border helpers
    const bThin = { style:'thin', color:{ rgb:'CCCCCC' } };
    const bMed  = { style:'medium', color:{ rgb:'666666' } };
    const bHd   = { style:'medium', color:{ rgb:'1565C0' } };
    function mkBorder(t,b,l,r) {
      return { top:t||bThin, bottom:b||bThin, left:l||bThin, right:r||bThin };
    }

    // Font helpers
    function fnt(bold, sz, color) {
      return { bold: bold||false, sz: sz||9, color: { rgb: color||'000000' }, name:'Calibri' };
    }
    function aln(h, v, wrap) {
      return { horizontal: h||'center', vertical: v||'center', wrapText: wrap!==false };
    }

    // Style presets
    const S = {
      hdrTitle:  { font:fnt(true,15,'FFFFFF'), fill:CLR.hd, alignment:aln(), border:mkBorder(bHd,bThin,bHd,bHd) },
      hdrTag:    { font:fnt(false,8,'FFFFFF'), fill:CLR.hml, alignment:aln() },
      hdrRpt:    { font:fnt(true,12,'1565C0'), fill:CLR.hl, alignment:aln(), border:mkBorder(bThin,bMed,bMed,bMed) },
      colHdr:    { font:fnt(true,8,'FFFFFF'),  fill:CLR.hd,  alignment:aln(), border:mkBorder() },
      colHdrMid: { font:fnt(true,8,'FFFFFF'),  fill:CLR.hm,  alignment:aln(), border:mkBorder() },
      colDate:   { font:fnt(true,8,'FFFFFF'),  fill:CLR.hml, alignment:aln(), border:mkBorder() },
      colWE:     { font:fnt(true,8,'FFFFFF'),  fill:CLR.we,  alignment:aln(), border:mkBorder() },
      guruNo:    { font:fnt(true,9,'1565C0'),  fill:CLR.gb,  alignment:aln(), border:mkBorder(bMed,bMed,bMed,bThin) },
      guruNama:  { font:fnt(true,9,'1565C0'),  fill:CLR.gb,  alignment:aln('left','center'), border:mkBorder(bMed,bMed,bThin,bMed) },
      labelSt:   { font:fnt(true,8,'424242'),  fill:CLR.lb,  alignment:aln('left','center'), border:mkBorder(bThin,bThin,bThin,bMed) },
      labelRow:  { font:fnt(false,8,'424242'), fill:CLR.lb,  alignment:aln('left','center'), border:mkBorder(bThin,bThin,bThin,bMed) },
      labelTtd:  { font:fnt(false,8,'424242'), fill:CLR.tb,  alignment:aln('left','center'), border:mkBorder(bThin,bMed,bThin,bMed) },
      sumMerge:  { font:fnt(true,11,'1B5E20'), fill:CLR.h,   alignment:aln(), border:mkBorder(bMed,bMed,bThin,bMed) },
    };

    // Layout kolom
    // 0=No, 1=Nama, 2=Label, 3..3+jumlahHari-1=tanggal, lalu ringkasan
    const CO = 0; // No
    const CN = 1; // Nama
    const CL = 2; // Label
    const CD = 3; // Tanggal mulai (index 0-based)
    const CD_LAST = CD + jumlahHari - 1;
    const CH  = CD_LAST + 1;  // Hadir
    const CTL = CH + 1;
    const CI  = CTL + 1;
    const CS  = CI + 1;
    const CA  = CS + 1;
    const CLBR= CA + 1;
    const CPCT= CLBR + 1;
    const TCOL = CPCT; // total kolom (0-based index terakhir)

    // Lebar kolom (dalam karakter)
    const colWidths = [];
    colWidths[CO] = 4;
    colWidths[CN] = 27;
    colWidths[CL] = 11;
    for (let d = 0; d < jumlahHari; d++) colWidths[CD + d] = 3.6;
    colWidths[CH]   = 5;
    colWidths[CTL]  = 5;
    colWidths[CI]   = 5;
    colWidths[CS]   = 5;
    colWidths[CA]   = 5;
    colWidths[CLBR] = 5.5;
    colWidths[CPCT] = 8;

    ws['!cols'] = colWidths.map(w => ({ wpx: Math.round(w * 7.5) }));

    // Helper merge
    function addMerge(rs, cs, re, ce) {
      merges.push({ s:{ r:rs, c:cs }, e:{ r:re, c:ce } });
    }

    let row = 0; // 0-based

    // ROW 0: Judul Sekolah
    setCell(row, CO, state.identitasData.nama || 'SDIT Qudwatun Hasanah', S.hdrTitle);
    addMerge(row, CO, row, TCOL);
    row++;

    // ROW 1: Tagline
    setCell(row, CO, state.identitasData.tagline || '', S.hdrTag);
    addMerge(row, CO, row, TCOL);
    row++;

    // ROW 2: Judul Laporan
    setCell(row, CO, `LAPORAN ABSENSI BULANAN — ${namaBln[bln].toUpperCase()} ${thn}`, S.hdrRpt);
    addMerge(row, CO, row, TCOL);
    row++;

    // ROW 3: Spacer
    ws[ec(row, CO)] = { v:'', t:'s' };
    addMerge(row, CO, row, TCOL);
    row++;

    const ROW_H1 = row;     // Header row 1
    const ROW_H2 = row + 1; // Header row 2
    row += 2;

    // Header: No, Nama, Label (merge 2 baris)
    ['No', 'Nama Guru', 'Keterangan'].forEach((v, i) => {
      setCell(ROW_H1, i, v, S.colHdr);
      addMerge(ROW_H1, i, ROW_H2, i);
    });

    // Header: "Bulan Mei 2026" (merge semua tanggal, row H1)
    setCell(ROW_H1, CD, `Bulan ${namaBln[bln]} ${thn}`, S.colHdrMid);
    addMerge(ROW_H1, CD, ROW_H1, CD_LAST);

    // Header: tanggal 1-31 (row H2) + nama hari
    for (let d = 1; d <= jumlahHari; d++) {
      const dow = new Date(thn, bln - 1, d).getDay(); // 0=Min
      const isWE = dow === 0 || dow === 6;
      const col = CD + d - 1;
      setCell(ROW_H2, col, d, isWE ? S.colWE : S.colDate);
    }

    // Header: Ringkasan (row H1 merge, row H2 per kolom)
    setCell(ROW_H1, CH, 'Ringkasan', S.colHdr);
    addMerge(ROW_H1, CH, ROW_H1, TCOL);

    const sumHdrs = [
      { c:CH,   v:'H',      fill:CLR.h,   tx:'1B5E20' },
      { c:CTL,  v:'TL',     fill:CLR.tl,  tx:'F57F17' },
      { c:CI,   v:'I',      fill:CLR.iz,  tx:'0D47A1' },
      { c:CS,   v:'S',      fill:CLR.sk,  tx:'880E4F' },
      { c:CA,   v:'A',      fill:CLR.al,  tx:'B71C1C' },
      { c:CLBR, v:'Libur',  fill:CLR.lbr, tx:'616161' },
      { c:CPCT, v:'% Hadir',fill:CLR.hl,  tx:'1565C0' },
    ];
    sumHdrs.forEach(h => {
      setCell(ROW_H2, h.c, h.v, {
        font: fnt(true, 8, h.tx), fill: h.fill,
        alignment: aln(), border: mkBorder()
      });
    });

    // DATA GURU
    const LABELS = ['Status', 'Jam Masuk', 'Jam Pulang', 'TTD'];

    gl.forEach(([id, g], idx) => {
      const rs = row;       // row start
      const re = row + 3;   // row end (4 baris: Status, JM, JP, TTD)

      // No (merge 4 baris)
      setCell(rs, CO, idx + 1, S.guruNo);
      addMerge(rs, CO, re, CO);

      // Nama (merge 4 baris)
      setCell(rs, CN, `${g.nama}
${g.mapel||''}`, S.guruNama);
      addMerge(rs, CN, re, CN);

      // Label baris
      LABELS.forEach((lbl, i) => {
        const r = rs + i;
        const sStyle = i === 0 ? S.labelSt : (i === 3 ? S.labelTtd : S.labelRow);
        setCell(r, CL, lbl, sStyle);
      });

      // Data per tanggal
      const cnt = { hadir:0, terlambat:0, izin:0, sakit:0, alpha:0, libur:0 };

      for (let d = 1; d <= jumlahHari; d++) {
        const col = CD + d - 1;
        const tgl = `${thn}-${String(bln).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dow  = new Date(thn, bln - 1, d).getDay();
        const isWE = dow === 0 || dow === 6;

        const dayData  = allData.find(x => x.d === d)?.data || {};
        const masukKey = `${id}_masuk`;
        const izinKey  = `${id}_izin`;
        const sakitKey = `${id}_sakit`;
        const alphaKey = `${id}_alpha`;
        const pulangKey= `${id}_pulang`;

        let st  = isWE ? 'libur' : '';
        let jm  = '', jp = '';

        if (!isWE) {
          if (dayData[alphaKey])      { st = 'alpha'; }
          else if (dayData[izinKey])  { st = 'izin'; }
          else if (dayData[sakitKey]) { st = 'sakit'; }
          else if (dayData[masukKey]) {
            st = dayData[masukKey].status || 'hadir';
            jm = dayData[masukKey].waktu || '';
            if (dayData[pulangKey]) jp = dayData[pulangKey].waktu || '';
          }
        }

        if (st) cnt[st] = (cnt[st]||0) + 1;

        const sc = STATUS_CLR[st] || { bg: CLR.ko, txt:{ rgb:'000000' }, lbl:'' };

        // Status row
        setCell(rs, col, sc.lbl, {
          font: fnt(true, 8, sc.txt.rgb), fill: sc.bg,
          alignment: aln(), border: mkBorder()
        });
        // Jam Masuk row
        setCell(rs+1, col, jm, {
          font: fnt(false, 7, '424242'),
          fill: (st && !isWE) ? sc.bg : CLR.ko,
          alignment: aln(), border: mkBorder(bThin, bThin, bThin, bThin)
        });
        // Jam Pulang row
        setCell(rs+2, col, jp, {
          font: fnt(false, 7, '424242'),
          fill: (st && !isWE) ? sc.bg : CLR.ko,
          alignment: aln(), border: mkBorder(bThin, bThin, bThin, bThin)
        });
        // TTD row
        setCell(re, col, '', {
          fill: CLR.tb,
          border: mkBorder(bThin, bMed, bThin, bThin)
        });
      }

      // Kolom ringkasan (merge 4 baris)
      const totHadir = cnt.hadir + cnt.terlambat;
      const hariKerja = jumlahHari - cnt.libur;
      const pct = hariKerja > 0 ? Math.round(totHadir / hariKerja * 100) : 0;
      const pctStr = pct + '%';
      const pctFill = pct >= 95 ? CLR.h : (pct >= 80 ? CLR.tl : CLR.al);
      const pctTx   = pct >= 95 ? '1B5E20' : (pct >= 80 ? 'F57F17' : 'B71C1C');

      [
        { c:CH,   v:cnt.hadir,     fill:CLR.h,   tx:'1B5E20' },
        { c:CTL,  v:cnt.terlambat, fill:CLR.tl,  tx:'F57F17' },
        { c:CI,   v:cnt.izin,      fill:CLR.iz,  tx:'0D47A1' },
        { c:CS,   v:cnt.sakit,     fill:CLR.sk,  tx:'880E4F' },
        { c:CA,   v:cnt.alpha,     fill:CLR.al,  tx:'B71C1C' },
        { c:CLBR, v:cnt.libur,     fill:CLR.lbr, tx:'616161' },
        { c:CPCT, v:pctStr,        fill:pctFill, tx:pctTx   },
      ].forEach(h => {
        setCell(rs, h.c, h.v, {
          font: fnt(true, 11, h.tx), fill: h.fill,
          alignment: aln(), border: mkBorder(bMed, bMed, bThin, bMed)
        });
        addMerge(rs, h.c, re, h.c);
      });

      row = re + 1;
    });

    // Legenda
    row++;
    const legRow = row;
    setCell(legRow, CO, 'Keterangan:', { font:fnt(true,8,'1565C0'), alignment:aln('left') });
    addMerge(legRow, CO, legRow, CL);

    const legs = [
      ['H = Hadir', CLR.h, '1B5E20'], ['TL = Terlambat', CLR.tl, 'F57F17'],
      ['I = Izin', CLR.iz, '0D47A1'], ['S = Sakit', CLR.sk, '880E4F'],
      ['A = Alpha', CLR.al, 'B71C1C'], ['Libur = Sabtu/Minggu', CLR.lbr, '616161'],
    ];
    legs.forEach((l, i) => {
      const col = CD + i * 5;
      if (col + 4 > TCOL) return;
      setCell(legRow, col, l[0], {
        font: fnt(true,8,l[2]), fill: l[1],
        alignment: aln(), border: mkBorder()
      });
      addMerge(legRow, col, legRow, col + 4);
    });

    // Tanda Tangan
    const ttdRow = legRow + 2;
    const tglStr = `${namaBln[bln]} ${thn}`;
    // Kiri
    [
      [ttdRow,   'Mengetahui,'],
      [ttdRow+1, 'Pengawas Sekolah'],
      [ttdRow+2, '(________________________)'],
    ].forEach(([r, v]) => {
      setCell(r, CO, v, { font:fnt(r===ttdRow+2,9,'424242'), alignment:aln('center') });
      addMerge(r, CO, r, CO+7);
    });
    // Kanan
    const tcol = CD_LAST - 7;
    [
      [ttdRow,   tglStr,             false],
      [ttdRow+1, 'Kepala Sekolah',   false],
      [ttdRow+2, state.identitasData.nama||'SDIT Qudwatun Hasanah', true],
      [ttdRow+3, '(________________________)', false],
    ].forEach(([r, v, bold]) => {
      setCell(r, tcol, v, { font:fnt(bold,9,bold?'1565C0':'424242'), alignment:aln('center') });
      addMerge(r, tcol, r, TCOL);
    });

    // Set merges dan range
    ws['!merges'] = merges;
    ws['!ref'] = XLSX.utils.encode_range(
      { r:0, c:0 },
      { r: ttdRow+3, c: TCOL }
    );

    // Tinggi baris
    const rowH = [];
    rowH[0] = { hpx: 36 };  // Judul
    rowH[1] = { hpx: 16 };  // Tagline
    rowH[2] = { hpx: 26 };  // Laporan
    rowH[3] = { hpx: 6  };  // Spacer
    rowH[ROW_H1] = { hpx: 24 };
    rowH[ROW_H2] = { hpx: 20 };
    for (let g = 0; g < gl.length; g++) {
      const baseRow = 6 + g * 4;
      rowH[baseRow]   = { hpx: 16 };
      rowH[baseRow+1] = { hpx: 16 };
      rowH[baseRow+2] = { hpx: 16 };
      rowH[baseRow+3] = { hpx: 22 };
    }
    ws['!rows'] = rowH;

    XLSX.utils.book_append_sheet(wb, ws, `${namaBln[bln]} ${thn}`);
    XLSX.writeFile(wb, `rekap_absensi_${namaBln[bln]}_${thn}.xlsx`);
    toast(`✅ Rekap ${namaBln[bln]} ${thn} berhasil diunduh`, 'ok', 3000);
  }).catch(e => {
    console.error(e);
    toast('❌ Gagal membuat Excel', 'err');
  });
}


// ── CETAK PDF ─────────────────────────────
function cetakPDF() {
  const tgl  = $('r-tgl')?.value || today();
  const nama = state.identitasData.nama || 'SDIT Qudwatun Hasanah';
  const tag  = state.identitasData.tagline || '';

  // Buat header sementara untuk print
  let hdr = document.getElementById('print-hdr');
  if (hdr) hdr.remove();
  hdr = document.createElement('div');
  hdr.id = 'print-hdr';
  hdr.style.cssText = 'text-align:center;padding:16px 0 12px;border-bottom:2px solid #333;margin-bottom:14px;display:none';
  // Logo sekolah — ambil dari state, data: URL aman untuk print
  const logoHtml = (state.identitasData.logo && state.identitasData.logo.startsWith('data:'))
    ? `<img src="${state.identitasData.logo}"
        style="width:56px;height:56px;border-radius:12px;object-fit:cover;
               margin-bottom:8px;border:2px solid #FF6B35"
        onerror="this.style.display='none'">`
    : (state.identitasData.logo
        ? `<div style="font-size:36px;margin-bottom:6px">${san(state.identitasData.logo)}</div>`
        : '<div style="font-size:36px;margin-bottom:6px">🕌</div>');

  hdr.innerHTML = `
    ${logoHtml}
    <div style="font-size:18px;font-weight:900">${esc(nama)}</div>
    <div style="font-size:12px;color:#555;margin-bottom:8px">${esc(tag)}</div>
    <div style="font-size:14px;font-weight:700;background:#FF6B35;color:#fff;
      display:inline-block;padding:4px 16px;border-radius:6px;
      -webkit-print-color-adjust:exact;print-color-adjust:exact">
      REKAP ABSENSI ${state.period.toUpperCase()}
    </div>
    <div style="font-size:12px;margin-top:8px">${fmtTgl(tgl)}</div>
    <div style="font-size:10px;color:#777;margin-top:4px">
      Dicetak: ${new Date().toLocaleString('id-ID')}
    </div>`;

  // Buat footer tanda tangan
  let ttd = document.getElementById('print-ttd');
  if (ttd) ttd.remove();
  ttd = document.createElement('div');
  ttd.id = 'print-ttd';
  ttd.style.cssText = 'display:none;justify-content:space-around;margin-top:40px;padding-top:20px';
  ttd.innerHTML = `
    <div style="text-align:center">
      <div style="font-size:11px;margin-bottom:60px">Pengawas Sekolah</div>
      <div style="border-top:1px solid #333;padding-top:4px;font-size:11px">(................................)</div>
    </div>
    <div style="text-align:center">
      <div style="font-size:11px">Mengetahui,</div>
      <div style="font-size:11px;margin-bottom:54px">Kepala Sekolah</div>
      <div style="border-top:1px solid #333;padding-top:4px;font-size:11px">(................................)</div>
    </div>`;

  const content = $('content');
  if (content) { content.prepend(hdr); content.appendChild(ttd); }

  window.print();
  setTimeout(() => { hdr.remove(); ttd.remove(); }, 1000);
}


/* === idcard.js === */
// ─────────────────────────────────────────
// idcard.js — ID Card & QR Code
// ─────────────────────────────────────────

// ── Buat ID Card untuk guru terpilih ──────
function buatIDCard() {
  const id   = $('qr-sel')?.value;
  const disp = $('qr-disp');
  if (!id) { if (disp) disp.style.display = 'none'; return; }

  const g  = state.guruData[id];
  if (!g) return;

  if (disp) disp.style.display = 'flex';

  // Data teks
  $('idc-nm').textContent  = g.nama    || 'Nama Guru';
  $('idc-jbt').textContent = g.mapel   || 'Guru';
  const sn = state.identitasData.nama  || 'SDIT Qudwatun Hasanah';
  $('idc-sn').textContent   = sn;
  $('idc-tag').textContent  = state.identitasData.tagline || 'Sistem Absensi Digital';
  $('idc-ft-sn').textContent = sn;

  // Logo sekolah
  const lEl = $('idc-logo');
  if (lEl) {
    const logo = state.identitasData.logo;
    lEl.innerHTML = logo?.startsWith('http')
      ? `<img src="${esc(logo)}" alt="logo">`
      : `<span style="font-size:22px">${logo || '🏫'}</span>`;
  }

  // Foto guru
  const fEl = $('idc-foto');
  if (fEl) {
    fEl.innerHTML = g.foto
      ? `<img src="${esc(g.foto)}" alt="${esc(g.nama)}">`
      : '👤';
  }

  // QR Code — bersihkan dulu sebelum render baru
  const qrOut = $('qr-out');
  if (qrOut) {
    qrOut.innerHTML = '';
    try {
      new QRCode(qrOut, {
        text:         JSON.stringify({ guruId: id, nama: g.nama, v: 1 }),
        width:        80,
        height:       80,
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (e) { console.error('QR error:', e); }
  }
}

// ── Render grid pilih guru ─────────────────
function renderQrGrid() {
  const grid = $('qr-grid');
  if (!grid) return;

  const list = Object.entries(state.guruData)
    .filter(([, g]) => (g.status || 'aktif') === 'aktif')
    .sort((a, b) => a[1].nama.localeCompare(b[1].nama));

  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="ei">👥</div><p>Belum ada guru</p></div>`;
    return;
  }

  grid.innerHTML = list.map(([id, g]) => `
    <div class="gc" onclick="window._app.pilihQR('${esc(id)}')" style="cursor:pointer">
      <div class="gcav" style="background:${avColor(g.nama)}22;color:${avColor(g.nama)}">
        ${g.foto
          ? `<img src="${esc(g.foto)}" alt="${esc(g.nama)}">`
          : `<span>${avInitial(g.nama)}</span>`}
      </div>
      <div class="gcnm">${esc(g.nama)}</div>
      <div class="gcsb">${esc(g.mapel || '-')}</div>
      <button class="gbtn" style="background:var(--or2);color:var(--or);width:100%">
        🔲 Buat QR
      </button>
    </div>`).join('');
}

// ── Pilih guru dari grid ───────────────────
function pilihQR(id) {
  const sel = $('qr-sel');
  if (sel) sel.value = id;
  buatIDCard();
  $('qr-disp')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Cetak ID Card ukuran CR80 ──────────────
function cetakIDCard() {
  const id = $('qr-sel')?.value;
  if (!id) { toast('Pilih guru terlebih dahulu', 'warn'); return; }

  const card = $('idcard-el');
  if (!card) { toast('ID Card belum dibuat', 'warn'); return; }

  try {
    const win = window.open('', '_blank', 'width=500,height=780');
    if (!win) { toast('❌ Popup diblokir browser — izinkan popup untuk mencetak', 'err'); return; }

    // Clone card dan pastikan gambar inline (bukan referensi eksternal)
    const clone = card.cloneNode(true);
    // Pastikan semua gambar sudah ter-load
    const imgs = clone.querySelectorAll('img');
    imgs.forEach(img => {
      if (img.src.startsWith('data:')) return; // sudah base64, aman
      img.crossOrigin = 'anonymous';
    });

    win.document.write(`<!DOCTYPE html>
<html lang="id"><head>
  <meta charset="UTF-8">
  <title>ID Card — ${esc(state.guruData[id]?.nama || '')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: 53.98mm 85.6mm; margin: 0; }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
      display: flex; flex-direction: column; align-items: center;
      padding: 20px; min-height: 100vh;
      background: #f0f4f8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=DM+Sans:wght@400;600;700&display=swap');
    :root {
  --or:#FF6B35; --or2:#FFF0E8; --or3:#FF8C5A; --or4:#E85520;
  --tl:#0ABAB5; --tl2:#E0FAFA; --tl3:#089E9A;
  --bl:#1976D2; --bl2:#E3F2FD; --bl3:#1565C0;
  --gn:#10B981; --gn2:#D1FAE5; --gn3:#065F46;
  --yl:#F59E0B; --yl2:#FEF3C7; --yl3:#92400E;
  --rd:#EF4444; --rd2:#FEE2E2; --rd3:#991B1B;
  --pi:#EC4899; --pi2:#FCE7F3; --pi3:#9D174D;
  --bg:#F4F5F7; --bg2:#EAECEF; --card:#FFFFFF;
  --tx:#1A1A2E; --tx2:#4B5563; --tx3:#9CA3AF;
  --bdr:#E5E7EB; --bdr2:#D1D5DB;
  --sh:0 1px 3px rgba(0,0,0,.06),0 2px 8px rgba(0,0,0,.06);
  --sh2:0 4px 16px rgba(0,0,0,.1);
  --sh3:0 8px 32px rgba(0,0,0,.14);
  --r:14px; --r2:10px; --r3:8px;
  --grad-or:linear-gradient(135deg,#FF6B35,#FF8C5A);
  --grad-tl:linear-gradient(135deg,#0ABAB5,#089E9A);
  --grad-bl:linear-gradient(135deg,#1976D2,#1565C0);
  --grad-top:linear-gradient(135deg,#FF6B35 0%,#FF8C5A 45%,#0ABAB5 100%);
}
    .idc{width:240px;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(14,100,160,.3);display:flex;flex-direction:column;transition:transform .3s,box-shadow .3s}
.idc:hover{transform:translateY(-5px) scale(1.01);box-shadow:0 28px 70px rgba(14,100,160,.4)}
.idc-top{background:linear-gradient(135deg,#1565C0,#0ABAB5);padding:18px 16px 16px;text-align:center;position:relative;overflow:hidden;flex-shrink:0}
.idc-top::before{content:'';position:absolute;inset:0;opacity:.06;background-image:radial-gradient(circle,#fff 1.5px,transparent 1.5px);background-size:14px 14px}
.idc-top::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#FF6B35,#FFB347,#FF6B35)}
.idc-ti{position:relative;z-index:1}
.idc-logo{width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:23px;margin:0 auto 9px;overflow:hidden}
.idc-logo img{width:100%;height:100%;object-fit:cover}
.idc-sn{font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:2px}
.idc-tag{font-size:8px;color:rgba(255,255,255,.7)}
.idc-body{background:linear-gradient(180deg,#f0f8ff,#e8f7f5,#f5f9ff);display:flex;flex-direction:column;flex:1}
.idc-fc{padding:18px 0 12px;display:flex;justify-content:center}
.idc-foto{width:80px;height:98px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#deeeff,#d5f5ee);display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 0 0 3px #fff,0 0 0 5px rgba(10,186,181,.3)}
.idc-foto img{width:100%;height:100%;object-fit:cover}
.idc-inf{padding:6px 16px 16px;display:flex;flex-direction:column;align-items:center}
.idc-nm{font-size:13px;font-weight:700;color:#0F172A;margin-bottom:7px;text-align:center;line-height:1.3}
.idc-jb{display:inline-flex;align-items:center;gap:5px;background:rgba(21,101,192,.1);border:1px solid rgba(10,186,181,.35);border-radius:20px;padding:4px 12px;margin-bottom:12px}
.idc-dot{width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#FF6B35,#FFB347);flex-shrink:0}
.idc-jbt{font-size:9px;font-weight:600;color:#0B5EA8}
.idc-div{height:1px;width:85%;background:linear-gradient(90deg,transparent,rgba(255,107,53,.4),rgba(10,186,181,.4),transparent);margin-bottom:12px}
.idc-ql{font-size:7px;color:#7a9bb5;text-transform:uppercase;letter-spacing:.6px;font-weight:600;text-align:center;margin-bottom:5px}
.idc-qb{width:90px;height:90px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(21,101,192,.3),0 0 0 3px #1565C0;overflow:hidden;padding:5px;margin:0 auto}
.idc-qb img,.idc-qb canvas{border-radius:5px}
.idc-ft{background:linear-gradient(90deg,#1565C0,#0897A7,#06B89A);padding:9px 14px;display:flex;align-items:center;justify-content:center;gap:8px;flex-shrink:0}
.idc-ftt{font-size:7.5px;font-weight:600;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.6px}
.idc-fd{width:4px;height:4px;border-radius:50%;background:#FF6B35;flex-shrink:0}
    .wrap {
      width: 240px;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(14,100,160,.3);
    }
    .print-btn {
      margin-top: 16px; padding: 10px 24px;
      background: #FF6B35; color: #fff;
      border: none; border-radius: 10px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 14px; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 12px rgba(255,107,53,.4);
    }
    .print-btn:hover { background: #E85520; }
    @media print {
      body { padding: 0; background: white; }
      .print-btn { display: none; }
    }
</style>
</head>
<body>
  <div class="wrap">${clone.outerHTML}</div>
  <button class="print-btn" onclick="window.print()">🖨️ Cetak ID Card</button>
  <script>
    // Tunggu font & gambar load sebelum print
    document.fonts.ready.then(() => setTimeout(() => window.print(), 800));
  <\/script>
</body></html>`);
    win.document.close();
  } catch(e) {
    console.error('cetakIDCard error:', e);
    toast('❌ Gagal cetak ID Card: ' + e.message, 'err');
  }
}

// ── Unduh QR saja sebagai PNG ──────────────
function unduhIDCard() {
  const card = $('idcard-el');
  if (!card) { toast('ID Card belum dibuat. Pilih guru dulu.', 'warn'); return; }
  const id = $('qr-sel')?.value;
  const nama = state.guruData[id]?.nama?.replace(/[^a-zA-Z0-9]/g, '_') || 'idcard';

  // Buat blob HTML untuk diunduh sebagai file
  toast('⏳ Menyiapkan ID Card untuk diunduh...', 'info', 3000);

  // Cukup buka print dialog untuk simpan sebagai PDF/gambar
  cetakIDCard();
  setTimeout(() => toast('💡 Di jendela cetak: pilih "Simpan sebagai PDF" untuk menyimpan file', 'info', 6000), 1500);
}

function unduhQR() {
  const canvas = $('qr-out')?.querySelector('canvas');
  if (!canvas) { toast('QR belum dibuat. Pilih guru dulu.', 'warn'); return; }
  const a      = document.createElement('a');
  a.download   = 'qr-absensi.png';
  a.href       = canvas.toDataURL('image/png');
  a.click();
  toast('💾 QR berhasil diunduh', 'ok');
}


/* === setting.js === */
// ─────────────────────────────────────────
// setting.js — Pengaturan Aplikasi
// ─────────────────────────────────────────

// ── Identitas Sekolah ─────────────────────
function applyIdentitas() {
  const d = state.identitasData;

  if (d.nama) {
    const el = $('tb-nama');
    if (el) el.textContent = san(d.nama);
    const s = $('s-nama');
    if (s) s.value = d.nama;
  }
  if (d.tagline) {
    const el = $('tb-sub');
    if (el) el.textContent = san(d.tagline);
    const s = $('s-tag');
    if (s) s.value = d.tagline;
  }
  if (d.logo) {
    // Topbar logo — data: tidak boleh di-esc() (rusak base64)
    const el = $('tb-logo');
    if (el) {
      if (d.logo.startsWith('data:') || d.logo.startsWith('http')) {
        const safeUrl = d.logo.startsWith('data:') ? d.logo : esc(d.logo);
        el.innerHTML = `<img src="${safeUrl}"
          style="width:30px;height:30px;border-radius:9px;object-fit:cover"
          onerror="if(this.parentElement){this.parentElement.innerHTML='🕌'}">`;
      } else {
        el.innerHTML = `<span style="font-size:18px">${san(d.logo)}</span>`;
      }
    }
    const s = $('s-logo');
    if (s) s.value = d.logo;
    _updateLogoPreview(d.logo);
  }
  if (d.warna) applyColor(d.warna);
}


// ── LOGO UPLOAD ───────────────────────────────────────────
function handleLogoFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Logo maksimal 2MB', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    // Update preview
    _updateLogoPreview(dataUrl);
    // Set ke input text juga supaya ikut tersimpan
    const logoInput = $('s-logo');
    if (logoInput) logoInput.value = dataUrl;
    toast('✅ Logo siap — klik Simpan Identitas', 'ok');
  };
  reader.readAsDataURL(file);
}

function previewLogo(val) {
  if (!val) {
    _updateLogoPreview('');
    return;
  }
  _updateLogoPreview(val);
}

function _updateLogoPreview(val) {
  const prev = $('logo-preview');
  if (!prev) return;
  if (!val) { prev.innerHTML = '🕌'; return; }
  if (val.startsWith('data:') || val.startsWith('http')) {
    const su = val.startsWith('data:') ? val : esc(val);
    prev.innerHTML = `<img src="${su}"
      style="width:100%;height:100%;object-fit:cover;border-radius:14px"
      onerror="if(this.parentElement)this.parentElement.innerHTML='❌'">`;
  } else {
    prev.innerHTML = `<span style="font-size:32px">${san(val)}</span>`;
  }
  const tb = $('tb-logo');
  if (tb) {
    if (val.startsWith('data:') || val.startsWith('http')) {
      const su2 = val.startsWith('data:') ? val : esc(val);
      tb.innerHTML = `<img src="${su2}"
        style="width:30px;height:30px;border-radius:9px;object-fit:cover"
        onerror="if(this.parentElement)this.parentElement.innerHTML='🕌'">`;
    } else {
      tb.innerHTML = `<span style="font-size:18px">${san(val)}</span>`;
    }
  }
}

function simpanIdentitas() {
  if (!checkRole(['admin'])) return;
  const nama = san($('s-nama').value);
  if (!nama) { toast('Nama sekolah wajib diisi', 'warn'); return; }

  // Logo TIDAK boleh pakai san() karena:
  // 1. san() memotong string ke 300 karakter → base64 terpotong
  // 2. base64 tidak mengandung karakter berbahaya (<>"'`)
  const logoVal = $('s-logo')?.value || '';
  // Validasi: hanya izinkan data:, http:/https:, emoji, atau kosong
  const logoSafe = logoVal.startsWith('data:image/')
    ? logoVal                           // base64 image — simpan langsung
    : logoVal.startsWith('http')
      ? esc(logoVal)                    // URL external — escape XSS
      : san(logoVal).slice(0, 20);      // emoji/teks — batasi pendek

  DB.ref('identitas').update({
    nama,
    tagline: san($('s-tag').value).slice(0, 100),
    logo:    logoSafe,
  }).then(() => {
    toast('✅ Identitas berhasil disimpan', 'ok');
    // Apply langsung tanpa perlu reload
    state.identitasData.logo = logoSafe;
    state.identitasData.nama = nama;
    state.identitasData.tagline = san($('s-tag').value).slice(0, 100);
    applyIdentitas();
  }).catch(e => {
    console.error('Simpan identitas gagal:', e);
    toast('❌ Gagal menyimpan: ' + e.message, 'err');
  });
}

// ── Konfigurasi Jam ───────────────────────
function loadJamForm() {
  const map = {
    mulai:       'j-mulai',
    batas:       'j-batas',
    maxmasuk:    'j-maxm',
    jam_alpha:   'j-alpha',
    pulang:      'j-pulang',
    maxpulang:   'j-maxp',
    quran_mulai: 'j-qm',
    quran_batas: 'j-qb',
  };
  Object.entries(map).forEach(([k, id]) => {
    const el = $(id);
    if (el) el.value = state.JAM[k] || '';
  });
}

function simpanJam() {
  if (!checkRole(['admin'])) return;
  const jam = {
    mulai:       $('j-mulai').value,
    batas:       $('j-batas').value,
    maxmasuk:    $('j-maxm').value,
    jam_alpha:   $('j-alpha').value,
    pulang:      $('j-pulang').value,
    maxpulang:   $('j-maxp').value,
    quran_mulai: $('j-qm').value,
    quran_batas: $('j-qb').value,
  };
  DB.ref('setting/jam').set(jam)
    .then(() => {
      Object.assign(state.JAM, jam);
      toast('✅ Konfigurasi jam disimpan', 'ok');
      document.dispatchEvent(new CustomEvent('jamLoaded'));
    })
    .catch(() => toast('❌ Gagal menyimpan', 'err'));
}

// ── Ganti Password ────────────────────────
function gantiPassword() {
  if (!checkRole(['admin'])) return;
  const a = $('s-pw1').value;
  const b = $('s-pw2').value;
  if (!a || !b)             { toast('Isi kedua field password', 'warn'); return; }
  if (a !== b)              { toast('Password tidak cocok', 'err');      return; }
  if (a.length < 8)         { toast('Minimal 8 karakter', 'warn');       return; }
  if (!/[a-zA-Z]/.test(a) || !/[0-9]/.test(a)) {
    toast('Harus mengandung huruf & angka', 'warn'); return;
  }
  DB.ref('setting/passwords/admin').set(a)
    .then(() => {
      state.PASS.admin = a;
      toast('✅ Password berhasil diubah', 'ok');
      $('s-pw1').value = '';
      $('s-pw2').value = '';
    })
    .catch(() => toast('❌ Gagal menyimpan', 'err'));
}

// ── Simpan Warna ke Firebase ──────────────
function saveColor(hex) {
  DB.ref('identitas/warna').set(hex);
  toast('🎨 Tema warna diperbarui', 'ok');
}

// ── Reset Absensi Hari Ini ────────────────
function resetHariIni() {
  if (!checkRole(['admin'])) return;
  showKonfirm(
    'Reset Absensi',
    'Yakin reset SEMUA absensi hari ini? Aksi ini tidak bisa dibatalkan!',
    () => {
      DB.ref('absensi/' + today()).remove()
        .then(() => toast('🗑 Absensi hari ini direset', 'ok'))
        .catch(() => toast('❌ Gagal', 'err'));
    }
  );
}

// ── Export Backup JSON ────────────────────
function eksporBackup() {
  if (!checkRole(['admin'])) return;
  toast('📦 Menyiapkan backup...', 'info', 2000);
  Promise.all([
    DB.ref('guru').once('value'),
    DB.ref('absensi').once('value'),
    DB.ref('identitas').once('value'),
  ]).then(([g, a, id]) => {
    const backup = {
      exportDate: new Date().toISOString(),
      guru:       g.val(),
      absensi:    a.val(),
      identitas:  id.val(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `backup_sdit_${today()}.json`;
    link.click();
    toast('✅ Backup berhasil diunduh', 'ok');
  }).catch(() => toast('❌ Gagal export backup', 'err'));
}



/* === main.js === */
// ─────────────────────────────────────────
// main.js — Entry Point & Navigasi
// ─────────────────────────────────────────

// ── Navigasi Tab ──────────────────────────
let _curTab = 'dash';

function goTab(name) {
  // Stop scanner kalau pindah dari scan
  if (_curTab === 'scan' && name !== 'scan') stopScanner();
  _curTab = name;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.bn').forEach(b => b.classList.remove('on'));

  $('tab-' + name)?.classList.add('on');
  $('bn-'  + name)?.classList.add('on');

  // FAB hanya di dashboard, bukan yayasan
  $('fab')?.classList.toggle('on', name === 'dash' && state.role !== 'yayasan');

  // Inisialisasi per tab
  switch (name) {
    case 'rekap':
      if ($('r-tgl') && !$('r-tgl').value) $('r-tgl').value = today();
      setPeriod(state.period, $('pt-' + state.period));
      break;
    case 'manual':
      if ($('mg-tgl') && !$('mg-tgl').value) $('mg-tgl').value = today();
      onTipeChange();
      renderManualLog();
      break;
    case 'qr':
      renderQrGrid();
      fillSelects();
      break;
    case 'guru':
      renderGuru();
      break;
    case 'setting':
      loadJamForm();
      break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshDash() {
  loadStats();
  renderRecent();
  toast('🔄 Dashboard diperbarui', 'ok', 1500);
}

// ── Event: Firebase Updates ───────────────


// ── Expose ke window._app ─────────────────
// Semua fungsi yang dipanggil dari onclick di HTML

// ── LOGO UPLOAD ─────────────────────────────────────────
function handleLogoFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { toast('Foto maks 2MB','warn'); return; }
  const rd = new FileReader();
  rd.onload = e => {
    const url = e.target.result;
    _setLogoPreview(url);
    const si = $('s-logo');
    if (si) si.value = url;
    toast('✅ Logo siap — klik Simpan','ok');
  };
  rd.readAsDataURL(file);
}
function previewLogo(val) { _setLogoPreview(val||''); }
function _setLogoPreview(val) {
  _updateLogoPreview(val);
}

window._app = {
  // UI & nav
  toggleUD, closeUD, toggleDark, goTab, refreshDash,
  applyColor: hex => { applyColor(hex); },
  applyColorSave: hex => { applyColor(hex); saveColor(hex); },
  showKonfirm, closeKonfirm,
  closeModal,
  togglePw,

  // Auth
  switchRole, doLogin, cancelLogin, doLogout, renewSession,

  // Sync
  syncNow,

  // Guru
  renderGuru, showFormGuru, hideFormGuru,
  simpanGuru, hapusGuru, handleFoto, importSheets,

  // Absensi
  bukaAbsen, onTipeChange, onGuruPilih,
  simpanManual, resetManual,
  openEdit, simpanEditAbsensi, hapusAbsensi,

  // Rekap
  setPeriod, loadHarian, loadBulanan, loadSemester, loadTahunan,
  filterRekap, eksporCSV, eksporExcel, eksporExcelBulanan, cetakPDF,

  // ID Card
  buatIDCard, renderQrGrid, pilihQR, cetakIDCard, unduhQR, unduhIDCard,

  // Setting
  handleLogoFile, previewLogo, _updateLogoPreview, simpanIdentitas, simpanJam, gantiPassword,
  saveColor, resetHariIni, eksporBackup,
  simpanLokasi, simpanRadius, toggleLokasi, applyLokasi,
};

// ── Init ──────────────────────────────────
function init() {
  // Setup semua event listeners di sini (setelah DOM siap)
  document.addEventListener('click', e => {
    if (_udOpen && !e.target.closest('#ud-btn') && !e.target.closest('#ud-menu')) {
      closeUD();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.mov.open, .lov.open').forEach(m => m.classList.remove('open'));
      closeUD();
    }
  });

  document.querySelectorAll('.mov').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
  });

  document.addEventListener('guruUpdated', () => {
    fillSelects(); renderGuru(); renderQrGrid(); loadStats();
  });
  document.addEventListener('absensiUpdated', () => {
    loadStats(); renderRecent(); renderManualLog();
  });
  document.addEventListener('identitasUpdated', () => { applyIdentitas(); });
  document.addEventListener('jamLoaded', () => { updateJamBar(); });
  document.addEventListener('roleChanged', () => { fillSelects(); renderGuru(); });

  startClock();
  initColorGrid();
  initFirebase();
  applyRole();
  scheduleAlpha();

  // Default dates
  const now = new Date();
  if ($('r-tgl'))    $('r-tgl').value    = today();
  if ($('mg-tgl'))   $('mg-tgl').value   = today();
  if ($('r-bln'))    $('r-bln').value    = now.getMonth() + 1;
  if ($('r-thn-b'))  $('r-thn-b').value  = now.getFullYear();
  if ($('r-thn-s'))  $('r-thn-s').value  = now.getFullYear();

  onTipeChange();

  // Restore dark mode
  if (localStorage.getItem('dm') === '1') toggleDark();

  // FAB default on
  $('fab')?.classList.add('on');
}

// Jalankan saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
