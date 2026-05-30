// ─────────────────────────────────────────
// guru.js — Kelola Data Guru
// ─────────────────────────────────────────
import { $, san, esc, avColor, avInitial } from './utils.js';
import { state } from './config.js';
import { toast, showKonfirm } from './ui.js';
import { checkRole } from './auth.js';
import { DB } from './firebase.js';

// ── Isi semua <select> yang butuh daftar guru
export function fillSelects() {
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
export function renderGuru() {
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
export function showFormGuru(id) {
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

export function hideFormGuru() {
  $('form-guru').style.display = 'none';
}

export function simpanGuru() {
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

export function hapusGuru(id, nama) {
  if (!checkRole(['admin'])) return;
  showKonfirm('Hapus Guru', `Yakin hapus ${esc(nama)}?`, () => {
    DB.ref('guru/' + id).remove()
      .then(() => toast('✅ Guru dihapus', 'ok'))
      .catch(() => toast('❌ Gagal', 'err'));
  });
}

export function handleFoto(input) {
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
export function importSheets() {
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
