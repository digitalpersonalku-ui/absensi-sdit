// ─────────────────────────────────────────
// main.js — Entry Point & Navigasi
// ─────────────────────────────────────────
import { $, today } from './utils.js';
import { state } from './config.js';
import { startClock, updateJamBar, initColorGrid, toggleUD, closeUD,
         toggleDark, applyColor, toast } from './ui.js';
import { switchRole, doLogin, cancelLogin, doLogout,
         applyRole, renewSession, togglePw } from './auth.js';
import { initFirebase, syncNow } from './firebase.js';
import { fillSelects, renderGuru, showFormGuru, hideFormGuru,
         simpanGuru, hapusGuru, handleFoto, importSheets } from './guru.js';
import { bukaAbsen, doAbsen, onTipeChange, onGuruPilih, simpanManual,
         resetManual, loadStats, renderRecent, renderManualLog,
         openEdit, simpanEditAbsensi, hapusAbsensi,
         scheduleAlpha, stopScanner } from './absensi.js';
import { setPeriod, loadHarian, loadBulanan, loadSemester, loadTahunan,
         filterRekap, eksporCSV, eksporExcel, cetakPDF } from './rekap.js';
import { buatIDCard, renderQrGrid, pilihQR, cetakIDCard, unduhQR } from './idcard.js';
import { applyIdentitas, simpanIdentitas, loadJamForm, simpanJam,
         gantiPassword, saveColor, resetHariIni, eksporBackup } from './setting.js';
import { showKonfirm, closeKonfirm, closeModal } from './ui.js';

// ── Navigasi Tab ──────────────────────────
let _curTab = 'dash';

export function goTab(name) {
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
document.addEventListener('guruUpdated', () => {
  fillSelects();
  renderGuru();
  renderQrGrid();
  loadStats();
});

document.addEventListener('absensiUpdated', () => {
  loadStats();
  renderRecent();
  renderManualLog();
});

document.addEventListener('identitasUpdated', () => {
  applyIdentitas();
});

document.addEventListener('jamLoaded', () => {
  updateJamBar();
});

document.addEventListener('roleChanged', () => {
  fillSelects();
  renderGuru();
});

// ── Expose ke window._app ─────────────────
// Semua fungsi yang dipanggil dari onclick di HTML
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
  filterRekap, eksporCSV, eksporExcel, cetakPDF,

  // ID Card
  buatIDCard, renderQrGrid, pilihQR, cetakIDCard, unduhQR,

  // Setting
  simpanIdentitas, simpanJam, gantiPassword,
  saveColor, resetHariIni, eksporBackup,
};

// ── Init ──────────────────────────────────
function init() {
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
