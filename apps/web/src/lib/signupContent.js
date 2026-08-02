// Sumber tunggal seluruh teks halaman Sign Up.
//
// Halaman /signup membaca teks dari sini (sudah digabung dengan hasil edit
// admin), dan editor di Dashboard Admin membangun form-nya otomatis dari
// daftar SIGNUP_TEXT_GROUPS di bawah. Jadi untuk menambah teks yang bisa
// diedit admin, cukup tambahkan satu baris di sini - tanpa migration dan
// tanpa mengubah halaman admin.

export const SIGNUP_TEXT_GROUPS = [
  {
    group: 'Panel Kiri (latar maroon)',
    fields: [
      { key: 'sideHeadline', label: 'Judul besar', type: 'textarea', default: 'Daftar Jadi Sobat PCV' },
      { key: 'sideStep1', label: 'Langkah 1', type: 'text', default: 'Isi form pendaftaran di samping' },
      { key: 'sideStep2', label: 'Langkah 2', type: 'text', default: 'Admin memilihkan mata kuliahmu lalu meng-ACC' },
      { key: 'sideStep3', label: 'Langkah 3', type: 'text', default: 'Notifikasi ACC dikirim ke email dan WhatsApp-mu, langsung bisa login' },
      { key: 'sideFooter', label: 'Teks paling bawah', type: 'text', default: 'PCV Classroom. Bimbel Ter-Worth It' },
    ],
  },
  {
    group: 'Bagian Atas Form',
    fields: [
      { key: 'backLink', label: 'Teks tautan kembali', type: 'text', default: 'Kembali ke halaman login' },
      { key: 'formTitle', label: 'Judul form', type: 'text', default: 'Sign Up Sobat PCV' },
      { key: 'formInfo', label: 'Keterangan di bawah judul', type: 'textarea', default: 'Isi data di bawah untuk mendaftar. Akunmu aktif setelah di-ACC admin.' },
    ],
  },
  {
    group: 'Kolom Isian Form',
    fields: [
      { key: 'labelProgram', label: 'Label pilihan program', type: 'text', default: 'Program yang dipilih' },
      { key: 'optionReguler', label: 'Teks tombol program 1', type: 'text', default: 'Kelas Reguler' },
      { key: 'optionPrivate', label: 'Teks tombol program 2', type: 'text', default: 'Kelas Privat' },
      { key: 'labelUserId', label: 'Label Login ID', type: 'text', default: 'Login ID' },
      { key: 'hintUserId', label: 'Keterangan di bawah Login ID', type: 'text', default: 'Gunakan untuk login di web.' },
      { key: 'placeholderUserId', label: 'Placeholder Login ID', type: 'text', default: 'ID unik untuk login (mis. namamu123)' },
      { key: 'labelName', label: 'Label Nama', type: 'text', default: 'Nama Lengkap' },
      { key: 'placeholderName', label: 'Placeholder Nama', type: 'text', default: 'Nama lengkapmu' },
      { key: 'labelEmail', label: 'Label Email', type: 'text', default: 'Email Aktif' },
      { key: 'placeholderEmail', label: 'Placeholder Email', type: 'text', default: 'emailmu@gmail.com' },
      { key: 'hintEmail', label: 'Keterangan di bawah Email', type: 'text', default: 'Notifikasi mengenai web akan dikirimkan melalui email mu.' },
      { key: 'labelPassword', label: 'Label Password', type: 'text', default: 'Password' },
      { key: 'hintPassword', label: 'Keterangan di bawah Password', type: 'text', default: 'Digunakan untuk login.' },
      { key: 'placeholderPassword', label: 'Placeholder Password', type: 'text', default: 'Minimal 8 karakter' },
      { key: 'labelPasswordConfirm', label: 'Label Konfirmasi Password', type: 'text', default: 'Ulangi Password' },
      { key: 'placeholderPasswordConfirm', label: 'Placeholder Konfirmasi Password', type: 'text', default: 'Ketik ulang password yang sama' },
      { key: 'labelPhone', label: 'Label Nomor WhatsApp', type: 'text', default: 'Nomor WhatsApp' },
      { key: 'placeholderPhone', label: 'Placeholder Nomor WhatsApp', type: 'text', default: '08xxxxxxxxxx' },
      { key: 'hintPhone', label: 'Keterangan di bawah Nomor WhatsApp', type: 'text', default: 'Notifikasi penting (ACC akun, reminder kelas) juga dikirim ke WhatsApp-mu.' },
      { key: 'labelSemester', label: 'Label Semester', type: 'text', default: 'Semester' },
      { key: 'placeholderSemester', label: 'Placeholder Semester', type: 'text', default: '1' },
      { key: 'labelAsalKuliah', label: 'Label Asal Kuliah', type: 'text', default: 'Asal Kuliah' },
      { key: 'placeholderAsalKuliah', label: 'Teks pilihan kosong Asal Kuliah', type: 'text', default: 'Pilih fakultas kedokteranmu…' },
      { key: 'optionAsalKuliahLainnya', label: 'Teks opsi "Lainnya" Asal Kuliah', type: 'text', default: 'Lainnya / belum ada di daftar' },
      { key: 'placeholderAsalKuliahLainnya', label: 'Placeholder isian Asal Kuliah lainnya', type: 'text', default: 'Tulis nama fakultas & kampusmu' },
    ],
  },
  {
    group: 'Tombol & Catatan Bawah',
    fields: [
      { key: 'submitLabel', label: 'Teks tombol daftar', type: 'text', default: 'Daftar Sekarang' },
      { key: 'submitLoading', label: 'Teks tombol saat mengirim', type: 'text', default: 'Mengirim…' },
      { key: 'footerNote', label: 'Catatan di bawah tombol', type: 'textarea', default: 'Setelah mendaftar, akunmu menunggu ACC admin. Semua akun dari sign up otomatis ber-role student - akun teacher hanya dibuat manual oleh admin.' },
    ],
  },
  {
    group: 'Halaman Setelah Berhasil Daftar',
    fields: [
      { key: 'successTitle', label: 'Judul', type: 'text', default: 'Pendaftaran Terkirim!' },
      { key: 'successInfo', label: 'Keterangan', type: 'textarea', default: 'Datamu sudah masuk ke admin PCV. Setelah pendaftaranmu di-ACC, kamu akan menerima email pemberitahuan bahwa website sudah bisa diakses. Device pertama yang kamu pakai login akan terdaftar otomatis sebagai device akunmu.' },
      { key: 'successButton', label: 'Teks tombol', type: 'text', default: 'Ke Halaman Login' },
    ],
  },
  {
    group: 'Saat Pendaftaran Ditutup',
    fields: [
      { key: 'closedTitle', label: 'Judul', type: 'text', default: 'Pendaftaran Sedang Ditutup' },
      { key: 'closedInfo', label: 'Keterangan', type: 'textarea', default: 'Untuk saat ini pendaftaran akun baru belum dibuka. Hubungi admin PCV lewat WhatsApp untuk info lebih lanjut.' },
    ],
  },
];

// Semua field digabung jadi satu daftar datar (dipakai untuk membangun default).
export const SIGNUP_TEXT_FIELDS = SIGNUP_TEXT_GROUPS.flatMap((g) => g.fields);

export function defaultSignupTexts() {
  return Object.fromEntries(SIGNUP_TEXT_FIELDS.map((f) => [f.key, f.default]));
}

// Gabungkan hasil edit admin di atas teks bawaan. Teks yang dikosongkan admin
// otomatis kembali memakai teks bawaan supaya halaman tidak pernah tampil
// tanpa label.
export function resolveSignupTexts(saved) {
  const base = defaultSignupTexts();
  if (!saved || typeof saved !== 'object') return base;
  for (const f of SIGNUP_TEXT_FIELDS) {
    const v = saved[f.key];
    if (typeof v === 'string' && v.trim()) base[f.key] = v;
  }
  return base;
}
