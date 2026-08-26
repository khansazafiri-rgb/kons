// Koneksi PocketBase KHUSUS Web Olimp.
//
// Kenapa ada dua klien, bukan satu:
// peserta Web Olimp punya basis data akun sendiri (collection `olimp_users`),
// terpisah dari siswa web PCV (`users`). Kalau keduanya memakai satu klien,
// mereka juga berbagi satu tempat penyimpanan token - login di Olimp akan
// melempar keluar sesi PCV, dan sebaliknya.
//
// Dengan authStore sendiri (kunci localStorage "olimp_auth"), satu orang bisa
// membuka web PCV dan Web Olimp berdampingan di browser yang sama tanpa
// keduanya saling menendang. Alamat servernya tetap sama - yang dipisah hanya
// identitasnya.
import PocketBase, { LocalAuthStore } from 'pocketbase';

const pbo = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || '/',
  new LocalAuthStore('olimp_auth'),
);
pbo.autoCancellation(false);

export default pbo;
