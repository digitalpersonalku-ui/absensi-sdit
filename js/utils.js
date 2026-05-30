// ─────────────────────────────────────────
// utils.js — Fungsi-fungsi pembantu
// ─────────────────────────────────────────

// Ambil elemen by ID
export const $ = id => document.getElementById(id);

// Pad angka jadi 2 digit: 5 → "05"
export const pad = n => String(n).padStart(2, '0');

// Tanggal hari ini: "2026-05-30"
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

// Jam & menit sekarang: "07:30"
export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Konversi "08:30" → menit (510)
export const toMin = t => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Cek apakah hari ini Sabtu/Minggu
export const isWeekend = () => [0, 6].includes(new Date().getDay());

// Sanitasi input — buang karakter berbahaya
export const san = s => s ? String(s).replace(/[<>"'`]/g, '').trim().slice(0, 300) : '';

// Escape HTML — untuk ditampilkan di DOM
export const esc = s => s
  ? String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  : '';

// Warna avatar berdasarkan nama
export const avColor = nm => {
  const colors = ['#FF6B35','#06C270','#6C47FF','#0ABAB5','#FF4D6D','#F59E0B','#2563EB','#EC4899'];
  let h = 0;
  for (const ch of (nm || '?')) h = (h * 31 + ch.charCodeAt(0)) & 0xFFFF;
  return colors[h % colors.length];
};

// Inisial nama: "Budi Santoso" → "BS"
export const avInitial = nm => {
  if (!nm) return '?';
  const parts = nm.trim().split(' ');
  return parts.length >= 2
    ? parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
    : nm[0].toUpperCase();
};

// Format tanggal: "2026-05-30" → "Sab, 30 Mei 2026"
export const fmtTgl = s => {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  const H = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${H[d.getDay()]}, ${d.getDate()} ${B[d.getMonth()]} ${d.getFullYear()}`;
};

// Icon status absensi
export const statusIcon = s =>
  ({ hadir:'✅', terlambat:'⚠️', izin:'📝', sakit:'🏥', alpha:'❌', libur:'🏖️' }[s] || '📋');

// CSS class badge status
export const statusBadge = s =>
  ({ hadir:'ok', terlambat:'tl', izin:'iz', sakit:'sk', alpha:'al' }[s] || 'lb');

// Nama bulan
export const NAMA_BULAN = ['','Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'];
