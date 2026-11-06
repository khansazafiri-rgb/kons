// Uji cepat tujuan kembali setelah login (lihat src/lib/returnTo.js).
// Jalankan: npm run check:returnto --prefix apps/web
//
// Yang dijaga: setelah login berhasil orang tidak boleh dilempar balik ke
// halaman login/daftar (bug nyata: Sign Up -> "kembali ke login" -> Masuk
// berakhir di Sign Up lagi), alamat luar ditolak, dan tujuan yang sah (halaman
// lomba, halaman belajar) tetap dihormati.
import { alamatAman, bacaReturnTo, tautanMasuk, tujuanSetelahMasuk } from '../src/lib/returnTo.js';

let lulus = 0;
let gagal = 0;
const sama = (nama, dapat, harap) => {
  if (JSON.stringify(dapat) === JSON.stringify(harap)) { lulus++; return; }
  gagal++;
  console.log(`GAGAL ${nama}\n   dapat : ${JSON.stringify(dapat)}\n   harap : ${JSON.stringify(harap)}`);
};

// Tujuan sah dipertahankan
sama('beranda belajar', alamatAman('/belajar'), '/belajar');
sama('halaman lomba', alamatAman('/event/olim-anatomi/daftar'), '/event/olim-anatomi/daftar');
sama('dengan query', alamatAman('/cicil-belajar?subject=a&chapter=b'), '/cicil-belajar?subject=a&chapter=b');
sama('mirip nama tapi bukan halaman masuk', alamatAman('/login-info'), '/login-info');
sama('mirip nama signup', alamatAman('/signups'), '/signups');

// Halaman masuk/daftar tidak pernah jadi tujuan
for (const a of ['/login', '/login?return_to=%2Fx', '/signup', '/signup?return_to=%2Fevent%2Fx', '/Signup', '/daftar-pengajar', '/daftar-admin',
  '/olimp/masuk', '/olimp/daftar', '/olimp/keluar', '/peminjaman/admin/masuk', '/acc/token123', '/login#x', '/signup/']) {
  sama(`ditolak ${a}`, alamatAman(a), '');
}

// Alamat luar ditolak
for (const a of ['https://jahat.example', '//jahat.example', '/\\jahat.example', 'javascript:alert(1)', '', null, undefined]) {
  sama(`luar ditolak ${String(a)}`, alamatAman(a), '');
}

// tautanMasuk: '' = tidak ada tujuan (bukan "halaman sekarang")
globalThis.window = { location: { pathname: '/signup', search: '' } };
sama('kosong -> polos', tautanMasuk('/login', ''), '/login');
sama('tidak diberikan -> halaman sekarang (yang sah)', tautanMasuk('/login'), '/login');
globalThis.window = { location: { pathname: '/event/x/daftar', search: '?a=1' } };
sama('tidak diberikan di halaman lomba', tautanMasuk('/login'), '/login?return_to=%2Fevent%2Fx%2Fdaftar%3Fa%3D1');
sama('eksplisit sah', tautanMasuk('/login', '/belajar'), '/login?return_to=%2Fbelajar');
sama('eksplisit halaman masuk -> polos', tautanMasuk('/login', '/signup'), '/login');

// Baca & pakai setelah login
sama('baca return_to sah', bacaReturnTo('?return_to=%2Fbelajar'), '/belajar');
sama('baca return_to=/signup (alamat lama di riwayat)', bacaReturnTo('?return_to=%2Fsignup'), '');
globalThis.window = { location: { pathname: '/login', search: '?return_to=%2Fsignup' } };
sama('setelah login dari alamat lama -> beranda', tujuanSetelahMasuk('/beranda'), '/beranda');
globalThis.window = { location: { pathname: '/login', search: '?return_to=%2Fjadwal-kelas' } };
sama('setelah login dengan tujuan sah', tujuanSetelahMasuk('/beranda'), '/jadwal-kelas');

console.log(`${lulus} lulus, ${gagal} gagal.`);
process.exit(gagal ? 1 : 0);
