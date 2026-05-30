// ─────────────────────────────────────────
// idcard.js — ID Card & QR Code
// ─────────────────────────────────────────
import { $, esc, avColor, avInitial } from './utils.js';
import { state } from './config.js';
import { toast } from './ui.js';

// ── Buat ID Card untuk guru terpilih ──────
export function buatIDCard() {
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
export function renderQrGrid() {
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
export function pilihQR(id) {
  const sel = $('qr-sel');
  if (sel) sel.value = id;
  buatIDCard();
  $('qr-disp')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Cetak ID Card ukuran CR80 ──────────────
export function cetakIDCard() {
  const id = $('qr-sel')?.value;
  if (!id) { toast('Pilih guru terlebih dahulu', 'warn'); return; }

  const card = $('idcard-el');
  if (!card) { toast('ID Card belum dibuat', 'warn'); return; }

  const win = window.open('', '_blank', 'width=700,height=900');
  win.document.write(`<!DOCTYPE html>
<html><head>
  <title>ID Card — ${esc(state.guruData[id]?.nama || '')}</title>
  <style>
    @page { size: 53.98mm 85.6mm; margin: 0; }
    body {
      margin: 0; padding: 20px;
      display: flex; flex-direction: column; align-items: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrap { width: 53.98mm; height: 85.6mm; overflow: hidden; border-radius: 16px; }
    .print-btn {
      margin-top: 12px; padding: 8px 20px;
      background: #FF6B35; color: #fff;
      border: none; border-radius: 8px;
      font-size: 14px; cursor: pointer;
    }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="wrap">${card.innerHTML}</div>
  <button class="print-btn" onclick="window.print()">🖨️ Cetak</button>
  <script>setTimeout(() => window.print(), 500);<\/script>
</body></html>`);
  win.document.close();
}

// ── Unduh QR saja sebagai PNG ──────────────
export function unduhQR() {
  const canvas = $('qr-out')?.querySelector('canvas');
  if (!canvas) { toast('QR belum dibuat. Pilih guru dulu.', 'warn'); return; }
  const a      = document.createElement('a');
  a.download   = 'qr-absensi.png';
  a.href       = canvas.toDataURL('image/png');
  a.click();
  toast('💾 QR berhasil diunduh', 'ok');
}
