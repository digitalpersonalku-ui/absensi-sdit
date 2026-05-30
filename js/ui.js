// ─────────────────────────────────────────
// ui.js — Komponen UI: Toast, Modal, Dropdown, Jam
// ─────────────────────────────────────────
import { $, pad, today, toMin, isWeekend, fmtTgl } from './utils.js';
import { state, COLOR_PRESETS } from './config.js';

// ── TOAST ─────────────────────────────────
let _toastTimer;
export function toast(msg, type = '', dur = 2800) {
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

export function toggleUD() {
  const menu = $('ud-menu');
  if (!menu) return;
  _udOpen = !_udOpen;
  menu.style.display = _udOpen ? 'block' : 'none';
  const arr = $('ud-arr');
  if (arr) arr.style.transform = _udOpen ? 'rotate(180deg)' : '';
}

export function closeUD() {
  if (!_udOpen) return;
  _udOpen = false;
  const menu = $('ud-menu');
  if (menu) menu.style.display = 'none';
  const arr = $('ud-arr');
  if (arr) arr.style.transform = '';
}

// Klik di luar dropdown → tutup
document.addEventListener('click', e => {
  if (_udOpen && !e.target.closest('#ud-btn') && !e.target.closest('#ud-menu')) {
    closeUD();
  }
}, true);

// ── MODAL ─────────────────────────────────
let _konfirmCb = null;

export function showKonfirm(title, msg, cb) {
  $('kf-ttl').textContent = title;
  $('kf-msg').textContent = msg;
  _konfirmCb = cb;
  $('mov-konfirm').classList.add('open');
  $('kf-ok').onclick = () => { closeKonfirm(); if (_konfirmCb) _konfirmCb(); };
}
export function closeKonfirm() { $('mov-konfirm').classList.remove('open'); }
export function closeModal(id) { $(id)?.classList.remove('open'); }

// Klik overlay → tutup
document.querySelectorAll('.mov').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});

// Tekan Escape → tutup semua
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.mov.open, .lov.open').forEach(m => m.classList.remove('open'));
    closeUD();
  }
});

// ── JAM & JAM BAR ─────────────────────────
export function startClock() {
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

export function updateJamBar() {
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

export function updateAbsenBtns() {
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
export function toggleDark() {
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
    root.style.setProperty('--bg',   '#F1F5F9');
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
export function applyColor(hex) {
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

export function initColorGrid() {
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
export function togglePw(id) {
  const el = $(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// ── INFO BAR ───────────────────────────────
export function updateInfoBar() {
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
export function showSessWarn(minsLeft) {
  const sw = $('sess-warn');
  if (sw) { sw.style.display = 'block'; }
  const cd = $('sess-cd');
  if (cd) cd.textContent = minsLeft;
}
export function hideSessWarn() {
  const sw = $('sess-warn');
  if (sw) sw.style.display = 'none';
}
