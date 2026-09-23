// Koneksi PocketBase KHUSUS web peminjaman.
//
// Admin peminjaman punya basis data akun sendiri (`rental_admins`), terpisah
// dari akun web PCV. Kalau keduanya memakai satu klien, mereka berbagi satu
// tempat penyimpanan token: admin yang masuk ke dashboard peminjaman akan
// menendang keluar sesi PCV-nya sendiri, dan sebaliknya. Dengan authStore
// sendiri (kunci localStorage "rental_admin_auth") keduanya bisa terbuka
// berdampingan di peramban yang sama - pola yang sama dipakai Web Olimp.
//
// Pemilik platform (super_admin PCV) juga masuk lewat klien INI kalau membuka
// dashboard peminjaman, supaya sesinya di sana terpisah dari sesinya di PCV.
import PocketBase, { LocalAuthStore } from 'pocketbase';

const pbr = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || '/',
  new LocalAuthStore('rental_admin_auth'),
);
pbr.autoCancellation(false);

export default pbr;
