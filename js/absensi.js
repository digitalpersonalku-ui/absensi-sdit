// ─────────────────────────────────────────
// absensi.js — Logika Absensi
// ─────────────────────────────────────────
import { $, san, esc, today, nowHM, toMin, isWeekend, statusIcon, statusBadge, avColor } from './utils.js';
import { state } from './config.js';
import { toast, showKonfirm, closeModal } from './ui.js';
import { checkRole } from './auth.js';
import { DB } from './firebase.js';

let _scanner = null;

// ── Buka scan (dari tombol dashboard) ─────
export function bukaAbsen(tipe) {
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
export function doAbsen(guruId, tipe, metode = 'scan') {
  if (state.role === 'yayasan') { toast('🚫 Tidak bisa absen', 'err'); return; }
  if (isWeekend()) { toast('📅 Hari Libur', 'warn'); return; }

  const g = state.guruData[guruId];
  if (!g) { toast('❌ Guru tidak ditemukan', 'err'); return; }

  const key = `${guruId}_${tipe}`;
  if (state.absensiData[key]) { toast(`⚠️ ${g.nama} sudah absen ${tipe}!`, 'warn'); return; }

  const now    = new Date().getHours() * 60 + new Date().getMinutes();
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
export function onTipeChange() {
  const tipe = $('mg-tipe')?.value;
  $('wrap-ket').style.display    = ['izin','sakit','alpha'].includes(tipe) ? 'block' : 'none';
  $('wrap-status').style.display = tipe === 'masuk' ? 'block' : 'none';
  $('ket-lbl').textContent       = tipe === 'alpha' ? 'Keterangan (opsional)' : 'Keterangan *';
}

export function onGuruPilih() {
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

export function simpanManual() {
  if (state.role === 'yayasan') { toast('🚫 Yayasan tidak dapat mengisi absensi', 'err'); return; }

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
  if (state.absensiData[key] && state.role === 'guru') {
    toast(`Sudah ada absensi ${tipe} untuk ${g.nama}`, 'warn'); return;
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

export function resetManual() {
  $('mg-guru').value  = '';
  $('mg-tipe').value  = 'masuk';
  $('mg-ket').value   = '';
  $('mg-tgl').value   = today();
  onTipeChange();
  const info = $('guru-status-info');
  if (info) info.style.display = 'none';
}

// ── Statistik & render list ───────────────
export function loadStats() {
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

export function renderRecent() {
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

export function renderManualLog() {
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
export function openEdit(key) {
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

export function simpanEditAbsensi() {
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

export function hapusAbsensi() {
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
export function scheduleAlpha() {
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
export function startScanner(tipe) {
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

export function stopScanner() {
  if (_scanner) { try { _scanner.stop(); } catch (e) {} }
}
