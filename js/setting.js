// ─────────────────────────────────────────
// setting.js — Pengaturan Aplikasi
// ─────────────────────────────────────────
import { $, san, esc, today } from './utils.js';
import { state } from './config.js';
import { toast, applyColor, showKonfirm } from './ui.js';
import { checkRole } from './auth.js';
import { DB } from './firebase.js';

// ── Identitas Sekolah ─────────────────────
export function applyIdentitas() {
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
    const el = $('tb-logo');
    if (el) {
      el.innerHTML = d.logo.startsWith('http')
        ? `<img src="${esc(d.logo)}" style="width:28px;height:28px;border-radius:7px;object-fit:cover">`
        : `<span style="font-size:17px">${d.logo}</span>`;
    }
    const s = $('s-logo');
    if (s) s.value = d.logo;
  }
  if (d.warna) applyColor(d.warna);
}

export function simpanIdentitas() {
  if (!checkRole(['admin'])) return;
  const nama = san($('s-nama').value);
  if (!nama) { toast('Nama sekolah wajib diisi', 'warn'); return; }
  DB.ref('identitas').update({
    nama,
    tagline: san($('s-tag').value),
    logo:    san($('s-logo').value),
  }).then(() => toast('✅ Identitas disimpan', 'ok'))
    .catch(() => toast('❌ Gagal menyimpan', 'err'));
}

// ── Konfigurasi Jam ───────────────────────
export function loadJamForm() {
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

export function simpanJam() {
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
export function gantiPassword() {
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
export function saveColor(hex) {
  DB.ref('identitas/warna').set(hex);
  toast('🎨 Tema warna diperbarui', 'ok');
}

// ── Reset Absensi Hari Ini ────────────────
export function resetHariIni() {
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
export function eksporBackup() {
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

