// ─────────────────────────────────────────
// auth.js — Login, Session, Role
// ─────────────────────────────────────────
import { $, san } from './utils.js';
import { state, ROLES, UNAME, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS } from './config.js';
import { toast, closeUD, updateInfoBar, updateAbsenBtns, hideSessWarn, showSessWarn, showKonfirm } from './ui.js';

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
export function switchRole(role) {
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

export function doLogin() {
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

export function cancelLogin() {
  $('login-ov').classList.remove('open');
  _pendingRole = null;
}

export function doLogout() {
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
export function startSession() {
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

export function clearSession() {
  if (_sessTimer) { clearInterval(_sessTimer); _sessTimer = null; }
  _sessExp = null;
  hideSessWarn();
}

export function renewSession() {
  startSession();
  hideSessWarn();
  toast('✅ Sesi diperpanjang', 'ok');
}

// ── APPLY ROLE — update seluruh UI ────────
export function applyRole() {
  const { role } = state;
  const isAdmin = role === 'admin';
  const isPriv  = isAdmin || role === 'kepsek';
  const isYay   = role === 'yayasan';
  const isGuru  = role === 'guru';

  // Topbar
  $('ud-av').textContent  = ROLES[role].icon;
  $('ud-nm').textContent  = ROLES[role].label;
  $('ud-role').textContent = ROLES[role].label;

  // Dropdown active state
  ['guru','admin','kepsek','yayasan'].forEach(r => {
    const el = $('udi-' + r);
    if (el) el.classList.toggle('act', r === role);
  });
  $('udi-out').style.display = isGuru ? 'none' : 'flex';

  // Bottom nav visibility
  $('bn-qr').style.display      = isGuru || isYay ? 'none' : 'flex';
  $('bn-guru').style.display    = isAdmin ? 'flex' : 'none';
  $('bn-setting').style.display = isAdmin ? 'flex' : 'none';
  $('bn-rekap').style.display   = 'flex'; // semua role bisa lihat rekap

  // Tab rekap: tahunan hanya admin & kepsek
  const ptThn = $('pt-tahunan');
  if (ptThn) ptThn.style.display = isPriv ? 'block' : 'none';

  // Tab guru: tombol tambah & import hanya admin
  const btnTambah = $('btn-tambah');
  if (btnTambah) btnTambah.style.display = isAdmin ? 'flex' : 'none';
  const importSec = $('import-sec');
  if (importSec) importSec.style.display = isAdmin ? 'block' : 'none';

  // Setting: bagian keamanan hanya admin
  const secSecurity = $('sec-security');
  if (secSecurity) secSecurity.style.display = isAdmin ? 'block' : 'none';

  // Dashboard: tombol absen & FAB
  const absenGrid = $('absen-grid');
  if (absenGrid) absenGrid.style.display = isYay ? 'none' : 'grid';
  const fab = $('fab');
  if (fab) fab.classList.toggle('on', !isYay);

  // Tab manual: form & info
  const infoAdmin = $('info-admin'), infoGuru = $('info-guru');
  const infoYay   = $('info-yay'),   frmManual = $('frm-manual');
  if (isYay) {
    infoAdmin.style.display  = 'none';
    infoGuru.style.display   = 'none';
    infoYay.style.display    = 'flex';
    frmManual.style.display  = 'none';
  } else {
    infoYay.style.display    = 'none';
    frmManual.style.display  = 'block';
    infoAdmin.style.display  = isGuru ? 'none' : 'flex';
    infoGuru.style.display   = isGuru ? 'flex' : 'none';
    // Opsi Alpha: hanya admin & kepsek
    const tipeOpts = Array.from($('mg-tipe')?.options || []);
    tipeOpts.forEach(o => {
      if (o.value === 'alpha') o.style.display = isGuru ? 'none' : '';
    });
  }

  updateInfoBar();
  updateAbsenBtns();

  // Trigger re-render komponen yang role-aware
  // (dipanggil dari main.js setelah import)
  document.dispatchEvent(new CustomEvent('roleChanged', { detail: { role } }));
}

// ── CHECK ROLE ────────────────────────────
export function checkRole(roles) {
  if (!roles.includes(state.role)) {
    toast('⛔ Akses tidak diizinkan untuk role ' + ROLES[state.role].label, 'err');
    return false;
  }
  return true;
}
