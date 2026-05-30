// ─────────────────────────────────────────
// rekap.js — Rekap Absensi & Export
// ─────────────────────────────────────────
import { $, pad, today, esc, fmtTgl, NAMA_BULAN, statusBadge } from './utils.js';
import { state } from './config.js';
import { toast } from './ui.js';
import { checkRole } from './auth.js';
import { DB } from './firebase.js';

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
export function setPeriod(p, btn) {
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
export function loadHarian() {
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

export function renderHarian(gl, data) {
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

export function filterRekap() {
  if (state.rekapCache?.data) renderHarian(state.rekapCache.gl, state.rekapCache.data);
}

// ── BULANAN ───────────────────────────────
export function loadBulanan() {
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
  });
}

// ── SEMESTER ──────────────────────────────
export function loadSemester() {
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
export function loadTahunan() {
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
export function eksporCSV() {
  const tgl = $('r-tgl')?.value || today();
  const gl  = guruAktif();
  const rows = [['No','Nama','Mapel','Jam Masuk','Jam Pulang','Status','Keterangan']];

  gl.forEach(([id, g], i) => {
    const mk = state.absensiData[`${id}_masuk`];
    const pk = state.absensiData[`${id}_pulang`];
    const iz = state.absensiData[`${id}_izin`];
    const sk = state.absensiData[`${id}_sakit`];
    const al = state.absensiData[`${id}_alpha`];
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
export function eksporExcel() {
  const tgl = $('r-tgl')?.value || today();
  const gl  = guruAktif();
  if (!gl.length) { toast('Belum ada data guru', 'warn'); return; }

  const wb   = XLSX.utils.book_new();
  const hdrs = ['No','Nama Guru','Mata Pelajaran','Jam Masuk','Jam Pulang','Status','Keterangan'];

  const rows = [hdrs, ...gl.map(([id, g], i) => {
    const mk = state.absensiData[`${id}_masuk`];
    const pk = state.absensiData[`${id}_pulang`];
    const iz = state.absensiData[`${id}_izin`];
    const sk = state.absensiData[`${id}_sakit`];
    const al = state.absensiData[`${id}_alpha`];
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

// ── CETAK PDF ─────────────────────────────
export function cetakPDF() {
  const tgl  = $('r-tgl')?.value || today();
  const nama = state.identitasData.nama || 'SDIT Qudwatun Hasanah';
  const tag  = state.identitasData.tagline || '';

  // Buat header sementara untuk print
  let hdr = document.getElementById('print-hdr');
  if (hdr) hdr.remove();
  hdr = document.createElement('div');
  hdr.id = 'print-hdr';
  hdr.style.cssText = 'text-align:center;padding:16px 0 12px;border-bottom:2px solid #333;margin-bottom:14px;display:none';
  hdr.innerHTML = `
    <div style="font-size:18px;font-weight:900">${esc(nama)}</div>
    <div style="font-size:12px;color:#555;margin-bottom:8px">${esc(tag)}</div>
    <div style="font-size:14px;font-weight:700;background:#FF6B35;color:#fff;
      display:inline-block;padding:4px 16px;border-radius:6px">
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
