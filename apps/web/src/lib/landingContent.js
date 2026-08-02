// Sumber tunggal teks utama landing page yang bisa diedit admin.
//
// Pola sama persis dengan lib/signupContent.js: halaman landing membaca teks
// dari sini (digabung dengan hasil edit admin di landing_settings.texts), dan
// editor di Dashboard Admin membangun form-nya otomatis dari daftar
// LANDING_TEXT_GROUPS. Menambah teks yang bisa diedit = tambah satu baris.

export const LANDING_TEXT_GROUPS = [
  {
    group: 'Hero (bagian paling atas)',
    fields: [
      { key: 'heroBadge', label: 'Teks badge kecil di atas judul', type: 'text', default: 'PRIMUS COLTUS VIRTUS' },
      { key: 'heroTitle1', label: 'Judul, bagian sebelum kata miring', type: 'text', default: 'Bimbel Kedokteran' },
      { key: 'heroTitleAccent', label: 'Judul, kata yang dimiringkan (warna maroon)', type: 'text', default: 'Ter-Worth It' },
      { key: 'heroTitle2', label: 'Judul, bagian setelah kata miring', type: 'text', default: 'untuk Seluruh FK di Indonesia' },
      { key: 'heroSub', label: 'Kalimat pendukung di bawah judul', type: 'textarea', default: 'Kelas akademik, olimpiade, penelitian, dan private. Dibimbing tentor berprestasi nasional dan internasional.' },
      { key: 'heroCta1', label: 'Teks tombol utama', type: 'text', default: 'Lihat Program Kami' },
      { key: 'heroCta2', label: 'Teks tombol WhatsApp', type: 'text', default: 'Tanya dulu via WhatsApp' },
      { key: 'heroLocation', label: 'Baris lokasi/identitas', type: 'textarea', default: 'Berbasis di Surabaya, melayani mahasiswa kedokteran di seluruh Indonesia.' },
    ],
  },
  {
    group: 'Statistik Hero',
    fields: [
      { key: 'stat1Value', label: 'Statistik 1: angka', type: 'text', default: '60+' },
      { key: 'stat1Label', label: 'Statistik 1: keterangan', type: 'text', default: 'Tentor Juara' },
      { key: 'stat2Value', label: 'Statistik 2: angka', type: 'text', default: '5★' },
      { key: 'stat2Label', label: 'Statistik 2: keterangan', type: 'text', default: 'Rating Sobat PCV' },
      { key: 'stat3Value', label: 'Statistik 3: angka', type: 'text', default: '4.400+' },
      { key: 'stat3Label', label: 'Statistik 3: keterangan', type: 'text', default: 'Followers IG' },
    ],
  },
  {
    group: 'Ajakan Bergabung (paling bawah)',
    fields: [
      { key: 'ctaTitle', label: 'Judul', type: 'text', default: 'Ditunggu Kehadirannya Jadi Sobat PCV!' },
      { key: 'ctaSub', label: 'Keterangan', type: 'textarea', default: 'Ikuti Instagram kami untuk info kelas dan free class terbaru, atau langsung hubungi admin untuk gabung.' },
    ],
  },
];

export const LANDING_TEXT_FIELDS = LANDING_TEXT_GROUPS.flatMap((g) => g.fields);

export function defaultLandingTexts() {
  return Object.fromEntries(LANDING_TEXT_FIELDS.map((f) => [f.key, f.default]));
}

// Gabungkan hasil edit admin di atas teks bawaan; teks kosong kembali ke bawaan.
export function resolveLandingTexts(saved) {
  const base = defaultLandingTexts();
  if (!saved || typeof saved !== 'object') return base;
  for (const f of LANDING_TEXT_FIELDS) {
    const v = saved[f.key];
    if (typeof v === 'string' && v.trim()) base[f.key] = v;
  }
  return base;
}
