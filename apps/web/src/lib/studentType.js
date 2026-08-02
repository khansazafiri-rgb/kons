// Tiga tipe akun siswa. Tipe menentukan berapa device yang boleh dipakai
// untuk login dengan akun yang sama.
//
// Catatan: tipe "web" TIDAK tersedia di halaman Sign Up publik - akun Student
// - Web dibuat admin (nanti otomatis lewat pembelian akses via Odoo).
export const STUDENT_TYPES = [
  {
    value: 'reguler',
    label: 'Student - Reguler',
    short: 'Reguler',
    devices: 1,
    desc: 'Peserta kelas reguler per semester. Maksimal 1 device.',
    signup: true,
  },
  {
    value: 'private',
    label: 'Student - Private',
    short: 'Private',
    devices: 1,
    desc: 'Peserta kelas privat / grup kecil. Maksimal 1 device.',
    signup: true,
  },
  {
    value: 'web',
    label: 'Student - Web',
    short: 'Web',
    devices: 2,
    desc: 'Pembeli akses web siswa. Maksimal 2 device.',
    signup: false,
  },
];

const find = (t) => STUDENT_TYPES.find((s) => s.value === t);

export const studentTypeLabel = (t) => find(t)?.label || 'Student - Reguler';
export const studentTypeShort = (t) => find(t)?.short || 'Reguler';
export const studentTypeDevices = (t) => find(t)?.devices ?? 1;

// Label peran untuk ditampilkan ke pengguna: siswa memakai tipenya,
// teacher/admin memakai rolenya.
export const roleLabel = (user) =>
  user?.role === 'student' ? studentTypeLabel(user.studentType) : user?.role || '';
