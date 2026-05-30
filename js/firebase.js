// ─────────────────────────────────────────
// firebase.js — Inisialisasi & Listeners
// ─────────────────────────────────────────
import { $, today } from './utils.js';
import { toast, closeUD } from './ui.js';
import { FB_CONFIG, state } from './config.js';

export let DB = null;

export function initFirebase() {
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
export function syncNow() {
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
