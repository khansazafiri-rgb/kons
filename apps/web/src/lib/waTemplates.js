// Sumber tunggal template pesan WhatsApp.
//
// Teks bawaan ada di sini; hasil edit admin disimpan di wa_settings.templates
// (JSON { kunci: teks }). Server memakai daftar & teks bawaan yang SAMA di
// pb_hooks/pcv-shared.js - kalau menambah template baru, tambahkan di kedua
// tempat itu.
//
// Placeholder ditulis dalam kurung kurawal dan diganti saat pesan dikirim.

export const WA_TEMPLATES = [
  {
    key: 'nudge',
    label: 'Penyemangat / ajakan aktif lagi',
    desc: 'Dikirim manual dari Dashboard Activity lewat tombol "Kirim WA".',
    placeholders: ['{nama}', '{aktivitas}', '{jeda}', '{link}'],
    default:
      'Halo {nama}! Semangat terus belajarnya di PCV Classroom. ' +
      'Terakhir kamu aktif {jeda} ({aktivitas}). ' +
      'Yuk lanjut lagi pelan-pelan di {link}',
  },
  {
    key: 'accApproved',
    label: 'Akun di-ACC admin',
    desc: 'Terkirim otomatis saat pendaftaran disetujui di tab Tambah Akun.',
    placeholders: ['{nama}', '{link}'],
    default:
      'Halo {nama}! Pendaftaranmu di PCV Classroom sudah di-ACC admin. ' +
      'Web siswa sudah bisa kamu akses di {link} memakai Login ID dan password ' +
      'yang kamu isi saat mendaftar. Selamat belajar!',
  },
  {
    key: 'deviceReset',
    label: 'Device direset admin',
    desc: 'Terkirim otomatis saat admin menekan tombol Reset Device.',
    placeholders: ['{nama}', '{link}'],
    default:
      'Halo {nama}! Device untuk akun PCV Classroom kamu sudah direset admin. ' +
      'Sekarang kamu bisa login lagi dari device yang kamu pakai.',
  },
  {
    key: 'classReminder',
    label: 'Reminder kelas H-1',
    desc: 'Terkirim otomatis tiap sore untuk kelas yang berjalan besok.',
    placeholders: ['{nama}', '{kelas}', '{jadwal}'],
    default:
      'Halo {nama}! Reminder dari PCV Classroom: besok ada jadwal kelas {kelas}.\n' +
      '{jadwal}\n\nSampai ketemu di kelas!',
  },
  {
    key: 'examReminder',
    label: 'Pengingat ujian',
    desc: 'Dikirim manual dari Dashboard Activity untuk siswa yang ujiannya dekat.',
    placeholders: ['{nama}', '{ujian}', '{sisa}', '{link}'],
    default:
      'Halo {nama}! Pengingat dari PCV Classroom: {ujian} tinggal {sisa}. ' +
      'Yuk mantapkan lagi latihannya di {link}',
  },
];

export const waTemplateDefaults = () =>
  Object.fromEntries(WA_TEMPLATES.map((t) => [t.key, t.default]));

// Gabungkan hasil edit admin di atas teks bawaan; yang dikosongkan kembali
// memakai teks bawaan supaya pesan tidak pernah terkirim kosong.
export function resolveWaTemplates(saved) {
  const base = waTemplateDefaults();
  if (!saved || typeof saved !== 'object') return base;
  for (const t of WA_TEMPLATES) {
    const v = saved[t.key];
    if (typeof v === 'string' && v.trim()) base[t.key] = v;
  }
  return base;
}

// Ganti {placeholder} dengan nilainya. Placeholder yang tidak punya nilai
// dihapus (bukan dibiarkan tampil mentah ke siswa).
export function renderWaTemplate(text, vars = {}) {
  return String(text || '')
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
