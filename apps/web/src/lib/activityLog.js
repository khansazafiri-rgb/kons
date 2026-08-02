// Pencatat aktivitas untuk tab "Dashboard Activity" di panel admin.
//
// Dua hal yang dicatat:
//   1. Baris riwayat di collection `activity_log` - siapa mengubah apa, kapan.
//      Hanya admin & teacher yang boleh menulis ke sini (lihat API rule).
//   2. Jejak "terakhir ngapain" di record user itu sendiri
//      (users.lastActivityAt / lastActivityText) - dipakai untuk daftar siapa
//      yang sedang aktif, dan untuk isi email penyemangat.
//
// PRINSIP: pencatatan TIDAK BOLEH menggagalkan aksi utamanya. Kalau menulis log
// gagal (koleksi belum dimigrasi, rule menolak, jaringan putus), fungsi di sini
// diam saja - soal yang barusan disimpan tetap tersimpan.

// Label section yang dipakai di UI. Kunci harus sama dengan values field
// `section` di migration 1785000000_activity_log.js.
export const ACTIVITY_SECTIONS = {
  soal_tambah: { label: 'Penambahan soal', icon: '➕', tone: 'green' },
  soal_ubah: { label: 'Perubahan soal', icon: '✏️', tone: 'gold' },
  soal_hapus: { label: 'Penghapusan soal', icon: '🗑️', tone: 'red' },
  soal_pindah: { label: 'Soal ke Simulasi', icon: '📤', tone: 'maroon' },
  ppt_tambah: { label: 'Upload PPT', icon: '📊', tone: 'green' },
  ppt_hapus: { label: 'Hapus PPT', icon: '🗑️', tone: 'red' },
  bab_ubah: { label: 'Perubahan BAB', icon: '📚', tone: 'gold' },
  akun: { label: 'Akun', icon: '👤', tone: 'maroon' },
  jadwal_ujian: { label: 'Jadwal ujian', icon: '📅', tone: 'gold' },
  landing: { label: 'Landing page', icon: '🌐', tone: 'maroon' },
  lainnya: { label: 'Lainnya', icon: '•', tone: 'stone' },
};

export const sectionLabel = (s) => ACTIVITY_SECTIONS[s]?.label || 'Lainnya';
export const sectionIcon = (s) => ACTIVITY_SECTIONS[s]?.icon || '•';

const strip = (v) => String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Potong teks panjang supaya muat di kolom (dan tidak membengkakkan database).
export const shorten = (v, max = 120) => {
  const s = strip(v);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
};

// Ringkas satu soal jadi objek kecil untuk preview di halaman riwayat.
// Sengaja TIDAK menyimpan seluruh record - cukup yang perlu dilihat kembali.
export function questionSnapshot(q) {
  if (!q) return null;
  const opt = q.options;
  const enveloped = opt && !Array.isArray(opt) && typeof opt === 'object';
  const qtype = (enveloped ? opt.qtype : q.qtype) || 'mcq';
  const choices = enveloped ? opt.choices : Array.isArray(opt) ? opt : [];
  const subQuestions = enveloped ? opt.subQuestions : q.subQuestions;
  return {
    id: q.id || null,
    qtype,
    text: shorten(q.text, 400),
    imageUrl: (enveloped ? opt.imageUrl : q.imageUrl) || '',
    choices: (choices || []).slice(0, 6).map((c) => ({
      text: shorten(c?.text, 200),
      correct: !!c?.correct,
    })),
    subQuestions: (subQuestions || []).slice(0, 6).map((s) => ({
      label: s?.label || '',
      question: shorten(s?.question, 200),
      validAnswers: Array.isArray(s?.validAnswers) ? s.validAnswers.slice(0, 6) : [],
    })),
  };
}

// Tulis satu baris riwayat + perbarui jejak aktivitas pelakunya.
// Dipanggil tanpa await di pemanggilnya (fire and forget) - lihat catatan di atas.
export async function logActivity(pb, user, { section = 'lainnya', summary, targetLabel = '', detail = null } = {}) {
  if (!pb || !user?.id || !summary) return;
  const when = new Date().toISOString();
  try {
    await pb.collection('activity_log').create({
      actor: user.id,
      actorName: user.name || user.userId || '(tanpa nama)',
      actorRole: user.role || '',
      section,
      summary: shorten(summary, 500),
      targetLabel: shorten(targetLabel, 300),
      detail,
    });
  } catch (_) {
    // Riwayat gagal ditulis - abaikan, aksi utama tetap dianggap berhasil.
  }
  await touchActivity(pb, user, summary, when);
}

// Perbarui HANYA jejak "terakhir ngapain" milik user. Dipakai untuk siswa,
// yang tidak punya izin menulis ke activity_log.
export async function touchActivity(pb, user, text, when = new Date().toISOString()) {
  if (!pb || !user?.id) return;
  try {
    await pb.collection('users').update(user.id, {
      lastActivityAt: when,
      lastActivityText: shorten(text, 300),
    });
  } catch (_) {
    // Abaikan - jejak aktivitas bukan data kritis.
  }
}

// "3 hari lalu", "2 minggu lalu", dst. Dipakai di daftar aktif & isi email.
export function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} minggu lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

// Aktif = ada jejak aktivitas dalam N hari terakhir (default 14 hari).
export const AKTIF_HARI = 14;
export function isAktif(user, days = AKTIF_HARI) {
  if (!user?.lastActivityAt) return false;
  const then = new Date(user.lastActivityAt).getTime();
  if (Number.isNaN(then)) return false;
  return Date.now() - then <= days * 86400000;
}
